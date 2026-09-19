const RGO_POLL_INTERVAL = 1000;

let rgoState = null;
let pollTimer = null;


async function fetchRgoState() {

    try {

        const response =
            await fetch("/api/radio", {
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const state =
            await response.json();


        if (
            state.activeRadioId !== "rgo-one"
        ) {

            setConnectionStatus(
                false,
                "RGO NOT ACTIVE"
            );

            return;

        }


        rgoState =
            state;


        updateRgoDisplay();


    } catch (error) {

        console.error(
            "RGO API error:",
            error
        );


        setConnectionStatus(
            false,
            "DISCONNECTED"
        );

    }

}


async function changeRgoBand(direction) {

    const control =
        direction === "up"
            ? "bandUp"
            : "bandDown";

    try {

        const response =
            await fetch(
                "/api/radio/vfo-control",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        control
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                `Band control failed: HTTP ${response.status}`
            );

        }

        await fetchRgoState();

    } catch (error) {

        console.error(
            "RGO band control:",
            error
        );

    }

}


function initBandControls() {

    const bandUp =
        document.getElementById(
            "rgo-band-up"
        );

    const bandDown =
        document.getElementById(
            "rgo-band-down"
        );

    if (bandUp) {

        bandUp.addEventListener(
            "click",
            () => changeRgoBand("up")
        );

    }

    if (bandDown) {

        bandDown.addEventListener(
            "click",
            () => changeRgoBand("down")
        );

    }

}


function getRgoBand(frequency) {

    const bands = [
        [160, 1800000, 2000000],
        [80, 3500000, 4000000],
        [60, 5300000, 5500000],
        [40, 7000000, 7300000],
        [30, 10100000, 10150000],
        [20, 14000000, 14350000],
        [17, 18068000, 18168000],
        [15, 21000000, 21450000],
        [12, 24890000, 24990000],
        [10, 28000000, 29700000],
        [6, 50000000, 54000000]
    ];

    const hz = Number(frequency);

    if (!Number.isFinite(hz)) {
        return null;
    }

    for (const [band, start, end] of bands) {

        if (hz >= start && hz <= end) {
            return String(band);
        }

    }

    return null;
}


function updateBandDisplay() {

    if (!rgoState) {
        return;
    }

    const activeBand =
        getRgoBand(
            rgoState.frequency
        );

    document
        .querySelectorAll(
            ".band-indicator"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.band === activeBand
            );

        });

}


function updateRitXitDisplay() {
    const slider =
        document.getElementById("rgo-rit-xit-slider");

    const value =
        document.getElementById("rgo-rit-xit-value");

    const modeButton =
        document.getElementById("rgo-rit-xit-mode");

    if (!slider || !value || !modeButton || !rgoState) {
        return;
    }

    const offset =
        Number(rgoState.ritXitOffset) || 0;

    slider.value =
        String(offset);

    if (document.activeElement !== value) {
        value.value =
            (offset / 1000).toFixed(2);
    }

    let mode = "OFF";

    if (
        rgoState.ritEnabled &&
        rgoState.xitEnabled
    ) {
        mode = "RIT + XIT";
    } else if (
        rgoState.ritEnabled
    ) {
        mode = "RIT";
    } else if (
        rgoState.xitEnabled
    ) {
        mode = "XIT";
    }

    modeButton.textContent = mode;

    modeButton.classList.toggle(
        "active",
        mode !== "OFF"
    );
}

function updateRgoDisplay() {
    updateRitXitDisplay();
    updateBandDisplay();

    if (!rgoState) {

        return;

    }


    setConnectionStatus(
        rgoState.connected === true,
        rgoState.connected
            ? "CONNECTED"
            : "DISCONNECTED"
    );


    updateFrequency();


    updateMode();


    updateVfo();


    updateMeter();


    updateControls();

}


function updateFrequency() {

    const element =
        document.querySelector(
            ".frequency-value"
        );


    if (!element) {

        return;

    }


    const frequency =
        Number(
            rgoState.frequency
        );


    if (
        !Number.isFinite(frequency)
    ) {

        return;

    }


    const mhz =
        (frequency / 1000000)
            .toFixed(6);


    const parts =
        mhz.split(".");


    element.textContent =
        `${parts[0]}.${parts[1]}`;

}


