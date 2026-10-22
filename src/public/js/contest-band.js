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
        return;
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

            return;

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

async function loadContestWorkedStatus() {

    if (!getContestSessionId()) {
        contestWorkedByBand = new Map();
        return;
    }

    try {
        const qsos = await fetchContestSessionQsos();
        if (qsos) applyContestWorkedStatus(qsos);
    }
    catch (error) {
        console.error("Contest band worked-status loading failed:", error);
    }

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

    try {
        const qsos = await fetchContestSessionQsos();
        if (!qsos) return;

        applyContestWorkedStatus(qsos);
        updateContestBandStatistics(qsos);
        renderContestRecentQsos(qsos);
    }
    catch (error) {
        console.error("Contest session refresh failed:", error);
    }

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
         * Spot frequency is in kHz.
         */

        if (frequency) {

            const spotFrequency =
                Number(
                    spot.frequency
                );

            frequency.value =
                Number.isFinite(
                    spotFrequency
                )
                    ? spotFrequency.toFixed(3)
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

   loadContestRadio();

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
                <td colspan="7" class="contest-empty">
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
                <td colspan="7" class="contest-empty">
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

                return `
                    <tr>
                        <td>${escapeContestHtml(qso.time_on_utc || "")}</td>
                        <td>${escapeContestHtml(qso.call || "")}</td>
                        <td>${escapeContestHtml(qso.band || "")}</td>
                        <td>${escapeContestHtml(
                            Number.isFinite(frequency) ? frequency.toFixed(3) : ""
                        )}</td>
                        <td>${escapeContestHtml(qso.mode || "")}</td>
                        <td>${escapeContestHtml(qso.rst_sent || "")}/${escapeContestHtml(qso.rst_rcvd || "")}</td>
                        <td>${escapeContestHtml(qso.exchange_received || "")}</td>
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

    try {

        const qsos =
            await fetchContestSessionQsos();

        if (!qsos) {
            return;
        }

        applyContestWorkedStatus(qsos);
        updateContestBandStatistics(qsos);
        updateContestSerialNumber(qsos);
        updateContestExchangeSent();
        renderContestRecentQsos(qsos);

    }
    catch (error) {

        console.error(
            "Contest recent QSOs:",
            error
        );

    }

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


/*
 * Dupe confirmation without popup: the first LOG on a dupe shows a
 * warning, a second LOG for the same call/band logs it anyway.
 */
let contestDupeConfirmKey = "";

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
         */
        const dupeKey = `${call}|${band}`;

        if (await checkContestDupe()) {

            if (contestDupeConfirmKey !== dupeKey) {

                contestDupeConfirmKey = dupeKey;

                showContestEntryMessage(
                    `${call} is a DUPE on ${band}m. ` +
                    "Press LOG QSO again to log anyway, ESC to cancel.",
                    "warn"
                );

                return;
            }

        }

        contestDupeConfirmKey = "";


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


        const response =
            await fetch(
                `/api/contests/session/${window.contestSessionId}/qso`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(qso)
                }
            );

        let data = {};

        try {
            data = await response.json();
        }
        catch {
            // Non-JSON error body: fall back to HTTP status below.
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );
        }


        // Fresh data after our own insert.
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

        showContestEntryMessage(
            `${call} logged on ${band}m.`,
            "success"
        );

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

    const preset = CONTEST_FREQUENCY_PRESETS[String(bandInput.value || "")];
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
    contestDupeConfirmKey = "";

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
                contestDupeConfirmKey = "";

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
