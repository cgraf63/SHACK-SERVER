const CONTEST_BAND_REFRESH = 10000;

let contestQrzCountry = "";

const CONTEST_BANDS = {


    "160m": {
        min: 1.800,
        max: 2.000
    },

    "80m": {
        min: 3.500,
        max: 4.000
    },

    "60m": {
        min: 5.3515,
        max: 5.3665
    },

    "40m": {
        min: 7.000,
        max: 7.300
    },

    "30m": {
        min: 10.100,
        max: 10.150
    },

    "20m": {
        min: 14.000,
        max: 14.350
    },

    "17m": {
        min: 18.068,
        max: 18.168
    },

    "15m": {
        min: 21.000,
        max: 21.450
    },

    "12m": {
        min: 24.890,
        max: 24.990
    },

    "10m": {
        min: 28.000,
        max: 29.700
    },

    "6m": {
        min: 50.000,
        max: 52.000
    },

    "2m": {
        min: 144.000,
        max: 146.000
    },

    "70cm": {
        min: 430.000,
        max: 440.000
    }

};


let contestBand =
    "20m";


let contestSpots = [];

/* =========================================================================
 * CAT CONTROL
 *
 * Read:  /api/radio is polled every second. When the transceiver's
 *        frequency or mode CHANGES, frequency, band and mode of the entry
 *        form follow. A value typed by hand stays until the rig changes.
 * Write: clicking a spot in the Live Band tunes the active transceiver
 *        to the spot frequency and mode (same as the dashboard).
 * ========================================================================= */

const CONTEST_CAT_POLL_MS = 1000;

const CONTEST_CAT_ENABLED_KEY = "contest.catEnabled";

/*
 * CAT on/off is a per-browser setting (Multi-OP: only the position at
 * the transceiver switches it on). Default: off.
 */
function isContestCatEnabled() {

    try {
        return localStorage.getItem(CONTEST_CAT_ENABLED_KEY) === "1";
    }
    catch {
        return false;
    }

}

function setContestCatEnabled(enabled) {

    try {
        localStorage.setItem(CONTEST_CAT_ENABLED_KEY, enabled ? "1" : "0");
    }
    catch {
        // storage not available
    }

    renderContestCatToggle();

    if (enabled) {
        // Take over the transceiver state immediately.
        contestCat.lastHz = null;
        contestCat.lastMode = null;
        pollContestCat();
    }

}

function renderContestCatToggle() {

    const button = document.getElementById("contest-cat-toggle");

    if (!button) {
        return;
    }

    const enabled = isContestCatEnabled();

    button.classList.toggle("on", enabled);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.textContent = enabled ? "CAT ON" : "CAT OFF";
    button.title = enabled
        ? "This position follows and tunes the transceiver. Click to switch off."
        : "This position does not use the transceiver. Click to switch on.";

}

function setupContestCatToggle() {

    const button = document.getElementById("contest-cat-toggle");

    if (button) {
        button.addEventListener("click", () =>
            setContestCatEnabled(!isContestCatEnabled())
        );
    }

    renderContestCatToggle();

}

const contestCat = {
    connected: false,
    hz: 0,
    mode: "",
    lastHz: null,
    lastMode: null,
    polling: false
};


/*
 * Rig mode -> contest entry mode (SSB / CW / RTTY / FT8).
 */
function contestEntryModeFromRig(rigMode) {

    const mode = String(rigMode || "").toUpperCase();

    if (mode === "LSB" || mode === "USB") return "SSB";
    if (mode.startsWith("CW")) return "CW";
    if (mode.startsWith("RTTY")) return "RTTY";
    if (mode.startsWith("DATA") || mode === "PSK") return "FT8";

    return "";

}


/*
 * Spot mode -> rig mode (identical to the dashboard):
 * CW -> CW-L, everything else LSB below 10 MHz, USB above.
 */
function contestRigModeForSpot(spotMode, frequencyHz) {

    const mode = String(spotMode || "").toUpperCase();

    if (mode === "CW" || mode === "CW-R") {
        return "CW-L";
    }

    return frequencyHz < 10000000 ? "LSB" : "USB";

}


/*
 * kHz -> contest entry band ("160" ... "10"), "" outside contest bands.
 */
function contestEntryBandFromKHz(kHz) {

    const mhz = Number(kHz) / 1000;

    for (const band of ["160", "80", "40", "20", "15", "10"]) {
        const range = CONTEST_BANDS[`${band}m`];
        if (range && mhz >= range.min && mhz <= range.max) {
            return band;
        }
    }

    return "";

}


function formatContestKHz(hz) {

    // 14205500 Hz -> "14205.5", 14200000 Hz -> "14200"
    return String(Number((hz / 1000).toFixed(2)));

}


/*
 * Write the transceiver state into the entry form.
 */
function applyContestCatToEntry() {

    const frequencyInput =
        document.getElementById("contest-frequency-input");

    const bandInput =
        document.getElementById("contest-band-input");

    const modeInput =
        document.getElementById("contest-mode-input");

    const kHz = contestCat.hz / 1000;

    // Do not overwrite a frequency the operator is typing right now.
    if (
        frequencyInput &&
        document.activeElement !== frequencyInput
    ) {
        frequencyInput.value = formatContestKHz(contestCat.hz);
    }

    const band = contestEntryBandFromKHz(kHz);

    if (bandInput && band && bandInput.value !== band) {

        bandInput.value = band;

        try {
            localStorage.setItem("contest.lastBand", band);
        }
        catch {
            // storage not available
        }

        setContestLiveBand(band);
        checkContestDupe({ refresh: false });

    }

    const entryMode = contestEntryModeFromRig(contestCat.mode);

    if (
        modeInput &&
        entryMode &&
        [...modeInput.options].some(o => o.value === entryMode) &&
        modeInput.value !== entryMode
    ) {

        modeInput.value = entryMode;

        try {
            localStorage.setItem("contest.lastMode", entryMode);
        }
        catch {
            // storage not available
        }

    }

}


/*
 * Poll the transceiver (also refreshes the STATION card).
 */
async function pollContestCat() {

    if (contestCat.polling) {
        return;
    }

    contestCat.polling = true;

    try {

        const state = await loadContestRadio();

        if (!state || !state.connected || !(state.hz > 0)) {
            contestCat.connected = false;
            return;
        }

        contestCat.connected = true;
        contestCat.hz = state.hz;
        contestCat.mode = state.mode;

        const changed =
            contestCat.lastHz === null ||
            Math.abs(state.hz - contestCat.lastHz) > 20 ||
            state.mode !== contestCat.lastMode;

        // While CAT is off, keep the "last seen" state unchanged, so that
        // switching on takes over the current transceiver state.
        if (isContestCatEnabled()) {
            contestCat.lastHz = state.hz;
            contestCat.lastMode = state.mode;
        }

        if (changed && isContestCatEnabled()) {
            applyContestCatToEntry();
        }

    }
    finally {

        contestCat.polling = false;

    }

}


/*
 * Tune the active transceiver (spot click).
 */
async function tuneContestRadio(frequencyKHz, spotMode) {

    if (!isContestCatEnabled() || !contestCat.connected) {
        return;
    }

    const frequencyHz = Math.round(Number(frequencyKHz) * 1000);

    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
        return;
    }

    const rigMode = contestRigModeForSpot(spotMode, frequencyHz);

    // The entry form already shows the spot values: the next poll must
    // not overwrite them (e.g. an FT8 spot is tuned as USB).
    contestCat.lastHz = frequencyHz;
    contestCat.lastMode = rigMode;

    try {

        const response = await fetch("/api/radio/tune", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                frequency: frequencyHz,
                mode: rigMode
            })
        });

        if (!response.ok) {

            let data = {};

            try {
                data = await response.json();
            }
            catch {
                // Non-JSON body
            }

            throw new Error(data.error || `HTTP ${response.status}`);

        }

    }
    catch (error) {

        console.error("Contest radio tune failed:", error);

        showContestEntryMessage(
            `Radio tune failed: ${error.message}`,
            "warn"
        );

    }

}


