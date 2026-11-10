#!/bin/bash

# ============================================================
# SHACK-SERVER Installer
#
# Installs or updates SHACK-SERVER on a Raspberry Pi / Debian:
#
#   - system packages, Node.js 22, pm2, Hamlib
#   - serial port permission (group dialout)
#   - code from GitHub (clone, later: git pull)
#   - npm install + build
#   - empty .env (port, optional keys) - station, transceiver and
#     QRZ.com are set up in the browser: http://<pi>/setup
#   - autostart with pm2
#   - optional: Caddy as HTTPS proxy in the home network
#     (+ optional public hostname behind Cloudflare)
#
# Run it as often as you like - it only changes what is missing.
#
# Fresh installation (as the normal user, NOT as root):
#
#   curl -fsSL https://raw.githubusercontent.com/cgraf63/SHACK-SERVER/main/scripts/install.sh | bash
#
# Update an existing installation:
#
#   bash ~/SHACK-SERVER/scripts/install.sh --update
#
# Options:
#   --update        update only: git pull, build, restart (no questions)
#   --dir DIR       installation directory (default: ~/SHACK-SERVER)
#   --repo URL      git repository URL
#   --branch NAME   git branch (default: main)
#   --no-caddy      do not install / configure Caddy
#   --yes           accept all defaults (no questions)
#   --dry-run       show what would be done, change nothing
# ============================================================

set -Eeuo pipefail

# ------------------------------------------------------------
# Defaults (can be set as environment variables as well)
# ------------------------------------------------------------

# Public repository (can be overridden with --repo or SHACK_REPO_URL).
DEFAULT_REPO_URL="${SHACK_REPO_URL:-https://github.com/cgraf63/SHACK-SERVER.git}"

INSTALL_DIR="${SHACK_DIR:-$HOME/SHACK-SERVER}"
REPO_URL="$DEFAULT_REPO_URL"
BRANCH="${SHACK_BRANCH:-main}"
APP_NAME="shack-server"
NODE_MAJOR=22

MODE="install"
WITH_CADDY="ask"
ASSUME_YES=0
DRY_RUN="${SHACK_DRY_RUN:-0}"

CADDYFILE="${SHACK_CADDYFILE:-/etc/caddy/Caddyfile}"
CADDY_MARKER="# SHACK-SERVER: managed by scripts/install.sh"

LOG_FILE="$HOME/shack-server-install.log"
NEEDS_RELOGIN=0
SUMMARY=()

# ------------------------------------------------------------
# Arguments
# ------------------------------------------------------------

while [ $# -gt 0 ]; do
    case "$1" in
        --update)   MODE="update"; WITH_CADDY="no"; ASSUME_YES=1 ;;
        --dir)      INSTALL_DIR="${2:?--dir needs a directory}"; shift ;;
        --repo)     REPO_URL="${2:?--repo needs a URL}"; shift ;;
        --branch)   BRANCH="${2:?--branch needs a name}"; shift ;;
        --no-caddy) WITH_CADDY="no" ;;
        --yes|-y)   ASSUME_YES=1 ;;
        --dry-run)  DRY_RUN=1 ;;
        -h|--help)
            sed -n '3,36p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "Unknown option: $1  (help: --help)"
            exit 1
            ;;
    esac
    shift
done


# ============================================================
# Output helpers
# ============================================================

if [ -t 1 ]; then
    C_OK=$'\e[32m'; C_WARN=$'\e[33m'; C_ERR=$'\e[31m'; C_HEAD=$'\e[36m'; C_OFF=$'\e[0m'
else
    C_OK=""; C_WARN=""; C_ERR=""; C_HEAD=""; C_OFF=""
fi

step()  { echo; echo "${C_HEAD}== $* ==${C_OFF}"; }
ok()    { echo "${C_OK}  ✔ $*${C_OFF}"; }
warn()  { echo "${C_WARN}  ! $*${C_OFF}"; }
info()  { echo "    $*"; }
fail()  { echo; echo "${C_ERR}ERROR: $*${C_OFF}"; echo "Details in the log: $LOG_FILE"; exit 1; }

trap 'fail "Aborted in line $LINENO (command: $BASH_COMMAND)"' ERR

