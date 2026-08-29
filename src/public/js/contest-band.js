const CONTEST_BAND_REFRESH = 10000;

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

renderContestFrequencyScale(band);


    container.innerHTML = "";

    const visibleSpots =
        contestSpots
            .filter(
                spot =>
                    spot.band === contestBand
            );


    /*
     * Prevent duplicate
     * call/frequency entries.
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


    unique.forEach(
        spot => {

            const position =
                (
                    (band.max - spot.frequency)
                    /
                    (band.max - band.min)
                )
                * 100;


            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "contest-band-spot";


            item.style.top =
                `${position}%`;


            item.innerHTML = `

                <span class="spot-dot spot-new"></span>

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

            `;


            item.title =
                `${spot.call} · ` +
                `${spot.frequency} kHz · ` +
                `${spot.mode || ""}`;


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


    /*
     * Target roughly 6-10
     * frequency lines.
     */
    const rawStep =
        range / 8;


    const niceSteps = [
        0.0005,
        0.001,
        0.0025,
        0.005,
        0.010,
        0.025,
        0.050,
        0.100,
        0.250,
        0.500,
        1.000,
        2.500,
        5.000
    ];


    let step =
        niceSteps[
            niceSteps.length - 1
        ];


    for (
        const candidate
        of niceSteps
    ) {

        if (
            candidate >= rawStep
        ) {

            step =
                candidate;

            break;

        }

    }


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
function initContestBandViewer() {

    setupContestBandSelector();

    /*
     * Initial rendering.
     */
    renderContestBand();

    /*
     * Initial spot load.
     */
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