function updateMode() {

    const buttons =
        document.querySelectorAll(
            ".mode-selector button"
        );


    buttons.forEach(
        button => {

            const mode =
                button.textContent
                    .trim()
                    .toUpperCase();


            let active =
                mode ===
                String(
                    rgoState.mode
                ).toUpperCase();


            if (
                mode === "DIG"
                &&
                rgoState.mode === "DIGI"
            ) {

                active = true;

            }


            button.classList.toggle(
                "active",
                active
            );

        }
    );

}


function updateVfo() {

    const frequencyRows =
        document.querySelectorAll(
            ".vfo-frequency-row"
        );


    frequencyRows.forEach(
        row => {

            const label =
                row.querySelector("span");


            const value =
                row.querySelector("strong");


            if (!label || !value) {

                return;

            }


            const vfo =
                label.textContent
                    .trim()
                    .toUpperCase();


            const frequency =
                vfo === "A"
                    ? rgoState.frequency
                    : rgoState.frequencyB;


            if (
                !Number.isFinite(
                    Number(frequency)
                )
            ) {

                return;

            }


            value.textContent =
                formatFrequency(
                    Number(frequency)
                );

        }
    );


    const vfoButtons =
        document.querySelectorAll(
            ".vfo-selector button, .vfo-buttons button"
        );


    vfoButtons.forEach(
        button => {

            const text =
                button.textContent
                    .trim()
                    .toUpperCase();


            let active = false;


            if (
                text === "VFO A"
            ) {

                active =
                    Number(rgoState.rxVfo) === 0;

            }


            if (
                text === "VFO B"
            ) {

                active =
                    Number(rgoState.rxVfo) === 1;

            }


            if (
                text === "SPLIT"
            ) {

                active =
                    rgoState.split === true;

            }


            button.classList.toggle(
                "active",
                active
            );

        }
    );

}


function updateMeter() {

    const value =
        Number(
            rgoState.meterValue
        );


    const sValue =
        Number(
            rgoState.meterS
        );


    const meter =
        Number.isFinite(value)
            ? value
            : sValue;


    const segments =
        document.querySelectorAll(
            ".meter-segments span"
        );


    if (segments.length) {

        const level =
            Math.max(
                0,
                Math.min(
                    segments.length,
                    Math.round(
                        meter /
                        16 *
                        segments.length
                    )
                )
            );


        segments.forEach(
            (segment, index) => {

                segment.classList.toggle(
                    "active",
                    index < level
                );

            }
        );

    }


    const reading =
        document.querySelector(
            ".meter-reading strong"
        );


    if (reading) {

        reading.textContent =
            `S${Math.max(
                0,
                Math.min(
                    9,
                    Math.round(sValue)
                )
            )}`;

    }

}


function updateControls() {

    setSliderValue(
        "RF GAIN",
        rgoState.rfGain
    );


    setSliderValue(
        "MIC GAIN",
        rgoState.micGain
    );


    setFunctionState(
        "PREAMP",
        rgoState.preamp
    );


    setFunctionState(
        "ATT",
        rgoState.rgoAttenuator
    );


    setFunctionState(
        "NB",
        rgoState.rgoNoiseBlanker
    );


    updateAgc();


}


function setSliderValue(
    labelText,
    value
) {

    const rows =
        document.querySelectorAll(
            ".level-row"
        );


    rows.forEach(
        row => {

            const label =
                row.querySelector("label");


            if (
                !label
                ||
                label.textContent
                    .trim()
                    .toUpperCase()
                    !== labelText
            ) {

                return;

            }


            const input =
                row.querySelector(
                    "input[type='range']"
                );


            const output =
                row.querySelector(
                    "output"
                );


            if (input) {

                input.value =
                    String(value ?? 0);

            }


            if (output) {

                output.textContent =
                    String(value ?? 0);

            }

        }
    );

}


function setFunctionState(
    labelText,
    enabled
) {

    const items =
        document.querySelectorAll(
            ".function-item"
        );


    items.forEach(
        item => {

            const label =
                item.querySelector("span");


            if (
                !label
                ||
                label.textContent
                    .trim()
                    .toUpperCase()
                    !== labelText
            ) {

                return;

            }


            const button =
                item.querySelector(
                    "button"
                );


            if (!button) {

                return;

            }


            button.textContent =
                enabled
                    ? "ON"
                    : "OFF";


            button.classList.toggle(
                "active",
                enabled === true
            );

        }
    );

}


