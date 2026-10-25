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
#   - .env via scripts/shack-server-setup (first install)
#   - autostart with pm2
#   - optional: Caddy as HTTPS proxy in the home network
#     (+ optional public hostname behind Cloudflare)
#
# Run it as often as you like - it only changes what is missing.
#
# Fresh installation (as the normal user, NOT as root):
#
#   curl -fsSL https://raw.githubusercontent.com/<OWNER>/<REPO>/main/scripts/install.sh | bash
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

# Set this to the public repository URL before publishing.
DEFAULT_REPO_URL="${SHACK_REPO_URL:-}"

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
            echo "Unbekannte Option: $1  (Hilfe: --help)"
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
fail()  { echo; echo "${C_ERR}FEHLER: $*${C_OFF}"; echo "Details im Log: $LOG_FILE"; exit 1; }

trap 'fail "Abbruch in Zeile $LINENO (Befehl: $BASH_COMMAND)"' ERR

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

    if [ "$default" = "j" ]; then hint="[J/n]"; else hint="[j/N]"; fi

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

    step "1. System prüfen"

    : >"$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/shack-server-install.log"
    info "Log: $LOG_FILE"

    if [ "$(id -u)" = "0" ]; then
        fail "Bitte NICHT als root bzw. mit sudo starten, sondern als normaler Benutzer.
       Das Script fragt selbst nach dem sudo-Passwort, wo es nötig ist."
    fi

    if [ ! -r /etc/os-release ]; then
        fail "Unbekanntes Betriebssystem (keine /etc/os-release)."
    fi

    # shellcheck disable=SC1091
    . /etc/os-release

    case " ${ID:-} ${ID_LIKE:-} " in
        *" debian "*|*" raspbian "*|*" ubuntu "*) ok "Betriebssystem: ${PRETTY_NAME:-$ID}" ;;
        *) fail "Nur Debian, Raspberry Pi OS und Ubuntu werden unterstützt (gefunden: ${PRETTY_NAME:-unbekannt})." ;;
    esac

    local arch
    arch="$(uname -m)"
    case "$arch" in
        aarch64|x86_64) ok "Architektur: $arch" ;;
        armv7l|armv6l)
            fail "32-Bit-System ($arch). Bitte ein 64-Bit Raspberry Pi OS installieren -
       Node.js $NODE_MAJOR gibt es dafür nicht mehr."
            ;;
        *) warn "Ungetestete Architektur: $arch" ;;
    esac

    local mem_mb
    mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
    if [ "$mem_mb" -lt 900 ]; then
        warn "Nur ${mem_mb} MB RAM - der Build kann sehr lange dauern."
    else
        ok "Arbeitsspeicher: ${mem_mb} MB"
    fi

    if ! command -v sudo >/dev/null 2>&1; then
        fail "sudo ist nicht installiert."
    fi

    if [ "$DRY_RUN" != "1" ]; then
        info "sudo-Rechte werden geprüft (evtl. Passwort eingeben) ..."
        sudo -v || fail "Keine sudo-Rechte."
    fi

    if curl -fsS --max-time 10 -o /dev/null https://github.com 2>/dev/null; then
        ok "Internet: erreichbar"
    elif [ "$DRY_RUN" = "1" ]; then
        warn "github.com nicht erreichbar (dry-run: wird ignoriert)"
    else
        fail "github.com ist nicht erreichbar. Bitte Netzwerk prüfen."
    fi

}


# ============================================================
# 2. Packages
# ============================================================

install_packages() {

    step "2. Systempakete"

    info "Paketlisten aktualisieren ..."
    srun apt-get update

    # avahi-daemon: <hostname>.local im Heimnetz
    # libhamlib-utils: rigctl / rigctld für den Hamlib-Treiber
    local packages=(git curl ca-certificates gnupg build-essential
                    libhamlib-utils avahi-daemon)

    info "Installiere: ${packages[*]}"
    srun env DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
    ok "Systempakete installiert"

}