/* Contest QSOs already worked in the current session, grouped by band. */
let contestWorkedByBand = new Map();

/*
 * Contest-local CTY lookup.
 * This does not change the shared spot API or global resolver.
 */
let contestCtyPromise = null;
let contestCty = null;

async function loadContestCtyDatabase() {
    if (contestCty) return contestCty;
    if (contestCtyPromise) return contestCtyPromise;

    contestCtyPromise = (async () => {
        const response = await fetch("/api/contests/cty.dat", {
            cache: "no-store"
        });
        if (!response.ok) throw new Error(`CTY HTTP ${response.status}`);

        const text = await response.text();
        const exact = new Map();
        const prefixes = [];
        let entity = null;

        function addAlias(alias, info) {
            const value = String(alias || "").trim().toUpperCase();
            if (!value) return;

            if (value.startsWith("=")) {
                exact.set(value.slice(1), info);
            } else if (!value.includes("/")) {
                prefixes.push({ prefix: value, info });
            }
        }

        for (const line of text.split(/\r?\n/)) {
            if (!line.trim()) continue;

            if (!/^\s/.test(line) && line.includes(":")) {
                const fields = line.split(":");
                const name = (fields[0] || "").trim();
                const continent = (fields[3] || "").trim().toUpperCase();
                const primaryPrefix = (fields[7] || "").trim();

                entity = {
                    entity: name,
                    continent
                };

                if (name && continent) addAlias(primaryPrefix, entity);
                continue;
            }

            if (entity) {
                const aliases = line.trim().replace(/;$/, "");
                for (const alias of aliases.split(",")) {
                    addAlias(alias, entity);
                }
            }
        }

        prefixes.sort((a, b) => b.prefix.length - a.prefix.length);
        contestCty = { exact, prefixes };
        return contestCty;
    })();

    try {
        return await contestCtyPromise;
    } catch (error) {
        contestCtyPromise = null;
        console.error("Contest CTY loading failed:", error);
        return null;
    }
}

function resolveContestCty(callsign) {
    if (!contestCty || !callsign) return null;

    const call = String(callsign).trim().toUpperCase();
    if (!call) return null;

    if (contestCty.exact.has(call)) return contestCty.exact.get(call);

    // Portable calls: check components from left to right.
    const components = call.split("/").filter(Boolean);
    for (const component of components) {
        const match = contestCty.prefixes.find(
            entry => component.startsWith(entry.prefix)
        );
        if (match) return match.info;
    }

    return null;
}

function getContestSpotColorClass(callsign) {
    const call = String(callsign || "").trim().toUpperCase();

    // Worked status always wins over geographic classification.
    if (contestWorkedByBand.get(contestBand)?.has(call)) {
        return "spot-worked";
    }

    const ownCall = String(
        window.contestSession?.station_callsign ||
        window.stationConfig?.callsign ||
        ""
    ).trim().toUpperCase();

    const own = resolveContestCty(ownCall);
    const other = resolveContestCty(call);

    // Unknown callsigns get a neutral fallback, not a guessed category.
    if (!own || !other) return "spot-unknown";
    if (own.entity === other.entity) return "spot-same-country";
    if (own.continent === other.continent) return "spot-same-continent";
    return "spot-other-continent";
}



/*
 * Escape HTML for spot labels.
 */
function escapeContestHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/*
 * Convert API frequency (kHz)
 * to MHz.
 */
function contestFrequencyMHz(value) {

    const frequency =
        Number(value);

    if (!Number.isFinite(frequency)) {
        return null;
    }

    return frequency / 1000;
}

/*
 * Load active radio information.
 *
 * Contest screen is read-only.
 * Radio selection remains a dashboard function.
 */