# Run a command (or only show it in --dry-run).
run() {
    if [ "$DRY_RUN" = "1" ]; then
        echo "    [dry-run] $*"
        return 0
    fi
    "$@" >>"$LOG_FILE" 2>&1
}

# Same with sudo.
srun() {
    if [ "$DRY_RUN" = "1" ]; then
        echo "    [dry-run] sudo $*"
        return 0
    fi
    # The log belongs to the user - the redirect is meant to run without sudo.
    # shellcheck disable=SC2024
    sudo "$@" >>"$LOG_FILE" 2>&1
}

# Questions also work when the script is piped into bash (curl | bash).
TTY=""
if [ -r /dev/tty ] && (exec </dev/tty) 2>/dev/null; then
    TTY="/dev/tty"
fi

# ask_yes_no "Question" default(j|n)
ask_yes_no() {
    local question="$1" default="$2" answer hint

    if [ "$ASSUME_YES" = "1" ] || [ -z "$TTY" ]; then
        [ "$default" = "j" ]
        return
    fi

    if [ "$default" = "j" ]; then hint="[Y/n]"; else hint="[y/N]"; fi

    read -r -p "  $question $hint " answer <"$TTY" || answer=""
    answer="${answer:-$default}"

    case "$answer" in
        j|J|y|Y|ja|Ja|yes) return 0 ;;
        *) return 1 ;;
    esac
}

# ask_value "Question" default -> echoes the answer
ask_value() {
    local question="$1" default="$2" answer

    if [ "$ASSUME_YES" = "1" ] || [ -z "$TTY" ]; then
        echo "$default"
        return
    fi

    read -r -p "  $question [$default]: " answer <"$TTY" || answer=""
    echo "${answer:-$default}"
}


# ============================================================
# 1. Checks
# ============================================================

check_system() {

    step "1. Check the system"

    : >"$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/shack-server-install.log"
    info "Log: $LOG_FILE"

    if [ "$(id -u)" = "0" ]; then
        fail "Please do NOT run this as root or with sudo, but as the normal user.
       The script asks for the sudo password itself where needed."
    fi

    if [ ! -r /etc/os-release ]; then
        fail "Unknown operating system (no /etc/os-release)."
    fi

    # shellcheck disable=SC1091
    . /etc/os-release

    case " ${ID:-} ${ID_LIKE:-} " in
        *" debian "*|*" raspbian "*|*" ubuntu "*) ok "Operating system: ${PRETTY_NAME:-$ID}" ;;
        *) fail "Only Debian, Raspberry Pi OS and Ubuntu are supported (found: ${PRETTY_NAME:-unknown})." ;;
    esac

    local arch
    arch="$(uname -m)"
    case "$arch" in
        aarch64|x86_64) ok "Architecture: $arch" ;;
        armv7l|armv6l)
            fail "32-bit system ($arch). Please install a 64-bit Raspberry Pi OS -
       Node.js $NODE_MAJOR is not available for 32 bit."
            ;;
        *) warn "Untested architecture: $arch" ;;
    esac

    local mem_mb
    mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
    if [ "$mem_mb" -lt 900 ]; then
        warn "Only ${mem_mb} MB RAM - the build can take very long."
    else
        ok "Memory: ${mem_mb} MB"
    fi

    if ! command -v sudo >/dev/null 2>&1; then
        fail "sudo is not installed."
    fi

    # An update (also from the update button in the settings) needs no sudo.
    if [ "$DRY_RUN" != "1" ] && [ "$MODE" != "update" ]; then
        info "Checking sudo rights (enter your password if asked) ..."
        sudo -v || fail "No sudo rights."
    fi

    if curl -fsS --max-time 10 -o /dev/null https://github.com 2>/dev/null; then
        ok "Internet: reachable"
    elif [ "$DRY_RUN" = "1" ]; then
        warn "github.com not reachable (dry-run: ignored)"
    else
        fail "github.com is not reachable. Please check the network."
    fi

}


# ============================================================
# 2. Packages
# ============================================================