install_node() {

    step "3. Node.js $NODE_MAJOR"

    local current=""
    if command -v node >/dev/null 2>&1; then
        current="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')"
    fi

    if [ -n "$current" ] && [ "$current" -ge "$NODE_MAJOR" ]; then
        ok "Node.js $(node -v) ist bereits installiert"
    else
        info "Node.js ${current:-fehlt} - installiere Version $NODE_MAJOR (NodeSource) ..."
        if [ "$DRY_RUN" = "1" ]; then
            echo "    [dry-run] curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | sudo -E bash -"
        else
            # shellcheck disable=SC2024
            curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - >>"$LOG_FILE" 2>&1
        fi
        srun apt-get install -y nodejs
        ok "Node.js installiert"
    fi

    if command -v pm2 >/dev/null 2>&1; then
        ok "pm2 ist bereits installiert"
    else
        info "Installiere pm2 ..."
        srun npm install -g pm2
        ok "pm2 installiert"
    fi

}

setup_serial_permission() {

    step "4. Zugriff auf serielle Schnittstellen (Transceiver)"

    if id -nG "$USER" | tr ' ' '\n' | grep -qx dialout; then
        ok "Benutzer $USER ist bereits in der Gruppe dialout"
    else
        srun usermod -aG dialout "$USER"
        NEEDS_RELOGIN=1
        ok "Benutzer $USER zur Gruppe dialout hinzugefügt (wirksam nach Neustart)"
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

    step "5. SHACK-SERVER Code"

    if [ -d "$INSTALL_DIR/.git" ]; then

        info "Vorhandene Installation: $INSTALL_DIR"

        if [ -n "$(git -C "$INSTALL_DIR" status --porcelain --untracked-files=no 2>/dev/null)" ]; then
            warn "Es gibt lokale Änderungen an versionierten Dateien:"
            git -C "$INSTALL_DIR" status --short --untracked-files=no | sed 's/^/      /'
            if ask_yes_no "Trotzdem aktualisieren? (lokale Änderungen werden mit git stash gesichert)" "n"; then
                run git -C "$INSTALL_DIR" stash push -m "install.sh $(date +%Y%m%d-%H%M%S)"
                ok "Lokale Änderungen gesichert (git stash list)"
            else
                warn "Code wird NICHT aktualisiert - es wird mit dem vorhandenen Stand weitergemacht"
                return
            fi
        fi

        info "Hole Aktualisierungen (git pull) ..."
        run git -C "$INSTALL_DIR" pull --ff-only
        ok "Code ist aktuell ($(git -C "$INSTALL_DIR" log -1 --format='%h %cd' --date=short 2>/dev/null || echo '?'))"
        return

    fi

    if [ -e "$INSTALL_DIR" ] && [ -n "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
        fail "$INSTALL_DIR existiert, ist aber kein git-Klon.
       Bitte umbenennen/verschieben oder mit --dir ein anderes Verzeichnis wählen."
    fi

    if [ -z "$REPO_URL" ]; then
        if [ -n "$TTY" ] && [ "$ASSUME_YES" != "1" ]; then
            REPO_URL="$(ask_value "GitHub-Adresse des SHACK-SERVER Repositorys" "")"
        fi
        [ -n "$REPO_URL" ] || fail "Keine Repository-Adresse. Bitte mit --repo <URL> angeben."
    fi

    info "Klone $REPO_URL ($BRANCH) nach $INSTALL_DIR ..."
    run git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    ok "Code heruntergeladen"

}

build_app() {

    step "6. Abhängigkeiten und Build"

    if [ "$DRY_RUN" != "1" ]; then
        cd "$INSTALL_DIR"
    fi

    info "npm install (beim ersten Mal einige Minuten) ..."
    if [ -f "$INSTALL_DIR/package-lock.json" ]; then
        run npm ci --no-audit --no-fund || run npm install --no-audit --no-fund
    else
        run npm install --no-audit --no-fund
    fi
    ok "Abhängigkeiten installiert"

    info "Build (npm run build) ..."
    if ! run npm run build; then
        if grep -qi "heap out of memory" "$LOG_FILE" 2>/dev/null; then
            fail "Zu wenig Arbeitsspeicher für den Build. Swap vergrössern oder Pi mit mehr RAM verwenden."
        fi
        fail "Build fehlgeschlagen."
    fi
    ok "Build erfolgreich"

}


# ============================================================
# 4. Configuration and autostart
# ============================================================

run_setup_assistant() {

    step "7. Grundkonfiguration (.env)"

    if [ -f "$INSTALL_DIR/.env" ] && [ "$MODE" = "update" ]; then
        ok ".env vorhanden - unverändert"
        return
    fi

    if [ -f "$INSTALL_DIR/.env" ] && ! ask_yes_no ".env ist vorhanden. Setup-Assistent trotzdem starten?" "n"; then
        ok ".env vorhanden - unverändert"
        return
    fi

    if [ -z "$TTY" ] || [ "$DRY_RUN" = "1" ]; then
        warn "Setup-Assistent übersprungen. Später starten mit:"
        info "bash $INSTALL_DIR/scripts/shack-server-setup"
        return
    fi

    bash "$INSTALL_DIR/scripts/shack-server-setup" <"$TTY"

}

app_port() {

    local port=""
    if [ -f "$INSTALL_DIR/.env" ]; then
        port="$(grep -E '^PORT=' "$INSTALL_DIR/.env" | tail -n 1 | cut -d= -f2- | tr -d '"[:space:]')"
    fi
    echo "${port:-3000}"

}

setup_pm2() {

    step "8. Autostart mit pm2"

    if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
        info "Starte $APP_NAME neu ..."
        run pm2 restart "$APP_NAME" --update-env
        ok "$APP_NAME neu gestartet"
    else
        info "Starte $APP_NAME ..."
        run pm2 start "$INSTALL_DIR/dist/index.js" --name "$APP_NAME" --cwd "$INSTALL_DIR"
        ok "$APP_NAME gestartet"
    fi

    run pm2 save

    # Autostart after reboot (systemd unit for this user)
    if systemctl list-unit-files 2>/dev/null | grep -q "^pm2-$USER.service"; then
        ok "pm2-Autostart ist bereits eingerichtet"
    else
        info "Richte Autostart nach Neustart ein ..."
        srun env PATH="$PATH" "$(command -v pm2 || echo pm2)" startup systemd -u "$USER" --hp "$HOME"
        run pm2 save
        ok "Autostart eingerichtet"
    fi

    if [ "$DRY_RUN" != "1" ]; then
        local port
        port="$(app_port)"
        local _
        for _ in 1 2 3 4 5 6 7 8 9 10; do
            if curl -fsS --max-time 2 -o /dev/null "http://127.0.0.1:$port/"; then
                ok "SHACK-SERVER antwortet auf Port $port"
                return
            fi
            sleep 2
        done
        warn "SHACK-SERVER antwortet nicht auf Port $port. Logs: pm2 logs $APP_NAME"
    fi

}


# ============================================================
# 5. Caddy (HTTPS in the home network)
# ============================================================

install_caddy_package() {

    if command -v caddy >/dev/null 2>&1; then
        ok "Caddy ist bereits installiert ($(caddy version 2>/dev/null | awk '{print $1}'))"
        return
    fi

    info "Installiere Caddy (offizielle Paketquelle) ..."
    srun apt-get install -y debian-keyring debian-archive-keyring apt-transport-https

    if [ "$DRY_RUN" = "1" ]; then
        echo "    [dry-run] Caddy-Paketquelle von dl.cloudsmith.io einrichten"
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
    ok "Caddy installiert"

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

    step "9. HTTPS im Heimnetz (Caddy)"

    info "Caddy stellt SHACK-SERVER per HTTPS bereit. Nötig für Remote-Mikrofon"
    info "und USB-Bedienteile im Browser (WebHID)."

    if [ "$WITH_CADDY" = "ask" ] && ! ask_yes_no "Caddy einrichten?" "j"; then
        info "Caddy übersprungen"
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
        warn "Es gibt bereits eine eigene Caddy-Konfiguration ($CADDYFILE):"
        caddyfile_cat | sed 's/^/      /' | head -30
        if ! ask_yes_no "Durch die SHACK-SERVER-Konfiguration ersetzen? (Backup wird angelegt)" "n"; then
            local snippet="$INSTALL_DIR/Caddyfile.shack-server"
            if [ "$DRY_RUN" != "1" ]; then
                generate_caddyfile "$port" "$sites" >"$snippet"
            fi
            warn "Caddy-Konfiguration nicht verändert. Vorschlag gespeichert in:"
            info "$snippet"
            SUMMARY+=("Caddy: eigene Konfiguration beibehalten - Vorschlag: $snippet")
            return
        fi
    fi

    # Optional public hostname behind Cloudflare (kept on re-runs)
    local public old_public
    old_public="$(existing_public_host || true)"

    info "Öffentlicher Zugang (optional): Hostname, den Cloudflare an diesen Pi"
    info "weiterleitet, z.B. dashboard.example.com. \"-\" = nur Heimnetz."
    info "Die Anmeldung übernimmt dann Cloudflare (Access) - SHACK-SERVER hat keine."
    public="$(ask_value "Öffentlicher Hostname" "${old_public:--}")"
    if [ "$public" = "-" ]; then
        public=""
    fi
    public="${public#http://}"
    public="${public#https://}"
    public="${public%%/*}"

    if [ -n "$public" ] && ! [[ "$public" =~ ^[A-Za-z0-9.-]+$ ]]; then
        fail "Ungültiger Hostname: $public"
    fi

    local tmp
    tmp="$(mktemp)"
    generate_caddyfile "$port" "$sites" "$public" >"$tmp"

    if [ "$DRY_RUN" = "1" ]; then
        echo "    [dry-run] würde $CADDYFILE schreiben:"
        sed 's/^/      | /' "$tmp"
        rm -f "$tmp"
        return
    fi

    if ! caddy validate --adapter caddyfile --config "$tmp" >>"$LOG_FILE" 2>&1; then
        rm -f "$tmp"
        fail "Die erzeugte Caddy-Konfiguration ist ungültig (siehe Log)."
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
    ok "Caddy eingerichtet: $sites${public:+, http://$public}"

    SUMMARY+=("HTTPS im Heimnetz: $sites")
    if [ -n "$public" ]; then
        SUMMARY+=("Öffentlich über Cloudflare: https://$public (Cloudflare Access aktiv lassen!)")
    fi
    SUMMARY+=("Zertifikatswarnung im Browser vermeiden: das Caddy-Stammzertifikat")
    SUMMARY+=("  /var/lib/caddy/.local/share/caddy/pki/authorities/local/root.crt")
    SUMMARY+=("  auf den Geräten (PC, Tablet, Handy) als vertrauenswürdig installieren.")
    if [ -n "$ip" ]; then
        SUMMARY+=("Tipp: Im Router eine feste IP für den Pi vergeben ($ip), sonst passt")
        SUMMARY+=("  das Zertifikat nach einem IP-Wechsel nicht mehr (dann Installer erneut starten).")
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
        echo "${C_OK}  SHACK-SERVER ist aktualisiert${C_OFF}"
    else
        echo "${C_OK}  SHACK-SERVER ist installiert${C_OFF}"
    fi
    echo "${C_OK}============================================================${C_OFF}"
    echo
    echo "  Im Browser öffnen:"
    if command -v caddy >/dev/null 2>&1 && caddyfile_is_ours; then
        [ -n "$ip" ] && echo "    https://$ip"
        echo "    https://${host,,}.local"
    else
        [ -n "$ip" ] && echo "    http://$ip:$port"
        echo "    http://${host,,}.local:$port"
    fi
    echo
    echo "  Danach: Settings → Station und Transceivers einrichten."

    local line
    if [ ${#SUMMARY[@]} -gt 0 ]; then
        echo
        for line in "${SUMMARY[@]}"; do
            echo "  $line"
        done
    fi

    if [ "$NEEDS_RELOGIN" = "1" ]; then
        echo
        echo "${C_WARN}  WICHTIG: Bitte den Raspberry jetzt neu starten (sudo reboot),${C_OFF}"
        echo "${C_WARN}  damit der Zugriff auf die Transceiver-Schnittstellen aktiv wird.${C_OFF}"
    fi

    echo
    echo "  Später aktualisieren:  bash $INSTALL_DIR/scripts/install.sh --update"
    echo "  Logs anzeigen:         pm2 logs $APP_NAME"
    echo "  Installationslog:      $LOG_FILE"
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
    [ "$DRY_RUN" = "1" ] && echo "              (dry-run: es wird nichts verändert)"
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
