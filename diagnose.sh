#!/bin/bash
#
# SHACK-SERVER Diagnose
# Prueft: System, USB/Serial, CAT, PM2, API, Datenbank
# Aufruf:  ./diagnose.sh          (alles)
#          ./diagnose.sh --quiet  (nur Probleme)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
QUIET=0
[ "$1" = "--quiet" ] && QUIET=1

issues=0

ok()   { [ $QUIET -eq 0 ] && echo -e "  ${GREEN}OK${NC}   $1"; }
warn() { echo -e "  ${YELLOW}WARN${NC} $1"; issues=$((issues+1)); }
fail() { echo -e "  ${RED}FAIL${NC} $1"; issues=$((issues+1)); }

section() {
    [ $QUIET -eq 0 ] && echo -e "\n=== $1 ==="
}

section "1. SYSTEM"
UPTIME=$(uptime -p 2>/dev/null)
ok "Uptime: $UPTIME"
[ $(grep -c . /proc/loadavg >/dev/null; awk '{print ($1>4)?1:0}' /proc/loadavg) = "1" ] \
    && warn "Hohe Load: $(awk '{print $1, $2, $3}' /proc/loadavg)"
MEM=$(free -m | awk '/Mem:/ {printf "%d/%d MB", $3, $2}')
ok "RAM: $MEM"
DISK=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
[ "$DISK" -gt 85 ] && warn "Disk belegt: ${DISK}%" || ok "Disk: ${DISK}% belegt"

section "2. USB / SERIAL (heutige Fehlerquelle!)"
EXPECTED_DEVICES=("Silicon_Labs" "STMicroelectronics" "SDRplay")
for pattern in "${EXPECTED_DEVICES[@]}"; do
    if lsusb | grep -qi "${pattern//_/ }"; then
        ok "USB-Geraet gefunden: $pattern"
    else
        fail "USB-Geraet FEHLT: $pattern"
        echo -e "       ${YELLOW}-> Kabel/Hub pruefen, Geraet stromlos machen${NC}"
    fi
done

DEVCOUNT=$(ls /dev/serial/by-id/ 2>/dev/null | wc -l)
if [ "$DEVCOUNT" -eq 0 ]; then
    fail "/dev/serial/by-id ist LEER -> kein CAT moeglich"
    echo -e "       ${YELLOW}-> dmesg | tail -30  zeigt Enumeration-Fehler${NC}"
else
    ok "$DEVCOUNT Serial-Devices in /dev/serial/by-id"
    [ $QUIET -eq 0 ] && ls /dev/serial/by-id/ | sed 's/^/       /'
fi

section "3. USB-FEHLER IM KERNEL-LOG (letzte Stunde)"
DMESG_ERRORS=$(dmesg --time-aware 2>/dev/null | tail -500 | grep -c "error -71\|unable to enumerate\|over-current\|disconnect" || true)
if [ "$DMESG_ERRORS" -gt 5 ]; then
    warn "$DMESG_ERRORS USB-Fehler in den letzten Log-Zeilen"
    dmesg | grep -E "error -71|unable to enumerate|over-current" | tail -3 | sed 's/^/       /'
    echo -e "       ${YELLOW}-> USB-Port/Hub betroffen, siehe Port-Nummer (z.B. 1-1.4)${NC}"
else
    ok "Keine haufenden USB-Fehler"
fi

section "4. PM2 / SHACK-SERVER"
PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import json,sys
try:
    apps = json.load(sys.stdin)
    for a in apps:
        if a['name']=='shack-server':
            print(a['pm2_env']['status'], a['pm2_env']['restarts'])
except: pass
" 2>/dev/null)
STATUS=$(echo "$PM2_STATUS" | awk '{print $1}')
RESTARTS=$(echo "$PM2_STATUS" | awk '{print $2}')
[ "$STATUS" = "online" ] && ok "PM2 status: online (restarts: $RESTARTS)" || fail "PM2 status: $STATUS"
# Hohe Restart-Zahl = Crash-Loop
if [ -n "$RESTARTS" ] && [ "$RESTARTS" -gt 300 ]; then
    warn "$RESTARTS Restarts -> haeufige Crashes? (pm2 logs pruefen)"
fi

section "5. CAT / RADIO"
# CAT-Fehler im letzten Log-Segment?
CAT_ERRORS=$(pm2 logs shack-server --lines 100 --nostream 2>/dev/null | grep -c "CAT open error\|CAT open failed" || true)
if [ "$CAT_ERRORS" -gt 0 ]; then
    fail "$CAT_ERRORS CAT-Fehler im Log:"
    pm2 logs shack-server --lines 100 --nostream 2>/dev/null | grep "CAT open" | tail -2 | sed 's/^/       /'
    echo -e "       ${YELLOW}-> Serial-Devices fehlen (siehe Abschnitt 2) oder Server neu starten${NC}"
else
    ok "Keine CAT open errors im Log"
fi

section "6. API-ENDPUNKTE"
for endpoint in "api/station" "api/spots" "api/contests/session" "api/radio"; do
    HTTP=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3000/$endpoint" 2>/dev/null)
    if [ "$HTTP" = "200" ]; then
        ok "GET /$endpoint -> 200"
    elif [ "$HTTP" = "000" ]; then
        fail "GET /$endpoint -> Timeout/keine Antwort"
    else
        warn "GET /$endpoint -> HTTP $HTTP"
    fi
done

section "7. DATENBANK"
DB="data/shack-server.db"
if [ -f "$DB" ]; then
    ok "DB vorhanden ($(du -h $DB | cut -f1))"
    # SQLite Integritaet
    INTEG=$(sqlite3 "$DB" "PRAGMA quick_check;" 2>/dev/null | head -1 | tr -d "[:space:]")
    echo "DEBUG-INTEG: [$INTEG]"
    if [ "$INTEG" = "ok" ]; then
        ok "SQLite quick_check: ok"
    else
        fail "SQLite Problem: [$INTEG]"
    fi
    INTEG=$(sqlite3 "$DB" "PRAGMA quick_check;" 2>/dev/null | head -1 | tr -d "[:space:]")
    echo "DEBUG-INTEG: [$INTEG]"
    if [ "$INTEG" = "ok" ]; then
        ok "SQLite quick_check: ok"
    else
        fail "SQLite Problem: [$INTEG]"
    fi
    # Offene QSOs / letzte Aktivitaet als Lebenszeichen
    LAST_QSO=$(sqlite3 "$DB" "SELECT MAX(created_at) FROM qsos;" 2>/dev/null)
    [ -n "$LAST_QSO" ] && ok "Letzter QSO-Eintrag: $LAST_QSO"
else
    fail "Datenbank fehlt: $DB"
fi

section "ERGEBNIS"
if [ $issues -eq 0 ]; then
    echo -e "  ${GREEN}Alles OK — keine Probleme gefunden.${NC}"
else
    echo -e "  ${RED}$issues Problem(e) gefunden.${NC} Oben gelb/rot markiert mit Loesungshinweisen."
fi
exit $issues