install_packages() {

    step "2. System packages"

    info "Updating the package lists ..."
    srun apt-get update

    # avahi-daemon: <hostname>.local in the home network
    # libhamlib-utils: rigctld / rotctld (Hamlib transceivers, rotator)
    # alsa-utils: arecord / aplay (remote audio)
    # rclone: backup to Dropbox / NAS
    # sqlite3: restore / inspect the log by hand
    local packages=(git curl ca-certificates gnupg build-essential
                    libhamlib-utils avahi-daemon alsa-utils rclone sqlite3)

    info "Installing: ${packages[*]}"
    srun env DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
    ok "System packages installed"

}

install_node() {

    step "3. Node.js $NODE_MAJOR"

    local current=""
    if command -v node >/dev/null 2>&1; then
        current="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')"
    fi

    if [ -n "$current" ] && [ "$current" -ge "$NODE_MAJOR" ]; then
        ok "Node.js $(node -v) is already installed"
    else
        info "Node.js ${current:-missing} - installing version $NODE_MAJOR (NodeSource) ..."
        if [ "$DRY_RUN" = "1" ]; then
            echo "    [dry-run] curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | sudo -E bash -"
        else
            # shellcheck disable=SC2024
            curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - >>"$LOG_FILE" 2>&1
        fi
        srun apt-get install -y nodejs
        ok "Node.js installed"
    fi

    if command -v pm2 >/dev/null 2>&1; then
        ok "pm2 is already installed"
    else
        info "Installing pm2 ..."
        srun npm install -g pm2
        ok "pm2 installed"
    fi

}

setup_serial_permission() {

    step "4. Access to the serial ports (transceivers)"

    if id -nG "$USER" | tr ' ' '\n' | grep -qx dialout; then
        ok "User $USER is already in the group dialout"
    else
        srun usermod -aG dialout "$USER"
        NEEDS_RELOGIN=1
        ok "User $USER added to the group dialout (active after a reboot)"
    fi

}


# ============================================================
# 3. Code
# ============================================================

detect_repo_url() {

    if [ -n "$REPO_URL" ]; then
        return
    fi

    # Script runs from inside an existing clone?
    local script_dir=""
    if script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"; then
        :
    else
        script_dir=""
    fi

    for dir in "$INSTALL_DIR" "${script_dir%/scripts}"; do
        if [ -n "$dir" ] && [ -d "$dir/.git" ]; then
            REPO_URL="$(git -C "$dir" remote get-url origin 2>/dev/null || true)"
            [ -n "$REPO_URL" ] && return
        fi
    done

}