async function loadContestRadio() {

    const container =
        document.getElementById(
            "contest-active-radio"
        );

    if (!container) {
        return null;
    }


    try {

        const response =
            await fetch(
                "/api/radio?_=" + Date.now(),
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const radios =
            Array.isArray(data.radios)
                ? data.radios
                : [];


        const radio =
            radios.find(
                item => item.active
            );


        if (!radio) {

            container.innerHTML = `
                <div class="contest-radio-placeholder">
                    No active radio
                </div>
            `;

            return null;

        }


        const frequency =
            radio.frequency
                ? (
                    radio.frequency /
                    1000000
                ).toFixed(3) + " MHz"
                : "---.--- MHz";


        const mode =
            radio.mode ||
            "UNKNOWN";


        const power =
            `${radio.power ?? 0} W`;


        const connection =
            radio.connected
                ? "CAT Connected"
                : "CAT Disconnected";


        container.innerHTML = `
            <div class="station-radio-card active">

                <div class="station-radio-name">
                    📻
                    ${escapeContestHtml(
                        radio.name
                    )}
                    <span class="contest-radio-cat">
                        ● ${escapeContestHtml(
                            connection
                        )}
                    </span>
                </div>

                <div class="station-radio-frequency">
                    ${frequency}
                    ·
                    ${escapeContestHtml(
                        mode
                    )}
                    ·
                    ${escapeContestHtml(
                        power
                    )}
                </div>

            </div>
        `;

        return {
            connected: !!(data.connected ?? radio.connected),
            hz: Number(data.frequency ?? radio.frequency) || 0,
            mode: String(data.mode ?? radio.mode ?? "").toUpperCase()
        };

    }
    catch (error) {

        console.error(
            "Contest radio loading failed:",
            error
        );

        container.innerHTML = `
            <div class="contest-radio-placeholder">
                Radio unavailable
            </div>
        `;

        return null;

    }

}


/*
 * Shared loader for the current session's contest QSOs.
 *
 * Worked status, dupe check, statistics and the recent-QSO table all
 * use this one request. Parallel callers share the request in flight,
 * and callers can accept a short-lived cached result via maxAge (ms).
 */
let contestSessionQsoCache = {
    sessionId: 0,
    time: 0,
    qsos: []
};

let contestSessionQsoRequest = null;

function getContestSessionId() {

    const sessionId = Number(
        window.contestSessionId ||
        window.contestSession?.id ||
        0
    );

    return Number.isInteger(sessionId) && sessionId > 0
        ? sessionId
        : 0;

}

async function fetchContestSessionQsos({ maxAge = 0 } = {}) {

    const sessionId = getContestSessionId();

    if (!sessionId) {
        return null;
    }

    if (
        contestSessionQsoCache.sessionId === sessionId &&
        Date.now() - contestSessionQsoCache.time <= maxAge
    ) {
        return contestSessionQsoCache.qsos;
    }

    if (
        contestSessionQsoRequest &&
        contestSessionQsoRequest.sessionId === sessionId
    ) {
        return contestSessionQsoRequest.promise;
    }

    const promise = (async () => {

        const response = await fetch(
            `/api/contests/session/${sessionId}/qso?_=${Date.now()}`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const qsos = Array.isArray(data) ? data : [];

        contestSessionQsoCache = {
            sessionId,
            time: Date.now(),
            qsos
        };

        return qsos;

    })();

    contestSessionQsoRequest = { sessionId, promise };

    try {
        return await promise;
    }
    finally {
        if (contestSessionQsoRequest?.promise === promise) {
            contestSessionQsoRequest = null;
        }
    }

}

/*
 * Build the worked lookup (band -> set of calls) from session QSOs.
 * A station is WORKED only if its callsign was logged on this band
 * in this contest session. The normal QSO log is deliberately not used.
 */
function applyContestWorkedStatus(qsos) {

    const worked = new Map();

    for (const qso of qsos || []) {
        const call = String(qso.call || "").trim().toUpperCase();
        const bandValue = String(qso.band || "").trim().toLowerCase();
        const band = bandValue.endsWith("m") ? bandValue : `${bandValue}m`;
        if (!call || !bandValue) continue;

        if (!worked.has(band)) worked.set(band, new Set());
        worked.get(band).add(call);
    }

    contestWorkedByBand = worked;

}

/*
 * Session QSOs from the server plus locally queued ones.
 * If the server is unreachable, the last known server list is used,
 * so dupe check and Recent QSOs keep working offline.
 */
async function getContestSessionQsosForDisplay() {

    let qsos;

    try {
        qsos = await fetchContestSessionQsos();
    }
    catch (error) {

        console.warn("Contest session QSOs unavailable, using cache:", error);

        qsos =
            contestSessionQsoCache.sessionId === getContestSessionId()
                ? contestSessionQsoCache.qsos
                : [];

    }

    return withContestPendingQsos(qsos || []);

}

async function loadContestWorkedStatus() {

    if (!getContestSessionId()) {
        contestWorkedByBand = new Map();
        return;
    }

    applyContestWorkedStatus(
        await getContestSessionQsosForDisplay()
    );

}

/*
 * Periodic refresh: one request updates worked status, band statistics
 * and the recent-QSO table (QSOs from other operators appear as well).
 * The exchange-sent field is NOT touched here, so a value being edited
 * is never overwritten.
 */
async function refreshContestSessionView() {

    if (!getContestSessionId()) {
        contestWorkedByBand = new Map();
        renderContestRecentQsos(null);
        return;
    }

    const qsos = await getContestSessionQsosForDisplay();

    applyContestWorkedStatus(qsos);
    updateContestBandStatistics(qsos);
    renderContestRecentQsos(qsos);

}

/*
 * Load live spots and refresh the session view.
 * A failing spot feed no longer blocks the session refresh.
 */
async function loadContestSpots() {

    try {

        const response =
            await fetch("/api/spots");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const spots =
            await response.json();

        contestSpots =
            Array.isArray(spots)
                ? spots
                : [];

    }
    catch (error) {

        console.error(
            "Contest band spots failed:",
            error
        );

    }

    await refreshContestSessionView();
    await loadContestCtyDatabase();
    renderContestBand();

}

/*
 * Render selected band.
 */

/*
 * Render selected band.
 */
function renderContestBand() {

    const container =
        document.getElementById(
            "contest-band-spots"
        );

    if (!container) {
        return;
    }

    const band =
        CONTEST_BANDS[contestBand];

    if (!band) {
        return;
    }


    /*
     * Dynamic vertical band size.
     *
     * 10 kHz = 50 px
     */
    const scale =
        document.querySelector(
            ".contest-band-scale"
        );

    const range =
        band.max - band.min;

    const bandHeight =
        Math.max(
            900,
            Math.round(
                range * 5600
            )
        );

    if (scale) {

        scale.style.height =
            `${bandHeight}px`;

        scale.style.minHeight =
            `${bandHeight}px`;

    }


    /*
     * Rebuild frequency scale.
     */
    renderContestFrequencyScale(
        band
    );


    container.innerHTML = "";


    /*
     * Select current-band spots.
     */
    const visibleSpots =
        contestSpots.filter(
            spot =>
                spot.band === contestBand
        );


    /*
     * Remove exact duplicates.
     */
    const unique =
        new Map();


    visibleSpots.forEach(
        spot => {

            const frequency =
                contestFrequencyMHz(
                    spot.frequency
                );

            if (frequency === null) {
                return;
            }

            if (
                frequency < band.min ||
                frequency > band.max
            ) {
                return;
            }


            const key =
                `${spot.call}|${spot.frequency}`;


            if (!unique.has(key)) {

                unique.set(
                    key,
                    {
                        ...spot,
                        frequency
                    }
                );

            }

        }
    );


    /*
     * Sort from high to low frequency.
     */
    const spots =
        [...unique.values()]
            .sort(
                (a, b) =>
                    b.frequency -
                    a.frequency
            );


    /*
     * Three horizontal lanes.
     *
     * Spots are distributed across
     * all three lanes by default.
     *
     * Collision detection is performed
     * independently inside each lane.
     */
    const lanes = [
        [],
        [],
        []
    ];


    /*
     * Minimum vertical distance between
     * two labels in the same lane.
     */
    const minimumGap = 26;


    /*
     * Frequency -> vertical pixel position.
     */
    function frequencyY(
        frequency
    ) {

        return (
            (
                (band.max - frequency)
                /
                (band.max - band.min)
            )
            *
            bandHeight
        );

    }


    /*
     * Round-robin lane preference.
     *
     * 0 -> left
     * 1 -> center
     * 2 -> right
     * 0 -> left
     * ...
     */
    let laneCounter = 0;


    /*
     * Find a suitable lane.
     *
     * We prefer the next lane in the
     * rotation, but avoid collisions.
     */
    function findLane(y) {

        const preferredLane =
            laneCounter % 3;

        laneCounter++;


        /*
         * Try preferred lane first,
         * then the other two.
         */
        const laneOrder = [
            preferredLane,
            (preferredLane + 1) % 3,
            (preferredLane + 2) % 3
        ];


        for (
            const lane
            of laneOrder
        ) {

            const entries =
                lanes[lane];


            const collision =
                entries.some(
                    existing =>
                        Math.abs(
                            y - existing
                        ) < minimumGap
                );


            if (!collision) {

                return lane;

            }

        }


        /*
         * All lanes have a collision.
         *
         * Choose the lane with the
         * fewest occupied positions.
         */
        let bestLane = 0;

        let bestCount =
            lanes[0].length;


        for (
            let lane = 1;
            lane < 3;
            lane++
        ) {

            if (
                lanes[lane].length <
                bestCount
            ) {

                bestLane =
                    lane;

                bestCount =
                    lanes[lane].length;

            }

        }


        return bestLane;

    }

    spots.forEach(
        spot => {

            const y =
                frequencyY(
                    spot.frequency
                );


            const lane =
                findLane(y);


            lanes[lane].push(y);


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "contest-band-spot";


            /*
             * The spot itself remains
             * exactly on its frequency.
             */
            item.style.top =
                `${(
                    (
                        band.max -
                        spot.frequency
                    )
                    /
                    (
                        band.max -
                        band.min
                    )
                ) * 100}%`;

/*
 * Three horizontal lanes.
 *
 * 0 = left
 * 1 = centre
 * 2 = right
 */
const laneX = [
    "18%",
    "50%",
    "82%"
];


item.classList.add(
    `spot-lane-${lane}`
);


/*
 * Position both marker and label
 * at the selected horizontal lane.
 */
item.style.setProperty(
    "--lane-x",
    laneX[lane]
);

            item.innerHTML = `

                <span class="spot-dot ${
                    getContestSpotColorClass(spot.call)
                }"></span>

                <span class="spot-label">

                    <span class="contest-band-call">
                        ${escapeContestHtml(
                            spot.call
                        )}
                    </span>

                    <span class="contest-band-mode">
                        ${escapeContestHtml(
                            spot.mode || ""
                        )}
                    </span>

                </span>

            `;


            const isWorked = contestWorkedByBand
                .get(contestBand)
                ?.has(String(spot.call || "").trim().toUpperCase()) || false;

            item.title =
                `${spot.call} · ` +
                `${spot.frequency} kHz · ` +
                `${spot.mode || ""} · ` +
                `${isWorked ? "WORKED on this band" : "NEW on this band"}`;


item.addEventListener(
    "click",
    () => {

        const call =
            document.getElementById(
                "contest-call"
            );

        const frequency =
            document.getElementById(
                "contest-frequency-input"
            );

        const mode =
            document.getElementById(
                "contest-mode-input"
            );

        const band =
            document.getElementById(
                "contest-band-input"
            );


        /*
         * CALLSIGN
         */

        if (call) {

            call.value =
                String(
                    spot.call || ""
                ).toUpperCase();

        }


        /*
         * FREQUENCY
         *
         * In the band view spot.frequency was converted to MHz,
         * the entry field and the radio use kHz.
         */

        const spotKHz =
            Number(spot.frequency) * 1000;

        if (frequency) {

            frequency.value =
                Number.isFinite(spotKHz) && spotKHz > 0
                    ? formatContestKHz(spotKHz * 1000)
                    : "";

        }


        /*
         * BAND
         *
         * Accept:
         *   20
         *   20m
         */

        if (band) {

            const spotBand =
                String(
                    spot.band || ""
                )
                .trim()
                .replace(
                    /m$/i,
                    ""
                );

            const bandOption =
                Array.from(
                    band.options
                ).find(
                    option =>
                        option.value ===
                        spotBand
                );

            if (bandOption) {

                band.value =
                    spotBand;

                localStorage.setItem(
                    "contest.lastBand",
                    spotBand
                );

            }

        }


        /*
         * MODE
         */

        if (mode) {

            const spotMode =
                String(
                    spot.mode || ""
                )
                .trim()
                .toUpperCase();

            const modeOption =
                Array.from(
                    mode.options
                ).find(
                    option =>
                        option.value.toUpperCase() ===
                        spotMode
                );

            if (modeOption) {

                mode.value =
                    modeOption.value;

                localStorage.setItem(
                    "contest.lastMode",
                    modeOption.value
                );

            }

        }


        /*
         * QRZ:
         * Name / Country / Locator
         */

        lookupContestSpotCallsign(
            spot.call || ""
        );


        /*
         * CAT: tune the transceiver to the spot.
         */
        tuneContestRadio(
            spotKHz,
            spot.mode
        );


        /*
         * Back to CALLSIGN.
         */

        if (call) {

            call.focus();
            call.select();

        }

    }
);

            container.appendChild(
                item
            );

        }
    );

}


/*
 * Band selector.
 */
function setupContestBandSelector() {

    const selector =
        document.getElementById(
            "contest-band-select"
        );

    if (!selector) {
        return;
    }


    selector.addEventListener(
    "change",
    event => {

        const selectedBand =
            event.target.value;

        contestBand =
            selectedBand;

        const band =
            CONTEST_BANDS[selectedBand];

        if (band) {

            renderContestFrequencyScale(
                band
            );

        }

        renderContestBand();

    }
);

}


/*
 * Render dynamic frequency scale.
 *
 * Frequencies from the API are kHz,
 * while the viewer internally uses MHz.
 */
function renderContestFrequencyScale(band) {

    const scale =
        document.getElementById(
            "contest-frequency-scale"
        );

    if (!scale) {
        return;
    }


    const range =
        band.max - band.min;

	const step = 0.010;

            
    /*
     * Generate clean frequency values.
     */
    const frequencies = [];


    frequencies.push(
        band.min
    );


    const first =
        Math.ceil(
            band.min / step
        ) * step;


    for (
        let frequency = first;
        frequency < band.max;
        frequency += step
    ) {

        if (
            frequency > band.min &&
            frequency < band.max
        ) {

            frequencies.push(
                frequency
            );

        }

    }


    frequencies.push(
        band.max
    );


    /*
     * Remove duplicates and sort
     * from high to low.
     */
    const unique =
        [...new Set(
            frequencies.map(
                frequency =>
                    Number(
                        frequency.toFixed(6)
                    )
            )
        )]
        .sort(
            (a, b) => b - a
        );


    scale.innerHTML = "";


    unique.forEach(
        frequency => {

            const line =
                document.createElement(
                    "div"
                );


            line.className =
                "contest-frequency-line";


            const position =
                (
                    (band.max - frequency)
                    /
                    (band.max - band.min)
                )
                * 100;


            line.style.top =
                `${position}%`;


            const label =
                document.createElement(
                    "span"
                );


            label.textContent =
                step < 0.01
                    ? frequency.toFixed(4)
                    : frequency.toFixed(3);


            line.appendChild(
                label
            );


            scale.appendChild(
                line
            );

        }
    );

}


/*
 * Initialize contest band viewer.
 */
async function lookupContestSpotCallsign(callsign) {

    const nameInput =
        document.getElementById(
            "contest-name"
        );

    const locatorInput =
        document.getElementById(
            "contest-locator"
        );

    if (!callsign) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/qso/qrz/${encodeURIComponent(callsign)}`
            );

        if (!response.ok) {
            return;
        }

        const result =
            await response.json();

        const qrz =
            result?.qrz;

contestQrzCountry =
    qrz?.country || "";


        if (!qrz) {
            return;
        }

        if (nameInput) {
            nameInput.value =
                qrz.name || "";
        }

        const countryInput =
            document.getElementById(
                "contest-country"
            );

        if (countryInput) {
            countryInput.value =
                qrz.country || "";
        }

        if (locatorInput) {
            locatorInput.value =
                qrz.locator || "";
        }

    }
    catch (error) {

        console.warn(
            "Contest QRZ lookup failed:",
            error
        );

    }

}



/*
 * Hide the contest selection card (contest, create session, operators)
 * while a session is RUNNING or PAUSED. It reappears for READY/FINISHED.
 * Driven by the text of #contest-status, so contest-session.js
 * does not need to know about it.
 */
function updateContestSelectionVisibility() {

    const status =
        document.getElementById("contest-status");

    const selection =
        document.getElementById("contest-selection");

    if (!status || !selection) {
        return;
    }

    const text =
        String(status.textContent || "")
            .trim()
            .toUpperCase();

    selection.hidden =
        /RUNNING|PAUSED/.test(text);

}

function setupContestSelectionVisibility() {

    const status =
        document.getElementById("contest-status");

    if (!status) {
        return;
    }

    new MutationObserver(
        updateContestSelectionVisibility
    ).observe(status, {
        childList: true,
        characterData: true,
        subtree: true
    });

    updateContestSelectionVisibility();

}


function initContestBandViewer() {

    setupContestBandSelector();

    setupContestSelectionVisibility();







    /*
     * Initial rendering.
     */
    renderContestBand();

    /*
     * CAT: read frequency/mode of the transceiver continuously.
     */
    setupContestCatToggle();
    pollContestCat();
    setInterval(pollContestCat, CONTEST_CAT_POLL_MS);

    loadContestSpots();

    /*
     * Refresh every 10 seconds.
     */
    setInterval(
        loadContestSpots,
        CONTEST_BAND_REFRESH
    );

}


/*
 * Start viewer.
 */
if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initContestBandViewer
    );

}
else {

    initContestBandViewer();

}




/*
 * Contest QSO Logger
 *
 * Contest QSOs are written into the
 * normal QSO log.
 *
 * contest_id:
 *   real contest ID when available
 *   "999" when no contest ID exists
 */

/*
 * Load and display recent Contest QSOs.
 *
 * Contest QSOs are identified by a non-empty contest_idp and session id
 * The normal QSO log is the single source of truth.
 */

function updateContestBandStatistics(qsos) {

    const bands = ["160", "80", "40", "20", "15", "10"];
    const counts = Object.fromEntries(bands.map(band => [band, 0]));

    for (const qso of qsos || []) {

        const band =
            String(qso.band || "")
                .toLowerCase()
                .replace("m", "")
                .trim();

        if (band in counts) {
            counts[band]++;
        }

    }

    let total = 0;

    for (const band of bands) {

        const element =
            document.getElementById(`contest-band-qso-${band}`);

        if (element) {
            element.textContent = counts[band];
        }

        total += counts[band];

    }

    const totalElement =
        document.getElementById("contest-band-qso-total");

    if (totalElement) {
        totalElement.textContent = total;
    }

}

function updateContestSerialNumber(qsos) {

    const exchangeInput =
        document.getElementById(
            "contest-exchange-sent"
        );

    if (!exchangeInput) {
        return;
    }

    if (
        String(
            window.contestExchangeSent || "none"
        ).toLowerCase() !== "serial"
    ) {
        return;
    }

    const contestId =
        String(
            window.contestId || ""
        ).trim();

    let maxSerial = 0;

    qsos
        .filter(
            qso =>
                String(
                    qso.contest_id ?? ""
                ).trim() === contestId
        )
        .forEach(
            qso => {

                const notes =
                    String(
                        qso.notes || ""
                    );

                const match =
                    notes.match(
                        /Contest Exchange Sent:\s*(\d+)/i
                    );

                if (!match) {
                    return;
                }

                const serial =
                    Number(
                        match[1]
                    );

                if (
                    Number.isInteger(serial) &&
                    serial > maxSerial
                ) {
                    maxSerial = serial;
                }

            }
        );

    exchangeInput.value =
        String(maxSerial + 1);

}

function updateContestExchangeSent() {

    const exchangeInput =
        document.getElementById(
            "contest-exchange-sent"
        );

    if (!exchangeInput) {
        return;
    }

    const exchangeType =
        String(
            window.contestExchangeSent || "none"
        )
        .trim()
        .toLowerCase();

    if (exchangeType === "cq_zone") {

        exchangeInput.value = "14";

    }

}


/*
 * Render the recent-QSO table (newest first, scrollable).
 * qsos === null means: no active session.
 */
/*
 * Size the recent-QSO list to exactly 9 visible rows,
 * using the real rendered header/row heights (font independent).
 */
function fitContestRecentRows(body) {

    const wrapper = body?.closest(".contest-table-wrapper");
    const headerRow = wrapper?.querySelector("thead tr");
    const firstRow = body?.querySelector("tr");

    if (!wrapper || !headerRow || !firstRow) {
        return;
    }

    const headerHeight = headerRow.getBoundingClientRect().height;
    const rowHeight = firstRow.getBoundingClientRect().height;

    if (headerHeight > 0 && rowHeight > 0) {
        wrapper.style.setProperty("--recent-header-h", `${headerHeight}px`);
        wrapper.style.setProperty("--recent-row-h", `${rowHeight}px`);
    }

}

/*
 * Operator column: show only the callsign ("HB9ISO – Christoph" -> "HB9ISO"),
 * the full name is in the tooltip.
 */
function contestOperatorCall(operator) {

    return String(operator || "")
        .split(/\s+[–-]\s+/)[0]
        .trim();

}

function renderContestRecentQsos(qsos) {

    const body =
        document.getElementById(
            "contest-qso-body"
        );

    if (!body) {
        return;
    }

    if (qsos === null) {

        body.innerHTML = `
            <tr>
                <td colspan="8" class="contest-empty">
                    No active contest session
                </td>
            </tr>
        `;

        return;
    }

    const contestQsos =
        qsos
            .slice()
            .sort((a, b) => {

                const aTime =
                    `${a.qso_date || ""} ${a.time_on_utc || ""}`;

                const bTime =
                    `${b.qso_date || ""} ${b.time_on_utc || ""}`;

                return bTime.localeCompare(aTime);

            })
            .slice(0, 500); // all session QSOs, list scrolls after 9 rows

    if (!contestQsos.length) {

        body.innerHTML = `
            <tr>
                <td colspan="8" class="contest-empty">
                    No contest QSOs
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        contestQsos
            .map(qso => {

                const frequency = Number(qso.frequency);

                const rowClass =
                    qso._pending === "rejected"
                        ? "contest-row-rejected"
                        : qso._pending
                            ? "contest-row-pending"
                            : "";

                const marker =
                    qso._pending === "rejected"
                        ? '<span class="contest-row-flag" title="Rejected by server">✖</span>'
                        : qso._pending
                            ? '<span class="contest-row-flag" title="Not yet saved on the server">⏳</span>'
                            : "";

                return `
                    <tr class="${rowClass}">
                        <td>${marker}${escapeContestHtml(qso.time_on_utc || "")}</td>
                        <td>${escapeContestHtml(qso.call || "")}</td>
                        <td>${escapeContestHtml(qso.band || "")}</td>
                        <td>${escapeContestHtml(
                            Number.isFinite(frequency) ? frequency.toFixed(3) : ""
                        )}</td>
                        <td>${escapeContestHtml(qso.mode || "")}</td>
                        <td>${escapeContestHtml(qso.rst_sent || "")}/${escapeContestHtml(qso.rst_rcvd || "")}</td>
                        <td>${escapeContestHtml(qso.exchange_received || "")}</td>
                        <td title="${escapeContestHtml(qso.operator || "")}">${escapeContestHtml(contestOperatorCall(qso.operator))}</td>
                    </tr>
                `;

            })
            .join("");

    fitContestRecentRows(body);

}


/*
 * Full reload (initial load, session change, after logging):
 * fresh data, table, statistics, worked status and exchange sent.
 */
async function loadContestRecentQsos() {

    if (!getContestSessionId()) {
        contestWorkedByBand = new Map();
        renderContestRecentQsos(null);
        return;
    }

    const qsos = await getContestSessionQsosForDisplay();

    applyContestWorkedStatus(qsos);
    updateContestBandStatistics(qsos);
    updateContestSerialNumber(qsos);
    updateContestExchangeSent();
    renderContestRecentQsos(qsos);

}





/* =========================================================================
 * PENDING QSO QUEUE (no QSO loss on network / server problems)
 *
 * Every QSO is first written to localStorage, then sent to the server.
 *  - Sent OK                 -> removed from the queue
 *  - Network error / HTTP 5xx -> stays queued, retried automatically
 *  - HTTP 4xx (server says no)-> marked "rejected", not retried
 *                               (shown in the queue bar, can be discarded)
 *
 * Before a QSO is re-sent, the session log is checked for an entry with
 * the same call, band, date and UTC time. If the first attempt actually
 * reached the server (only the answer was lost), it is NOT sent again.
 * ========================================================================= */

const CONTEST_QUEUE_KEY = "contest.pendingQsos";
const CONTEST_QUEUE_RETRY_MS = 5000;

const contestQueueInFlight = new Set();
let contestQueueFlushing = false;


function readContestQueue() {

    try {
        const data = JSON.parse(
            localStorage.getItem(CONTEST_QUEUE_KEY) || "[]"
        );
        return Array.isArray(data) ? data : [];
    }
    catch {
        return [];
    }

}

function writeContestQueue(queue) {

    try {
        localStorage.setItem(
            CONTEST_QUEUE_KEY,
            JSON.stringify(queue)
        );
    }
    catch (error) {
        console.error("Contest queue could not be saved:", error);
    }

    renderContestQueueStatus();

}

function enqueueContestQso(sessionId, qso) {

    const item = {
        uid:
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 8),
        sessionId,
        qso,
        createdAt: new Date().toISOString(),
        attempts: 0,
        status: "pending",   // "pending" | "rejected"
        lastError: ""
    };

    const queue = readContestQueue();
    queue.push(item);
    writeContestQueue(queue);

    return item;

}

function updateContestQueueItem(uid, changes) {

    const queue = readContestQueue();
    const item = queue.find(entry => entry.uid === uid);

    if (item) {
        Object.assign(item, changes);
        writeContestQueue(queue);
    }

}

function removeContestQueueItem(uid) {

    writeContestQueue(
        readContestQueue().filter(entry => entry.uid !== uid)
    );

}


/*
 * Same QSO already in the server log? (call + band + date + UTC time)
 */
function contestQsoMatches(a, b) {

    const norm = value => String(value ?? "").trim().toUpperCase();
    const band = value => norm(value).replace(/M$/, "");

    return (
        norm(a.call) === norm(b.call) &&
        band(a.band) === band(b.band) &&
        norm(a.qso_date) === norm(b.qso_date) &&
        norm(a.time_on_utc).slice(0, 8) === norm(b.time_on_utc).slice(0, 8)
    );

}

async function contestQsoAlreadyOnServer(item) {

    const response = await fetch(
        `/api/contests/session/${item.sessionId}/qso?_=${Date.now()}`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const qsos = Array.isArray(data) ? data : [];

    return qsos.some(qso => contestQsoMatches(qso, item.qso));

}


/*
 * Send one queued QSO.
 * Returns { ok: true } or { ok: false, permanent: bool, error: string }.
 */
async function sendContestQueueItem(item, { checkServerFirst = true } = {}) {

    if (contestQueueInFlight.has(item.uid)) {
        return { ok: false, permanent: false, error: "in flight" };
    }

    contestQueueInFlight.add(item.uid);

    try {

        // A retry may hit a QSO that already arrived: never log it twice.
        if (checkServerFirst && item.attempts > 0) {
            if (await contestQsoAlreadyOnServer(item)) {
                removeContestQueueItem(item.uid);
                return { ok: true };
            }
        }

        updateContestQueueItem(item.uid, {
            attempts: (item.attempts || 0) + 1
        });

        const response = await fetch(
            `/api/contests/session/${item.sessionId}/qso`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item.qso)
            }
        );

        let data = {};

        try {
            data = await response.json();
        }
        catch {
            // Non-JSON body
        }

        if (response.ok) {
            removeContestQueueItem(item.uid);
            return { ok: true };
        }

        const error = data.error || `HTTP ${response.status}`;
        const permanent = response.status >= 400 && response.status < 500;

        updateContestQueueItem(item.uid, {
            lastError: error,
            status: permanent ? "rejected" : "pending"
        });

        return { ok: false, permanent, error };

    }
    catch (error) {

        // Network error, server down, timeout ...
        updateContestQueueItem(item.uid, {
            lastError: error.message || "Network error"
        });

        return {
            ok: false,
            permanent: false,
            error: error.message || "Network error"
        };

    }
    finally {

        contestQueueInFlight.delete(item.uid);

    }

}