function updateAgc() {

    const item =
        document.querySelector(
            ".agc-item"
        );


    if (!item) {

        return;

    }


    const agc =
        String(
            rgoState.agc
        ).toUpperCase();


    item.querySelectorAll(
        "button"
    ).forEach(
        button => {

            button.classList.toggle(
                "active",
                button.textContent
                    .trim()
                    .toUpperCase()
                    === agc
            );

        }
    );

}


function formatFrequency(
    frequency
) {

    return (
        frequency / 1000
    ).toFixed(3)
        .replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
        );

}


function setConnectionStatus(
    connected,
    text
) {

    const status =
        document.querySelector(
            ".connection-status"
        );


    if (!status) {

        return;

    }


    const dot =
        status.querySelector(
            ".connection-dot"
        );


    status.classList.toggle(
        "disconnected",
        !connected
    );


    if (dot) {

        dot.style.background =
            connected
                ? ""
                : "#ff3030";

        dot.style.boxShadow =
            connected
                ? ""
                : "0 0 7px #ff3030, 0 0 17px rgba(255,48,48,0.55)";

    }


    const textElement =
        status.querySelector(
            ".connection-status-text"
        );


    if (textElement) {

        textElement.textContent =
            text;

    }

}


async function cycleRitXitMode() {

    if (!rgoState) {
        return;
    }

    let currentMode = 0;

    if (
        rgoState.ritEnabled &&
        rgoState.xitEnabled
    ) {
        currentMode = 3;
    } else if (
        rgoState.ritEnabled
    ) {
        currentMode = 1;
    } else if (
        rgoState.xitEnabled
    ) {
        currentMode = 2;
    }

    const nextMode =
        (currentMode + 1) % 4;

    try {

        const response =
            await fetch(
                "/api/radio/vfo-control",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        control: "ritXit",
                        value: nextMode
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                "RIT/XIT control failed"
            );
        }

        /*
         * The RGO sends the real state back
         * through the normal polling cycle.
         */

        await fetchRgoState();

    } catch (error) {

        console.error(
            "RIT/XIT:",
            error
        );

    }

}

async function setRitXitOffset(offset) {

    const value =
        Number(offset);

    if (
        !Number.isFinite(value) ||
        value < -5000 ||
        value > 5000
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/radio/vfo-control",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        control:
                            "ritXitOffset",
                        value:
                            Math.round(value / 10) * 10
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                "RIT/XIT offset control failed"
            );
        }

        /*
         * Read the real value back immediately.
         */

        await fetchRgoState();

    } catch (error) {

        console.error(
            "RIT/XIT offset:",
            error
        );

    }

}
function initRitXitControl() {

    const button =
        document.getElementById(
            "rgo-rit-xit-mode"
        );

    const slider =
        document.getElementById(
            "rgo-rit-xit-slider"
        );

    const value =
        document.getElementById(
            "rgo-rit-xit-value"
        );


    /*
     * RIT / XIT mode button
     */

    if (button) {

        button.addEventListener(
            "click",
            cycleRitXitMode
        );

    }


    /*
     * Coarse offset slider
     */

    if (slider) {

        slider.addEventListener(
            "change",
            async () => {

                await setRitXitOffset(
                    slider.value
                );

            }
        );

    }


    /*
     * Precise offset input
     */

    if (value) {

        const sendOffset = async () => {

            let kHz =
                Number(
                    String(value.value)
                        .replace(",", ".")
                );

            if (!Number.isFinite(kHz)) {
                return;
            }

            kHz =
                Math.max(
                    -5,
                    Math.min(5, kHz)
                );

            const hz =
                Math.round(
                    kHz * 100
                ) * 10;

            value.value =
                (hz / 1000).toFixed(2);

            await setRitXitOffset(hz);

            /*
             * Immediately read the real
             * value back from the RGO.
             */

            await fetchRgoState();

        };


        value.addEventListener(
            "change",
            sendOffset
        );


        value.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    sendOffset();

                    value.blur();

                }

            }
        );

    }

}


function startRgoPolling() {

    fetchRgoState();


    if (pollTimer) {

        clearInterval(
            pollTimer
        );

    }


    pollTimer =
        setInterval(
            fetchRgoState,
            RGO_POLL_INTERVAL
        );

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        initRitXitControl();
        initBandControls();
        startRgoPolling();

    }
);