get_code() {

    step "5. SHACK-SERVER code"

    if [ -d "$INSTALL_DIR/.git" ]; then

        info "Existing installation: $INSTALL_DIR"

        # data/ (settings, transceivers, log) changes while SHACK-SERVER runs:
        # not a "local change" of the code.
        if [ -n "$(git -C "$INSTALL_DIR" status --porcelain --untracked-files=no -- . ':(exclude)data' 2>/dev/null)" ]; then
            warn "There are local changes to versioned files:"
            git -C "$INSTALL_DIR" status --short --untracked-files=no -- . ':(exclude)data' | sed 's/^/      /'
            if ask_yes_no "Update anyway? (local changes are saved with git stash)" "n"; then
                run git -C "$INSTALL_DIR" stash push -m "install.sh $(date +%Y%m%d-%H%M%S)"
                ok "Local changes saved (git stash list)"
            else
                warn "Code is NOT updated - continuing with the existing version"
                return
            fi
        fi

        info "Getting updates (git pull) ..."
        run git -C "$INSTALL_DIR" pull --ff-only
        ok "Code is up to date ($(git -C "$INSTALL_DIR" log -1 --format='%h %cd' --date=short 2>/dev/null || echo '?'))"
        return

    fi

    if [ -e "$INSTALL_DIR" ] && [ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
        fail "$INSTALL_DIR exists, but is not a git clone.
       Please rename / move it or choose another directory with --dir."
    fi

    if [ -z "$REPO_URL" ]; then
        if [ -n "$TTY" ] && [ "$ASSUME_YES" != "1" ]; then
            REPO_URL="$(ask_value "GitHub address of the SHACK-SERVER repository" "")"
        fi
        [ -n "$REPO_URL" ] || fail "No repository address. Please give it with --repo <URL>."
    fi

    info "Cloning $REPO_URL ($BRANCH) to $INSTALL_DIR ..."
    run git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    ok "Code downloaded"

}

build_app() {

    step "6. Dependencies and build"

    if [ "$DRY_RUN" != "1" ]; then
        cd "$INSTALL_DIR"
    fi

    info "npm install (a few minutes the first time) ..."
    if [ -f "$INSTALL_DIR/package-lock.json" ]; then
        run npm ci --no-audit --no-fund || run npm install --no-audit --no-fund
    else
        run npm install --no-audit --no-fund
    fi
    ok "Dependencies installed"

    info "Build (npm run build) ..."
    if ! run npm run build; then
        if grep -qi "heap out of memory" "$LOG_FILE" 2>/dev/null; then
            fail "Not enough memory for the build. Increase the swap or use a Pi with more RAM."
        fi
        fail "Build failed."
    fi
    ok "Build successful"

}


# ============================================================
# 4. Configuration and autostart
# ============================================================

run_setup_assistant() {

    step "7. Basic configuration"

    # .env holds only optional values (PORT, keys) - no questions here.
    if [ ! -f "$INSTALL_DIR/.env" ] && [ "$DRY_RUN" != "1" ]; then
        touch "$INSTALL_DIR/.env"
        chmod 600 "$INSTALL_DIR/.env"
        ok ".env created (empty - defaults are used)"
    else
        ok ".env unchanged"
    fi

    if [ "$MODE" != "update" ]; then
        info "Station, transceiver and QRZ.com: setup assistant in the browser (see below)"
    fi

}

app_port() {

    local port=""
    if [ -f "$INSTALL_DIR/.env" ]; then
        port="$(grep -E '^PORT=' "$INSTALL_DIR/.env" | tail -n 1 | cut -d= -f2- | tr -d '"[:space:]')"
    fi
    echo "${port:-3000}"

}

setup_pm2() {

    step "8. Autostart with pm2"

    if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
        info "Restarting $APP_NAME ..."
        run pm2 restart "$APP_NAME" --update-env
        ok "$APP_NAME restarted"
    else
        info "Starting $APP_NAME ..."
        run pm2 start "$INSTALL_DIR/dist/index.js" --name "$APP_NAME" --cwd "$INSTALL_DIR"
        ok "$APP_NAME started"
    fi

    run pm2 save

    # Autostart after reboot (systemd unit for this user)
    if systemctl list-unit-files 2>/dev/null | grep -q "^pm2-$USER.service"; then
        ok "pm2 autostart is already set up"
    elif [ "$MODE" = "update" ]; then
        warn "pm2 autostart is not set up - run the installer once without --update"
    else
        info "Setting up the autostart after a reboot ..."
        srun env PATH="$PATH" "$(command -v pm2 || echo pm2)" startup systemd -u "$USER" --hp "$HOME"
        run pm2 save
        ok "Autostart set up"
    fi

    if [ "$DRY_RUN" != "1" ]; then
        local port
        port="$(app_port)"
        local _
        for _ in 1 2 3 4 5 6 7 8 9 10; do
            if curl -fsS --max-time 2 -o /dev/null "http://127.0.0.1:$port/"; then
                ok "SHACK-SERVER answers on port $port"
                return
            fi
            sleep 2
        done
        warn "SHACK-SERVER does not answer on port $port. Logs: pm2 logs $APP_NAME"
    fi

}


# ============================================================
# 5. Caddy (HTTPS in the home network)
# ============================================================

install_caddy_package() {

    if command -v caddy >/dev/null 2>&1; then
        ok "Caddy is already installed ($(caddy version 2>/dev/null | awk '{print $1}'))"
        return
    fi

    info "Installing Caddy (official package source) ..."
    srun apt-get install -y debian-keyring debian-archive-keyring apt-transport-https

    if [ "$DRY_RUN" = "1" ]; then
        echo "    [dry-run] set up the Caddy package source from dl.cloudsmith.io"
    else
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
            | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
            | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
        sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
        sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
    fi

    srun apt-get update
    srun apt-get install -y caddy
    ok "Caddy installed"

}

# The Caddyfile may be readable for root only: never treat
# "not readable" as "not there" (that would overwrite it).
caddyfile_cat() {

    if [ -r "$CADDYFILE" ]; then
        cat "$CADDYFILE"
    else
        sudo cat "$CADDYFILE" 2>/dev/null || true
    fi

}

caddyfile_exists() {

    [ -s "$CADDYFILE" ] || sudo test -s "$CADDYFILE" 2>/dev/null

}

caddyfile_is_ours() {

    caddyfile_cat 2>/dev/null | grep -qF "$CADDY_MARKER"

}

# Public hostname from a Caddyfile we generated earlier ("" if none).
existing_public_host() {

    if ! caddyfile_is_ours; then
        return 0
    fi
    caddyfile_cat | sed -n 's#^http://\([^ {]*\) {.*#\1#p' | head -n 1

}

# generate_caddyfile <port> <lan sites> [public host]
generate_caddyfile() {

    local port="$1" sites="$2" public="${3:-}"

    cat <<EOF
$CADDY_MARKER
# Generated $(date '+%Y-%m-%d %H:%M'). Re-running the installer regenerates
# this file. To maintain it by hand, delete the first line (marker).

# Home network: HTTPS with Caddy's own certificate authority
# ("tls internal"). Browsers warn until the Caddy root certificate is
# trusted on the device - see the installer summary.
$sites {
	tls internal

	# SHACK-SERVER incl. WebSockets (remote audio)
	reverse_proxy 127.0.0.1:$port
}
EOF

    if [ -n "$public" ]; then
        cat <<EOF

# Public access through Cloudflare (Tunnel / proxy). Cloudflare provides
# HTTPS and the login (Cloudflare Access) - keep that policy active,
# SHACK-SERVER itself has no login and can key the transmitter.
http://$public {
	reverse_proxy 127.0.0.1:$port
}
EOF
    fi

}