/*
 * Send all pending QSOs, oldest first. Stops at the first network
 * failure (server still unreachable), keeps the order intact.
 */
async function flushContestQueue() {

    if (contestQueueFlushing) {
        return;
    }

    const pending =
        readContestQueue().filter(item => item.status === "pending");

    if (!pending.length) {
        return;
    }

    contestQueueFlushing = true;

    let sentAny = false;
    let sentCount = 0;

    try {

        for (const item of pending) {

            const result = await sendContestQueueItem(item);

            if (result.ok) {
                sentAny = true;
                sentCount++;
                continue;
            }

            if (!result.permanent) {
                break;
            }

        }

    }
    finally {

        contestQueueFlushing = false;

    }

    if (sentAny) {

        await loadContestRecentQsos();
        renderContestBand();

        // Replace a "saved locally" warning by a confirmation.
        const box = document.getElementById("contest-entry-message");

        if (!box || !box.classList.contains("error")) {
            showContestEntryMessage(
                `${sentCount} queued QSO${sentCount > 1 ? "s" : ""} ` +
                "saved on the server.",
                "success"
            );
        }

    }

    renderContestQueueStatus();

}


/*
 * Pending QSOs of the current session, shaped like server QSOs.
 * They count for dupe check / worked status and show in Recent QSOs.
 */
