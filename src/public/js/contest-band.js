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
 * Load live spots.
 */
async function loadContestSpots() {

    try {

        const response =
            await fetch("/api/spots");

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const spots =
            await response.json();

        contestSpots =
            Array.isArray(spots)
                ? spots
                : [];

        renderContestBand();

    }
    catch (error) {

        console.error(
            "Contest band spots failed:",
            error
        );

    }

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
    const minimumGap = 18;


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

                <span class="spot-dot spot-new"></span>

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


            item.title =
                `${spot.call} · ` +
                `${spot.frequency} kHz · ` +
                `${spot.mode || ""}`;


item.addEventListener(
    "click",
    () => {

        const call =
            document.getElementById(
                "contest-call"
            );

        const frequency =
            document.getElementById(
                "contest-frequency"
            );

        const mode =
            document.getElementById(
                "contest-mode"
            );

        const band =
            document.getElementById(
                "contest-band"
            );


        if (call) {
            call.value =
                spot.call || "";
        }


lookupContestSpotCallsign(
    spot.call || ""
);

                if (frequency) {

            const spotFrequency =
                Number(
                    spot.frequency
                );

            frequency.textContent =
                Number.isFinite(
                    spotFrequency
                )
                    ? spotFrequency.toFixed(3)
                    : "—";
        }


        if (mode) {
            mode.textContent =
                spot.mode || "—";
        }


        if (band) {
            band.textContent =
                spot.band || "—";
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



function initContestBandViewer() {

    setupContestBandSelector();





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

    const bands = [
        "160",
        "80",
        "40",
        "20",
        "15",
        "10"
    ];

    const counts = {};
    const points = {};

    bands.forEach(band => {
        counts[band] = 0;
        points[band] = 0;
    });

    const contestId =
        String(window.contestId || "999").trim();

    qsos
        .filter(qso =>
            String(qso.contest_id ?? "").trim() === contestId
        )
        .forEach(qso => {

            const band =
                String(qso.band || "")
                    .toLowerCase()
                    .replace("m", "")
                    .trim();

            if (!(band in counts)) {
                return;
            }

            counts[band]++;

            /*
             * Points are not implemented yet.
             */
            points[band] += Number(qso.points) || 0;
        });

    let totalQsos = 0;
    let totalPoints = 0;

    bands.forEach(band => {

        const qsoElement =
            document.getElementById(
                `contest-band-qso-${band}`
            );

        const pointsElement =
            document.getElementById(
                `contest-band-points-${band}`
            );

        if (qsoElement) {
            qsoElement.textContent =
                counts[band];
        }

        if (pointsElement) {
            pointsElement.textContent =
                points[band];
        }

        totalQsos += counts[band];
        totalPoints += points[band];
    });

    const totalQsoElement =
        document.getElementById(
            "contest-band-qso-total"
        );

    const totalPointsElement =
        document.getElementById(
            "contest-band-points-total"
        );

    if (totalQsoElement) {
        totalQsoElement.textContent =
            totalQsos;
    }

    if (totalPointsElement) {
        totalPointsElement.textContent =
            totalPoints;
    }
}


async function loadContestRecentQsos() {

    const body =
        document.getElementById(
            "contest-qso-body"
        );

    if (!body) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/qso?_=" +
                Date.now(),
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

/*
 * Active contest session is required.
 *
 * The contest_id stored in the QSO is the
 * contest SESSION id, not the definition id.
 */


        const qsos =
            Array.isArray(data.qsos)
                ? data.qsos
                : [];


        updateContestBandStatistics(qsos);

        const contestQsos =
            qsos
                .filter(
                    qso =>
                        qso.contest_id !== null &&
                        qso.contest_id !== undefined &&
                        String(
                            qso.contest_id
                        ).trim() !== ""
                )
                .sort(
                    (a, b) => {

                        const aTime =
                            `${a.qso_date || ""} ${a.time_on_utc || ""}`;

                        const bTime =
                            `${b.qso_date || ""} ${b.time_on_utc || ""}`;

                        return bTime.localeCompare(
                            aTime
                        );

                    }
                )
                .slice(0, 10);


        if (!contestQsos.length) {

            body.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="contest-empty"
                    >
                        No contest QSOs
                    </td>
                </tr>
            `;

            return;
        }


        body.innerHTML =
            contestQsos
                .map(
                    qso => {

                        const notes =
                            String(
                                qso.notes || ""
                            );

                        let exchange = "";

                        const received =
                            notes.match(
                                /Contest Exchange Received:\s*([^\n;]+)/i
                            );

                        const sent =
                            notes.match(
                                /Contest Exchange Sent:\s*([^\n;]+)/i
                            );

                        if (received) {

                            exchange =
                                received[1].trim();

                        }
                        else if (sent) {

                            exchange =
                                sent[1].trim();

                        }


                        /*
                         * Points are not stored in the
                         * normal QSO schema yet.
                         */
                        const points = "—";


                        return `
                            <tr>

                                <td>
                                    ${escapeContestHtml(
                                        qso.time_on_utc || ""
                                    )}
                                </td>

                                <td>
                                    ${escapeContestHtml(
                                        qso.call || ""
                                    )}
                                </td>

                                <td>
                                    ${escapeContestHtml(
                                        qso.band || ""
                                    )}
                                </td>

                                <td>
                                    ${escapeContestHtml(
                                        qso.mode || ""
                                    )}
                                </td>

                                <td>
                                    ${escapeContestHtml(
                                        qso.rst_sent || ""
                                    )}/${escapeContestHtml(
                                        qso.rst_rcvd || ""
                                    )}
                                </td>

                                <td>
                                    ${escapeContestHtml(
                                        exchange
                                    )}
                                </td>

                                <td>
                                    ${escapeContestHtml(
                                        points
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");

    }
    catch (error) {

        console.error(
            "Contest recent QSOs:",
            error
        );

    }

}

async function logContestQso() {

    const call =
        document.getElementById(
            "contest-call"
        )?.value
        .trim()
        .toUpperCase();

    if (!call) {

        alert(
            "Please enter a callsign."
        );

        return;
    }


    const name =
        document.getElementById(
            "contest-name"
        )?.value
        .trim() || "";


    const locator =
        document.getElementById(
            "contest-locator"
        )?.value
        .trim()
        .toUpperCase() || "";


    const rstSent =
        document.getElementById(
            "contest-rst-sent"
        )?.value
        .trim() || "599";


    const rstReceived =
        document.getElementById(
            "contest-rst-received"
        )?.value
        .trim() || "599";


    const exchangeSent =
        document.getElementById(
            "contest-exchange-sent"
        )?.value
        .trim() || "";


    const exchangeReceived =
        document.getElementById(
            "contest-exchange-received"
        )?.value
        .trim() || "";


    const frequencyText =
        document.getElementById(
            "contest-frequency"
        )?.textContent
        .trim() || "";


    const mode =
        document.getElementById(
            "contest-mode"
        )?.textContent
        .trim() || "";


    const band =
        document.getElementById(
            "contest-band"
        )?.textContent
        .trim() || "";


    /*
     * Frequency shown by the Contest Console
     * is in kHz.
     */
    const frequency =
        Number(
            frequencyText
        );


    if (!Number.isFinite(frequency)) {

        alert(
            "Invalid frequency."
        );

        return;
    }


    if (!band || band === "—") {

        alert(
            "No band available."
        );

        return;
    }


    if (!mode || mode === "—") {

        alert(
            "No mode available."
        );

        return;
    }


    /*
     * Load station configuration.
     */
    let stationConfig = {};

    try {

        const response =
            await fetch(
                "/api/station?_=" +
                Date.now(),
                {
                    cache: "no-store"
                }
            );


        if (response.ok) {

            stationConfig =
                await response.json();

        }

    }
    catch (error) {

        console.error(
            "Contest station lookup failed:",
            error
        );

    }


    if (!stationConfig.callsign) {

        alert(
            "Station callsign is not configured."
        );

        return;
    }


    if (!stationConfig.locator) {

        alert(
            "Station grid is not configured."
        );

        return;
    }


    /*
     * UTC timestamp.
     */
    const now =
        new Date();


    const qsoDate =
        now.toISOString()
            .slice(0, 10);


    const timeUtc =
        now.toISOString()
            .slice(11, 19);


    /*
     * Exchange information goes into notes
     * until the normal QSO schema gets
     * dedicated exchange fields.
     */
    const exchangeParts = [];


    if (exchangeSent) {

        exchangeParts.push(
            `Contest Exchange Sent: ${exchangeSent}`
        );

    }


    if (exchangeReceived) {

        exchangeParts.push(
            `Contest Exchange Received: ${exchangeReceived}`
        );

    }


console.log(
    "Contest QSO QRZ data:",
    {
        call,
        name,
        locator,
        contestQrzCountry
    }
);


    const qso = {

        qso_date:
            qsoDate,

        time_on_utc:
            timeUtc,

        time_off_utc:
            timeUtc,

        call:

            call,

        frequency:

            frequency,

        band:

            band,

        mode:

            mode.toUpperCase(),

        rst_sent:

            rstSent,

        rst_rcvd:

            rstReceived,

        my_callsign:

            String(
                stationConfig.callsign
            )
            .trim()
            .toUpperCase(),

        my_grid:

            String(
                stationConfig.locator
            )
            .trim()
            .toUpperCase(),

        operator_name:

            String(
                stationConfig.operator_name ||
                stationConfig.name ||
                ""
            )
            .trim(),

        name:

            name || null,

        dx_grid:

            locator || null,

country:
    contestQrzCountry || null,


        notes:

            exchangeParts.length
                ? exchangeParts.join(
                    " | "
                )
                : null,

        contest_id:

    	window.contestId ||
		"999"
    

    };


    try {

        const response =
            await fetch(
                "/api/qso",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(qso)
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );

        }


        console.log(
            "Contest QSO logged:",
            data.qso
        );

await loadContestRecentQsos();

        /*
         * Prepare next QSO.
         */
        document.getElementById(
            "contest-call"
        ).value = "";

        document.getElementById(
            "contest-name"
        ).value = "";

        document.getElementById(
            "contest-locator"
        ).value = "";

        document.getElementById(
            "contest-exchange-received"
        ).value = "";


        document.getElementById(
            "contest-call"
        ).focus();


    }
    catch (error) {

        console.error(
            "Contest QSO:",
            error
        );


        alert(
            "Could not save QSO:\n\n" +
            error.message
        );

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


    button.addEventListener(
        "click",
        logContestQso
    );

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

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupContestQsoLogger();
        loadContestRecentQsos();

    }
);