setup_caddy() {

    if [ "$WITH_CADDY" = "no" ]; then
        return
    fi

    step "9. HTTPS in the home network (Caddy)"

    info "Caddy provides SHACK-SERVER via HTTPS. Needed for the remote microphone"
    info "and USB control panels in the browser (WebHID)."

    if [ "$WITH_CADDY" = "ask" ] && ! ask_yes_no "Set up Caddy?" "j"; then
        info "Caddy skipped"
        return
    fi

    install_caddy_package

    local port ip host sites
    port="$(app_port)"
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    host="$(hostname 2>/dev/null || echo raspberrypi)"
    host="${host,,}"

    sites="https://${host}.local"
    if [ -n "$ip" ]; then
        sites="https://${ip}, ${sites}"
    fi

    # Never overwrite a configuration we did not create without asking.
    if caddyfile_exists && ! caddyfile_is_ours; then
        warn "There is already a Caddy configuration of your own ($CADDYFILE):"
        caddyfile_cat | sed 's/^/      /' | head -30
        if ! ask_yes_no "Replace it with the SHACK-SERVER configuration? (a backup is made)" "n"; then
            local snippet="$INSTALL_DIR/Caddyfile.shack-server"
            if [ "$DRY_RUN" != "1" ]; then
                generate_caddyfile "$port" "$sites" >"$snippet"
            fi
            warn "Caddy configuration not changed. Suggestion saved in:"
            info "$snippet"
            SUMMARY+=("Caddy: own configuration kept - suggestion: $snippet")
            return
        fi
    fi

    # Optional public hostname behind Cloudflare (kept on re-runs)
    local public old_public
    old_public="$(existing_public_host || true)"

    info "Public access (optional): host name that Cloudflare forwards to this Pi,"
    info "e.g. dashboard.example.com. \"-\" = home network only."
    info "The login is then done by Cloudflare (Access) - SHACK-SERVER has none."
    public="$(ask_value "Public host name" "${old_public:--}")"
    if [ "$public" = "-" ]; then
        public=""
    fi
    public="${public#http://}"
    public="${public#https://}"
    public="${public%%/*}"

    if [ -n "$public" ] && ! [[ "$public" =~ ^[A-Za-z0-9.-]+$ ]]; then
        fail "Invalid host name: $public"
    fi

    local tmp
    tmp="$(mktemp)"
    generate_caddyfile "$port" "$sites" "$public" >"$tmp"

    if [ "$DRY_RUN" = "1" ]; then
        echo "    [dry-run] would write $CADDYFILE:"
        sed 's/^/      | /' "$tmp"
        rm -f "$tmp"
        return
    fi

    if ! caddy validate --adapter caddyfile --config "$tmp" >>"$LOG_FILE" 2>&1; then
        rm -f "$tmp"
        fail "The generated Caddy configuration is invalid (see the log)."
    fi

    if caddyfile_exists; then
        local backup
        backup="$CADDYFILE.backup-$(date +%Y%m%d-%H%M%S)"
        sudo cp "$CADDYFILE" "$backup"
        info "Backup: $backup"
    fi

    sudo install -m 644 "$tmp" "$CADDYFILE"
    rm -f "$tmp"

    srun systemctl enable caddy
    if systemctl is-active --quiet caddy; then
        srun systemctl reload caddy
    else
        srun systemctl restart caddy
    fi
    ok "Caddy set up: $sites${public:+, http://$public}"

    SUMMARY+=("HTTPS in the home network: $sites")
    if [ -n "$public" ]; then
        SUMMARY+=("Public through Cloudflare: https://$public (keep Cloudflare Access active!)")
    fi
    SUMMARY+=("To avoid the certificate warning in the browser, install the Caddy root certificate")
    SUMMARY+=("  /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt")
    SUMMARY+=("  as trusted on your devices (PC, tablet, phone).")
    if [ -n "$ip" ]; then
        SUMMARY+=("Tip: give the Pi a fixed IP address in the router ($ip), otherwise")
        SUMMARY+=("  the certificate no longer fits after an IP change (then run the installer again).")
    fi

}