function getContestPendingQsos() {

    const sessionId = getContestSessionId();

    return readContestQueue()
        .filter(item => item.sessionId === sessionId)
        .map(item => ({
            ...item.qso,
            _pending: item.status,
            _uid: item.uid
        }));

}

function withContestPendingQsos(qsos) {

    const pending = getContestPendingQsos();

    if (!pending.length) {
        return qsos;
    }

    // Skip pending QSOs that the server list already contains.
    const extra = pending.filter(
        p => !(qsos || []).some(q => contestQsoMatches(q, p))
    );

    return [...(qsos || []), ...extra];

}


/*
 * Queue status bar in the entry area.
 */
function renderContestQueueStatus() {

    const bar = document.getElementById("contest-queue-status");

    if (!bar) {
        return;
    }

    const queue = readContestQueue();
    const pending = queue.filter(item => item.status === "pending");
    const rejected = queue.filter(item => item.status === "rejected");

    if (!queue.length) {
        bar.hidden = true;
        bar.innerHTML = "";
        return;
    }

    const parts = [];

    if (pending.length) {
        parts.push(
            `<span class="contest-queue-pending">` +
            `⏳ ${pending.length} QSO${pending.length > 1 ? "s" : ""} ` +
            `not yet saved on the server – retrying automatically` +
            (pending[0].lastError
                ? ` (${escapeContestHtml(pending[0].lastError)})`
                : "") +
            `</span>` +
            `<button type="button" class="contest-queue-retry">Retry now</button>`
        );
    }

    if (rejected.length) {
        const list = rejected
            .map(item =>
                `${escapeContestHtml(item.qso.call)} ` +
                `${escapeContestHtml(item.qso.time_on_utc)} ` +
                `(${escapeContestHtml(item.lastError)})`
            )
            .join(", ");

        parts.push(
            `<span class="contest-queue-rejected">` +
            `✖ Rejected by server: ${list}` +
            `</span>` +
            `<button type="button" class="contest-queue-discard">Discard</button>`
        );
    }

    bar.innerHTML = parts.join("");
    bar.hidden = false;

}

function setupContestQueue() {

    const bar = document.getElementById("contest-queue-status");

    if (bar) {
        bar.addEventListener("click", event => {

            if (event.target.closest(".contest-queue-retry")) {
                flushContestQueue();
            }

            if (event.target.closest(".contest-queue-discard")) {
                writeContestQueue(
                    readContestQueue().filter(item => item.status !== "rejected")
                );
                refreshContestSessionView().then(renderContestBand);
            }

        });
    }

    renderContestQueueStatus();

    // Retry automatically, and immediately when the network comes back.
    setInterval(flushContestQueue, CONTEST_QUEUE_RETRY_MS);
    window.addEventListener("online", flushContestQueue);

    // Another tab of the same browser changed the queue.
    window.addEventListener("storage", event => {
        if (event.key === CONTEST_QUEUE_KEY) {
            renderContestQueueStatus();
        }
    });

    // Left over from a crash / closed browser: send now.
    flushContestQueue();

}


/*
 * Inline message in the QSO entry area (replaces alert()).
 * type: "error" | "warn" | "success" | "" (clear)
 */
let contestEntryMessageTimer = null;

function showContestEntryMessage(text, type = "error") {

    const box =
        document.getElementById(
            "contest-entry-message"
        );

    if (!box) {
        if (text) console.warn("Contest:", text);
        return;
    }

    clearTimeout(contestEntryMessageTimer);

    box.textContent = text || "";
    box.className =
        "contest-entry-message" + (text && type ? ` ${type}` : "");

    // Success messages disappear by themselves.
    if (text && type === "success") {
        contestEntryMessageTimer =
            setTimeout(() => showContestEntryMessage(""), 3000);
    }

}

function contestEntryError(text, focusId) {

    showContestEntryMessage(text, "error");

    const field =
        focusId && document.getElementById(focusId);

    if (field) {
        field.focus();
        if (typeof field.select === "function") field.select();
    }

}


/*
 * Station callsign: from the running session; only if that is missing,
 * /api/station is asked once and cached (no request per QSO any more).
 */
let contestStationConfigCache = null;