# ============================================================
# Summary
# ============================================================

summary() {

    local port ip host
    port="$(app_port)"
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    host="$(hostname 2>/dev/null || echo raspberrypi)"

    echo
    echo "${C_OK}============================================================${C_OFF}"
    if [ "$MODE" = "update" ]; then
        echo "${C_OK}  SHACK-SERVER is updated${C_OFF}"
    else
        echo "${C_OK}  SHACK-SERVER is installed${C_OFF}"
    fi
    echo "${C_OK}============================================================${C_OFF}"
    echo
    local page="/"
    [ "$MODE" = "update" ] || page="/setup"

    if [ "$MODE" = "update" ]; then
        echo "  Open in the browser:"
    else
        echo "  Open the setup assistant in the browser:"
    fi
    if command -v caddy >/dev/null 2>&1 && caddyfile_is_ours; then
        [ -n "$ip" ] && echo "    https://$ip$page"
        echo "    https://${host,,}.local$page"
    else
        [ -n "$ip" ] && echo "    http://$ip:$port$page"
        echo "    http://${host,,}.local:$port$page"
    fi
    if [ "$MODE" != "update" ]; then
        echo
        echo "  Four short steps: station, transceiver, QRZ.com - done."
        echo "  Everything else (uploads, LoTW, backup, ...) later in Settings."
    fi

    local line
    if [ ${#SUMMARY[@]} -gt 0 ]; then
        echo
        for line in "${SUMMARY[@]}"; do
            echo "  $line"
        done
    fi

    if [ "$NEEDS_RELOGIN" = "1" ]; then
        echo
        echo "${C_WARN}  IMPORTANT: please reboot the Raspberry now (sudo reboot),${C_OFF}"
        echo "${C_WARN}  so that the access to the transceiver ports becomes active.${C_OFF}"
    fi

    echo
    echo "  Update later:          bash $INSTALL_DIR/scripts/install.sh --update"
    echo "  Show the logs:         pm2 logs $APP_NAME"
    echo "  Installation log:      $LOG_FILE"
    echo

}


# ============================================================
# Main
# ============================================================

main() {

    echo
    echo "============================================================"
    if [ "$MODE" = "update" ]; then
        echo "              SHACK-SERVER Update"
    else
        echo "              SHACK-SERVER Installation"
    fi
    [ "$DRY_RUN" = "1" ] && echo "              (dry-run: nothing is changed)"
    echo "============================================================"

    check_system
    detect_repo_url

    if [ "$MODE" = "install" ]; then
        install_packages
        install_node
        setup_serial_permission
    fi

    get_code
    build_app
    run_setup_assistant
    setup_pm2
    setup_caddy
    summary

}

# Only run when executed (not when sourced by tests).
if [ "${BASH_SOURCE[0]:-$0}" = "$0" ] || [ -z "${BASH_SOURCE[0]:-}" ]; then
    main
fi