async function getContestStationCallsign() {

    const sessionCall =
        String(window.contestSession?.station_callsign || "")
            .trim()
            .toUpperCase();

    if (sessionCall) {
        return sessionCall;
    }

    if (!contestStationConfigCache) {

        try {

            const response =
                await fetch(
                    "/api/station?_=" + Date.now(),
                    { cache: "no-store" }
                );

            if (response.ok) {
                contestStationConfigCache =
                    await response.json();
            }

        }
        catch (error) {

            console.error(
                "Contest station lookup failed:",
                error
            );

        }

    }

    return String(contestStationConfigCache?.callsign || "")
        .trim()
        .toUpperCase();

}


let contestLogging = false;


async function logContestQso() {

    // Prevent double submits (double click, Enter + click).
    if (contestLogging) {
        return;
    }

    const call =
        String(
            document.getElementById("contest-call")?.value || ""
        )
        .trim()
        .toUpperCase();

    if (!call) {
        return contestEntryError(
            "Please enter a callsign.",
            "contest-call"
        );
    }

    const rstSent =
        document.getElementById("contest-rst-sent")
            ?.value.trim() || "599";

    const rstReceived =
        document.getElementById("contest-rst-received")
            ?.value.trim() || "599";

    const exchangeSent =
        document.getElementById("contest-exchange-sent")
            ?.value.trim() || "";

    const exchangeReceived =
        document.getElementById("contest-exchange-received")
            ?.value.trim() || "";

    const frequencyText =
        document.getElementById("contest-frequency-input")
            ?.value.trim() || "";

    const mode =
        document.getElementById("contest-mode-input")
            ?.value.trim() || "";

    const band =
        document.getElementById("contest-band-input")
            ?.value.trim() || "";


    /*
     * Frequency input:
     *
     * 14345   = kHz
     * 14.345  = MHz
     *
     * Internally the contest log uses kHz.
     */
    let frequency =
        Number(frequencyText.replace(",", "."));

    if (
        Number.isFinite(frequency) &&
        frequency > 0 &&
        frequency < 1000
    ) {
        frequency *= 1000;
    }

    if (!Number.isFinite(frequency) || frequency <= 0) {
        return contestEntryError(
            "Invalid frequency.",
            "contest-frequency-input"
        );
    }

    if (!band || band === "—") {
        return contestEntryError(
            "Please select a band.",
            "contest-band-input"
        );
    }

    if (!mode || mode === "—") {
        return contestEntryError(
            "Please select a mode.",
            "contest-mode-input"
        );
    }

    if (!window.contestSessionId) {
        return contestEntryError(
            "No active contest session."
        );
    }

    if (
        typeof activeContestOperatorId === "undefined" ||
        !activeContestOperatorId
    ) {
        return contestEntryError(
            "Please select an active operator.",
            "contest-operator"
        );
    }

    const operator =
        document.getElementById("contest-operator")
            ?.selectedOptions?.[0]
            ?.textContent
            ?.trim() || "";

    if (!operator) {
        return contestEntryError(
            "Invalid active operator.",
            "contest-operator"
        );
    }


    contestLogging = true;

    const logButton =
        document.getElementById("contest-log-button");

    if (logButton) logButton.disabled = true;

    try {

        /*
         * Dupe check (same call, same band, this session).
         * A dupe is only flagged (red field + label), never blocked:
         * the QSO is logged directly, like in N1MM.
         */
        const isDupe = await checkContestDupe();


        const stationCallsign =
            await getContestStationCallsign();

        if (!stationCallsign) {
            return contestEntryError(
                "Station callsign is not configured."
            );
        }


        /*
         * UTC timestamp.
         */
        const now = new Date();

        const qso = {
            qso_date: now.toISOString().slice(0, 10),
            time_on_utc: now.toISOString().slice(11, 19),
            frequency: frequency,
            band: band,
            mode: mode.toUpperCase(),
            call: call,
            rst_sent: rstSent,
            rst_rcvd: rstReceived,
            exchange_sent: exchangeSent,
            exchange_received: exchangeReceived,
            operator: operator,
            station_callsign: stationCallsign
        };


        /*
         * Write to the local queue first (survives network errors and
         * browser crashes), then try to send it right away.
         */
        const item =
            enqueueContestQso(
                Number(window.contestSessionId),
                qso
            );

        const result =
            await sendContestQueueItem(item, { checkServerFirst: false });

        if (!result.ok && result.permanent) {

            // Server refused the data itself: keep the form for correction.
            removeContestQueueItem(item.uid);

            showContestEntryMessage(
                `Could not save QSO: ${result.error}`,
                "error"
            );

            return;
        }


        // Fresh data after our own insert (pending QSOs included).
        await loadContestRecentQsos();
        renderContestBand();


        /*
         * Prepare next QSO.
         */
        [
            "contest-call",
            "contest-name",
            "contest-country",
            "contest-locator",
            "contest-exchange-received"
        ].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = "";
        });

        contestQrzCountry = "";
        setContestCallStatus("", "");
        setContestFrequencyPreset(true);

        if (result.ok) {

            showContestEntryMessage(
                isDupe
                    ? `${call} logged on ${band}m (DUPE).`
                    : `${call} logged on ${band}m.`,
                isDupe ? "warn" : "success"
            );

        }
        else {

            showContestEntryMessage(
                `${call} saved locally – server not reachable, ` +
                "it will be sent automatically.",
                "warn"
            );

        }

        document.getElementById("contest-call")?.focus();

    }
    catch (error) {

        console.error(
            "Contest QSO:",
            error
        );

        showContestEntryMessage(
            `Could not save QSO: ${error.message}`,
            "error"
        );

    }
    finally {

        contestLogging = false;

        if (logButton) logButton.disabled = false;

    }

}



/*
 * Band-specific default frequency (kHz). Spot clicks may temporarily
 * replace the field; after logging, restore the selected band's preset.
 */
const CONTEST_FREQUENCY_PRESETS = {
    "160": "1800",
    "80": "3500",
    "40": "7000",
    "20": "14000",
    "15": "21000",
    "10": "28000"
};

function setContestFrequencyPreset(force = false) {
    const bandInput = document.getElementById("contest-band-input");
    const frequencyInput = document.getElementById("contest-frequency-input");
    if (!bandInput || !frequencyInput) return;

    // With CAT: the transceiver frequency wins when it is on the selected band.
    const rigOnBand =
        isContestCatEnabled() &&
        contestCat.connected &&
        contestCat.hz > 0 &&
        contestEntryBandFromKHz(contestCat.hz / 1000) === String(bandInput.value || "");

    const preset =
        rigOnBand
            ? formatContestKHz(contestCat.hz)
            : CONTEST_FREQUENCY_PRESETS[String(bandInput.value || "")];

    if (preset && (force || !frequencyInput.value.trim())) {
        frequencyInput.value = preset;
    }
}


/*
 * Callsign status label (DUPE / worked on other band / NEW).
 */
function setContestCallStatus(text, type) {

    const status =
        document.getElementById(
            "contest-call-status"
        );

    const callInput =
        document.getElementById(
            "contest-call"
        );

    if (status) {
        status.textContent = text;
        status.className =
            "contest-call-status" + (type ? ` ${type}` : "");
    }

    if (callInput) {
        callInput.classList.toggle(
            "contest-call-dupe",
            type === "dupe"
        );
    }

}


/*
 * Dupe check against the current contest session.
 *
 * DUPE = same callsign already logged on the selected band
 * in this session. Returns true for a dupe.
 */
async function checkContestDupe({ refresh = true } = {}) {

    const callInput =
        document.getElementById(
            "contest-call"
        );

    const bandInput =
        document.getElementById(
            "contest-band-input"
        );

    const call =
        String(callInput?.value || "")
            .trim()
            .toUpperCase();

    if (!call) {
        setContestCallStatus("", "");
        return false;
    }

    if (refresh) {
        await loadContestWorkedStatus();
    }

    // User may have typed a new call while we were loading.
    if (
        String(callInput?.value || "").trim().toUpperCase() !== call
    ) {
        return false;
    }

    const band =
        String(bandInput?.value || "").trim();

    const bandKey =
        band ? `${band}m` : "";

    const isDupe =
        !!bandKey &&
        (contestWorkedByBand.get(bandKey)?.has(call) || false);

    const otherBands =
        [...contestWorkedByBand.entries()]
            .filter(
                ([key, calls]) =>
                    key !== bandKey && calls.has(call)
            )
            .map(([key]) => key);

    if (isDupe) {
        setContestCallStatus(
            `DUPE (${bandKey})`,
            "dupe"
        );
    }
    else if (otherBands.length) {
        setContestCallStatus(
            `worked: ${otherBands.join(", ")}`,
            "worked-other"
        );
    }
    else {
        setContestCallStatus(
            "NEW",
            "new"
        );
    }

    return isDupe;

}


/*
 * ESC resets the entry form for the next QSO:
 * Callsign, Exchange Received, Name, Country, Locator cleared,
 * frequency back to the band preset, RST sent/received back to 599.
 */
function resetContestQsoEntry() {

    [
        "contest-call",
        "contest-exchange-received",
        "contest-name",
        "contest-country",
        "contest-locator"
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = "";
    });

    const rstSent =
        document.getElementById("contest-rst-sent");
    const rstReceived =
        document.getElementById("contest-rst-received");

    if (rstSent) rstSent.value = "599";
    if (rstReceived) rstReceived.value = "599";

    contestQrzCountry = "";

    setContestFrequencyPreset(true);
    setContestCallStatus("", "");
    showContestEntryMessage("");

    const callInput =
        document.getElementById("contest-call");

    if (callInput) callInput.focus();

}


function handleContestEscape(event) {

    if (event.key !== "Escape") {
        return;
    }

    // Only on the console view.
    const consoleView =
        document.getElementById("contest-view-console");

    if (!consoleView || consoleView.hidden) {
        return;
    }

    // Only when focus is in the entry form (or nowhere in particular).
    const active = document.activeElement;
    const inEntry =
        !active ||
        active === document.body ||
        !!active.closest?.(".contest-qso-entry");

    if (!inEntry) {
        return;
    }

    event.preventDefault();
    resetContestQsoEntry();

}

/*
 * Enter in any entry field logs the QSO (like N1MM).
 *
 * Registered on document in the CAPTURE phase, so it runs before any
 * other script can intercept Enter on the inputs (stopPropagation,
 * form handlers etc.). Registered once, directly at script load.
 */
function handleContestEnterKey(event) {

    if (
        event.key !== "Enter" ||
        event.isComposing ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
    ) {
        return;
    }

    const target = event.target;

    if (!target?.closest?.(".contest-qso-entry")) {
        return;
    }

    const tag = target.tagName;

    if (tag !== "INPUT" && tag !== "SELECT" && tag !== "BUTTON") {
        return;
    }

    // Handle it here, also for the LOG button (no extra click event).
    event.preventDefault();
    event.stopPropagation();

    logContestQso();

}

function setupContestEnterToLog() {

    if (window.__contestEnterToLogInstalled) {
        return;
    }

    window.__contestEnterToLogInstalled = true;

    document.addEventListener(
        "keydown",
        handleContestEnterKey,
        true
    );

}

setupContestEnterToLog();


/*
 * Keep the entry band (e.g. "20") and the live band view ("20m") in sync.
 * Values are set directly (no synthetic change events), so there is no loop.
 */
function setContestLiveBand(bandValue) {

    const liveBand = `${bandValue}m`;
    const liveSelect =
        document.getElementById("contest-band-select");

    if (!liveSelect || !CONTEST_BANDS[liveBand]) {
        return;
    }

    if (
        ![...liveSelect.options].some(o => o.value === liveBand)
    ) {
        return;
    }

    if (contestBand === liveBand && liveSelect.value === liveBand) {
        return;
    }

    liveSelect.value = liveBand;
    contestBand = liveBand;
    renderContestBand();

}

function setContestEntryBand(liveBand) {

    const bandInput =
        document.getElementById("contest-band-input");

    if (!bandInput) {
        return;
    }

    const bandValue =
        String(liveBand || "").replace(/m$/i, "");

    // WARC bands etc. are not in the contest entry list: leave entry as is.
    if (
        ![...bandInput.options].some(o => o.value === bandValue)
    ) {
        return;
    }

    if (bandInput.value === bandValue) {
        return;
    }

    bandInput.value = bandValue;

    try {
        localStorage.setItem("contest.lastBand", bandValue);
    }
    catch {
        // storage not available
    }

    setContestFrequencyPreset(true);
    checkContestDupe({ refresh: false });

}

function setupContestBandSync() {

    const bandInput =
        document.getElementById("contest-band-input");

    const liveSelect =
        document.getElementById("contest-band-select");

    if (!bandInput || !liveSelect) {
        return;
    }

    // Entry -> live view
    bandInput.addEventListener(
        "change",
        () => {
            if (bandInput.value) {
                try {
                    localStorage.setItem("contest.lastBand", bandInput.value);
                }
                catch {
                    // storage not available
                }
                setContestLiveBand(bandInput.value);
            }
        }
    );

    // Live view -> entry
    liveSelect.addEventListener(
        "change",
        () => setContestEntryBand(liveSelect.value)
    );

    // Initial state: entry wins if set, otherwise take the live band.
    if (bandInput.value) {
        setContestLiveBand(bandInput.value);
    }
    else {
        setContestEntryBand(liveSelect.value);
    }

}

/*
 * Connect LOG QSO button.
 */
function setupContestQsoLogger() {

    const button =
        document.getElementById(
            "contest-log-button"
        );


    if (!button) {

        return;

    }

    const bandInput = document.getElementById("contest-band-input");
    if (bandInput) {
        bandInput.addEventListener("change", () => setContestFrequencyPreset(true));
    }
    setContestFrequencyPreset(false);

    button.addEventListener(
        "click",
        logContestQso
    );

    const callInput =
        document.getElementById(
            "contest-call"
        );

    if (callInput) {

        /*
         * Always uppercase while typing (caret position preserved).
         */
        callInput.addEventListener(
            "input",
            () => {

                const start = callInput.selectionStart;
                const end = callInput.selectionEnd;
                const upper = callInput.value.toUpperCase();

                if (callInput.value !== upper) {
                    callInput.value = upper;
                    callInput.setSelectionRange(start, end);
                }

                // Any edit invalidates the previous dupe result.
                setContestCallStatus("", "");

            }
        );

        /*
         * QRZ lookup when the value was changed.
         */
        callInput.addEventListener(
            "change",
            () => {

                const call =
                    callInput.value
                        .trim()
                        .toUpperCase();

                if (call) {

                    lookupContestSpotCallsign(
                        call
                    );

                }

            }
        );

        /*
         * Dupe check when leaving the callsign field.
         */
        callInput.addEventListener(
            "blur",
            () => {
                checkContestDupe();
            }
        );

    }

    /*
     * Band change: re-check dupe for the new band.
     */
    if (bandInput) {
        bandInput.addEventListener(
            "change",
            () => checkContestDupe({ refresh: false })
        );
    }

    /*
     * ESC: reset entry for the next QSO.
     */
    document.addEventListener(
        "keydown",
        handleContestEscape
    );

    setupContestEnterToLog();
    setupContestBandSync();
    setupContestQueue();

}


/*
 * Initialize Contest QSO logger.
 */

document.addEventListener(
    "contestIdChanged",
    () => {
        loadContestRecentQsos();
    }
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupContestQsoLogger();
        loadContestRecentQsos();

    }
);
