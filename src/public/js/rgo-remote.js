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
        updateSdrBandScale();


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

    const activeFrequency =
        Number(rgoState.rxVfo) === 1
            ? Number(rgoState.frequencyB)
            : Number(rgoState.frequency);

    const activeBand =
        getRgoBand(
            activeFrequency
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

    updateVfo();

    updateMode();

    updateControls();

    updateMeter();

    updateRgoExtras();


    const breakInDelaySlider =
        document.getElementById("rgo-break-in-delay-slider");

    const breakInDelayValue =
        document.getElementById("rgo-break-in-delay-value");

    if (
        breakInDelaySlider &&
        !rgoEditing(breakInDelaySlider) &&
        breakInDelayValue &&
        Number.isFinite(Number(rgoState.breakInDelay))
    ) {
        breakInDelaySlider.value =
            String(rgoState.breakInDelay);

        breakInDelayValue.textContent =
            String(rgoState.breakInDelay);
    }



    const cwSpeedSlider =
        document.getElementById("rgo-cw-speed-slider");

    const cwSpeedValue =
        document.getElementById("rgo-cw-speed-value");

    if (
        cwSpeedSlider &&
        !rgoEditing(cwSpeedSlider) &&
        cwSpeedValue &&
        Number.isFinite(Number(rgoState.cwSpeed))
    ) {
        cwSpeedSlider.value =
            String(rgoState.cwSpeed);

        cwSpeedValue.textContent =
            String(rgoState.cwSpeed);
    }



    const powerSlider =
        document.getElementById("rgo-power-slider");

    const powerValue =
        document.getElementById("rgo-power-value");

    if (
        powerSlider &&
        !rgoEditing(powerSlider) &&
        powerValue &&
        Number.isFinite(Number(rgoState.power))
    ) {
        powerSlider.value =
            String(rgoState.power);

        powerValue.textContent =
            `${rgoState.power} W`;
    }
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
        Number(rgoState.rxVfo) === 1
            ? Number(rgoState.frequencyB)
            : Number(rgoState.frequency);


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





async function selectRgoMode(mode) {

    if (!rgoState) {
        return;
    }

    const normalizedMode =
        String(mode).toUpperCase();

    console.log(
        "RGO MODE SELECT:",
        normalizedMode
    );

    try {

        const response =
            await fetch(
                "/api/radio/mode",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        mode: normalizedMode
                    })
                }
            );

        const body =
            await response.text();

        console.log(
            "RGO MODE RESPONSE:",
            "HTTP",
            response.status,
            "OK",
            response.ok,
            body
        );

        if (!response.ok) {
            throw new Error(
                `Mode selection failed: HTTP ${response.status}`
            );
        }

        await fetchRgoState();

        updateMode();

    } catch (error) {

        console.error(
            "RGO MODE:",
            error
        );

    }
}


async function selectRgoVfo(vfo) {
    const value = vfo === "B" ? 1 : 0;

    console.log("RGO VFO SELECT:", vfo, "-> rxVfo", value);

    try {
        const response = await fetch("/api/radio/vfo-control", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                control: "rxVfo",
                value
            })
        });

        const body = await response.text();

        console.log(
            "RGO VFO RESPONSE:",
            "HTTP", response.status,
            "OK", response.ok,
            body
        );

        if (!response.ok) {
            throw new Error(`VFO selection failed: HTTP ${response.status}`);
        }

        await fetchRgoState();

        // Keep the selected VFO visible immediately.
        if (rgoState) {
            rgoState.rxVfo = value;
            updateVfo();
            return;
        }

        const buttonA = document.getElementById("rgo-vfo-a");
        const buttonB = document.getElementById("rgo-vfo-b");
        const label = document.getElementById("rgo-vfo-frequency-label");
        const input = document.getElementById("rgo-vfo-frequency");

        if (buttonA) {
            buttonA.classList.toggle("active", vfo === "A");
        }

        if (buttonB) {
            buttonB.classList.toggle("active", vfo === "B");
        }

        if (label) {
            label.textContent = vfo;
        }

        if (input && rgoState) {
            const frequency =
                vfo === "B"
                    ? Number(rgoState.frequencyB)
                    : Number(rgoState.frequency);

            if (Number.isFinite(frequency)) {
                input.value = formatFrequency(frequency);
            }
        }

    } catch (error) {
        console.error("RGO VFO selection:", error);
    }
}



async function toggleRgoSplit() {

    if (!rgoState) {
        return;
    }

    const enabled =
        rgoState.split !== true;

    try {

        const response =
            await fetch(
                "/api/radio/split",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        enabled
                    })
                }
            );

        if (!response.ok) {
            throw new Error(
                `SPLIT failed: HTTP ${response.status}`
            );
        }

        await fetchRgoState();

    } catch (error) {

        console.error(
            "RGO SPLIT:",
            error
        );

    }

}

















let selectedMeter =
    "S";
























function initMeterSelector() {

    const buttons =
        document.querySelectorAll(
            ".meter-select button"
        );

    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    buttons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );

                    button.classList.add(
                        "active"
                    );

                    selectedMeter =
                        button.dataset.meter ||
                        "S";

                    // PWR / ALC / SWR / COMP: the radio measures one at a time (RM)
                    if (selectedMeter !== "S") {
                        rgoControl("meter", selectedMeter);
                    }

                    if (rgoState) {
                        updateMeter();
                    }

                }
            );

        }
    );

}


function updateMeter() {

    const sValue =
        Number(
            rgoState.meterS
        );

    /* RM: one meter function at a time, 0 PWR, 1 ALC, 2 SWR, 3 COMP */
    const rm = code =>
        Number(rgoState.meterFunction) === code
            ? Number(rgoState.meterValue)
            : 0;

    const powerValue = rm(0);
    const alcValue = rm(1);
    const swrValue = rm(2);
    const compValue = rm(3);


    let meter = 0;

    switch (selectedMeter) {

        case "PWR":
            meter = powerValue;
            break;

        case "ALC":
            meter = alcValue;
            break;

        case "SWR":
            meter = swrValue;
            break;

        case "COMP":
            meter = compValue;
            break;

        case "S":
        default:
            meter = sValue;
            break;

    }


    if (!Number.isFinite(meter)) {
        meter = 0;
    }


    const segments =
        document.querySelectorAll(
            ".meter-segments span"
        );


    if (segments.length) {

        const level =
            Math.max(
                0,
                Math.min(
                    15,
                    Math.round(meter)
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
        if (selectedMeter === "S") {
            /* SM 0-15: 0-9 S units, above S9 about +10 dB per step */
            const level = Math.max(0, Math.min(15, Math.round(sValue || 0)));
            reading.textContent = level <= 9 ? `S${level}` : `S9+${(level - 9) * 10}`;
        }
        else {
            reading.textContent = `${Math.round(meter)}/15`;
        }
    }

    const meterLabel = document.getElementById("rgo-meter-label");

    if (meterLabel) {
        meterLabel.textContent = {
            S: "S-METER", PWR: "RF POWER", ALC: "ALC", SWR: "SWR", COMP: "COMPRESSION"
        }[selectedMeter] || "";
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


            if (input && rgoEditing(input)) {
                return;
            }

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


function initRgoCwSpeedControl() {

    const slider =
        document.getElementById(
            "rgo-cw-speed-slider"
        );

    const value =
        document.getElementById(
            "rgo-cw-speed-value"
        );

    if (!slider || !value) {
        return;
    }


    slider.addEventListener(
        "input",
        () => {

            value.textContent =
                String(slider.value);

        }
    );


    slider.addEventListener(
        "change",
        async () => {

            const speed =
                Number(slider.value);

            if (
                !Number.isFinite(speed) ||
                speed < 4 ||
                speed > 60
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
                                control: "cwSpeed",
                                value: speed
                            })
                        }
                    );


                if (!response.ok) {
                    throw new Error(
                        "CW SPEED control failed"
                    );
                }


                await fetchRgoState();

            } catch (error) {

                console.error(
                    "RGO CW SPEED:",
                    error
                );

            }

        }
    );

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



/* =========================================================
   RGO SDR / WATERFALL
   Uses the existing SHACK-SERVER /sdr WebSocket.
   ========================================================= */

(() => {

    let sdrSocket = null;

/* SDR waterfall: tab hidden for 60 s -> the RSP1B may stop (it takes a
   whole CPU core on the server); visible again -> start it again */
(() => {
    let hiddenTimer = null;
    let paused = false;
    const send = type => {
        try {
            if (sdrSocket && sdrSocket.readyState === WebSocket.OPEN) sdrSocket.send(JSON.stringify({ type }));
        } catch (_) { /* not connected */ }
    };
    document.addEventListener("visibilitychange", () => {
        clearTimeout(hiddenTimer);
        if (document.hidden) {
            hiddenTimer = setTimeout(() => { send("sdr_stop"); paused = true; }, 60000);
        } else if (paused) {
            paused = false;
            send("sdr_start");
        }
    });
})();
    let sdrFrames = 0;

    const spectrumCanvas =
        document.getElementById("rgo-sdr-spectrum");

    const spectrumContext =
        spectrumCanvas
            ? spectrumCanvas.getContext("2d")
            : null;

    const waterfallCanvas =
        document.getElementById("rgo-sdr-waterfall");

    const waterfallContext =
        waterfallCanvas
            ? waterfallCanvas.getContext("2d")
            : null;

    const sdrFrequency =
        document.getElementById("rgo-sdr-frequency");

    const vfoMarker =
        document.getElementById("rgo-sdr-vfo-marker");


    function resizeCanvas(canvas, context) {

        if (!canvas || !context) {
            return;
        }

        const parent = canvas.parentElement;

        if (!parent) {
            return;
        }

        const width =
            Math.max(
                1,
                Math.floor(parent.clientWidth)
            );

        const height =
            Math.max(
                1,
                Math.floor(parent.clientHeight)
            );

        canvas.width = width;
        canvas.height = height;

        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";

        context.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );

        context.clearRect(
            0,
            0,
            width,
            height
        );
    }


    function resizeSdr() {

        resizeCanvas(
            spectrumCanvas,
            spectrumContext
        );

        resizeCanvas(
            waterfallCanvas,
            waterfallContext
        );
    }


    /*
     * SDR band selection.
     *
     * The RSP1B still delivers the complete 2 MHz FFT.
     * The displayed range follows the current RGO band
     * from BANDPLAN_DATA.
     */

    const SDR_SAMPLE_RATE = 2000000;


    function getCurrentSdrBand() {

        const frequency =
            Number(
                rgoState?.frequency
            );

        if (
            !Number.isFinite(frequency) ||
            typeof BANDPLAN_DATA === "undefined"
        ) {
            return null;
        }

        const frequencyMHz =
            frequency / 1000000;

        return BANDPLAN_DATA.find(
            band =>
                frequencyMHz >= band.min &&
                frequencyMHz <= band.max
        ) || null;
    }


    function updateSdrBandScale() {

        const startElement =
            document.getElementById("rgo-sdr-scale-start");

        const boundaryElement =
            document.getElementById("rgo-sdr-scale-boundary");

        const endElement =
            document.getElementById("rgo-sdr-scale-end");

        if (
            !startElement ||
            !boundaryElement ||
            !endElement
        ) {
            return;
        }

        const range =
            getSdrBandRange();

        startElement.textContent =
            `${(range.start / 1000000).toFixed(3)} MHz`;

        const band =
            getCurrentSdrBand();

        if (
            band &&
            Array.isArray(band.segments) &&
            band.segments.length > 1
        ) {

            const boundary =
                band.segments[1].start;

            boundaryElement.textContent =
                `${boundary.toFixed(3)} MHz`;

        } else {

            boundaryElement.textContent =
                "--.--- MHz";
        }

        endElement.textContent =
            `${(range.end / 1000000).toFixed(3)} MHz`;
    }


    window.updateSdrBandScale =
        updateSdrBandScale;


    function getSdrBandRange() {

        const band =
            getCurrentSdrBand();

        if (!band) {
            return {
                start: 14000000,
                end: 14350000,
                center: 14175000
            };
        }

        const start =
            band.min * 1000000;

        const end =
            band.max * 1000000;

        return {
            start,
            end,
            center: (start + end) / 2
        };
    }


    function getBandBins(bins) {

        const range =
            getSdrBandRange();

        const fftStartFrequency =
            range.center -
            (SDR_SAMPLE_RATE / 2);

        const startBin =
            Math.max(
                0,
                Math.floor(
                    (
                        range.start -
                        fftStartFrequency
                    ) /
                    SDR_SAMPLE_RATE *
                    bins
                )
            );

        const endBin =
            Math.min(
                bins - 1,
                Math.ceil(
                    (
                        range.end -
                        fftStartFrequency
                    ) /
                    SDR_SAMPLE_RATE *
                    bins
                )
            );

        return {
            startBin,
            endBin
        };
    }


    const SPECTRUM_AVERAGE_FRAMES = 2;
    const SPECTRUM_SMOOTHING = 0.18;

    let spectrumHistory = [];


    function drawSpectrum(data) {

        if (!spectrumCanvas || !spectrumContext) {
            return;
        }

        const bins =
            data.getUint16(0, true);

        if (!bins) {
            return;
        }

        const currentFrame =
            new Float32Array(bins);

        for (let i = 0; i < bins; i++) {

            currentFrame[i] =
                data.getFloat32(
                    2 + (i * 4),
                    true
                );
        }

        spectrumHistory.push(currentFrame);

        if (
            spectrumHistory.length >
            SPECTRUM_AVERAGE_FRAMES
        ) {
            spectrumHistory.shift();
        }


        const averagedFrame =
            new Float32Array(bins);

        for (let i = 0; i < bins; i++) {

            let sum = 0;
            let count = 0;

            for (const frame of spectrumHistory) {

                const value = frame[i];

                if (Number.isFinite(value)) {
                    sum += value;
                    count++;
                }
            }

            averagedFrame[i] =
                count > 0
                    ? sum / count
                    : -120;
        }


        if (
            !window.__rgoSpectrumDisplayFrame ||
            window.__rgoSpectrumDisplayFrame.length !== bins
        ) {
            window.__rgoSpectrumDisplayFrame =
                new Float32Array(averagedFrame);

        } else {

            const displayFrame =
                window.__rgoSpectrumDisplayFrame;

            for (let i = 0; i < bins; i++) {

                displayFrame[i] +=
                    (
                        averagedFrame[i] -
                        displayFrame[i]
                    ) *
                    SPECTRUM_SMOOTHING;
            }
        }


        const displayFrame =
            window.__rgoSpectrumDisplayFrame;

        const rect =
            spectrumCanvas.getBoundingClientRect();

        const width =
            Math.max(
                1,
                Math.floor(rect.width)
            );

        const height =
            Math.max(
                1,
                Math.floor(rect.height)
            );


        const floorDb = -120;
        const ceilingDb = -40;
        const rangeDb = ceilingDb - floorDb;

        const {
            startBin,
            endBin
        } = getBandBins(bins);


        spectrumContext.clearRect(
            0,
            0,
            width,
            height
        );


        /*
         * Subtle reference grid.
         */

        spectrumContext.lineWidth = 1;
        spectrumContext.strokeStyle =
            "rgba(255,255,255,0.06)";

        for (
            let db = -120;
            db <= -40;
            db += 20
        ) {

            const y =
                height -
                5 -
                (
                    (db - floorDb) /
                    rangeDb
                ) *
                (height - 10);

            spectrumContext.beginPath();
            spectrumContext.moveTo(0, y);
            spectrumContext.lineTo(width, y);
            spectrumContext.stroke();
        }


        /*
         * Build filled spectrum.
         */

        spectrumContext.beginPath();

        for (let x = 0; x < width; x++) {

            const bin =
                Math.min(
                    endBin,
                    startBin +
                    Math.floor(
                        x *
                        (endBin - startBin) /
                        width
                    )
                );

            const db =
                displayFrame[bin];

            let level =
                (
                    db - floorDb
                ) /
                rangeDb;

            level =
                Math.max(
                    0,
                    Math.min(1, level)
                );

            const y =
                height -
                5 -
                level *
                (height - 10);

            if (x === 0) {
                spectrumContext.moveTo(x, y);
            } else {
                spectrumContext.lineTo(x, y);
            }
        }


        spectrumContext.lineTo(
            width,
            height - 5
        );

        spectrumContext.lineTo(
            0,
            height - 5
        );

        spectrumContext.closePath();

        spectrumContext.fillStyle =
            "rgba(75, 75, 75, 0.48)";

        spectrumContext.fill();


        /*
         * Orange spectrum trace.
         */

        spectrumContext.beginPath();

        for (let x = 0; x < width; x++) {

            const bin =
                Math.min(
                    endBin,
                    startBin +
                    Math.floor(
                        x *
                        (endBin - startBin) /
                        width
                    )
                );

            const db =
                displayFrame[bin];

            let level =
                (
                    db - floorDb
                ) /
                rangeDb;

            level =
                Math.max(
                    0,
                    Math.min(1, level)
                );

            const y =
                height -
                5 -
                level *
                (height - 10);

            if (x === 0) {
                spectrumContext.moveTo(x, y);
            } else {
                spectrumContext.lineTo(x, y);
            }
        }

        spectrumContext.strokeStyle =
            "#ff8a18";

        spectrumContext.lineWidth = 1.2;

        spectrumContext.stroke();


        /*
         * Bandplan segment boundaries.
         *
         * Only thin vertical lines are drawn.
         * No filled regions or labels.
         */

        const currentBand =
            getCurrentSdrBand();

        if (
            currentBand &&
            Array.isArray(currentBand.segments)
        ) {

            const bandRange =
                getSdrBandRange();

            const bandWidth =
                bandRange.end -
                bandRange.start;

            spectrumContext.save();

            spectrumContext.strokeStyle =
                "rgba(255, 138, 24, 0.38)";

            spectrumContext.lineWidth = 1;

            if (currentBand.segments.length > 1) {

                const boundary =
                    currentBand.segments[1].start *
                    1000000;

                if (
                    boundary > bandRange.start &&
                    boundary < bandRange.end
                ) {

                    const x =
                        (
                            (boundary - bandRange.start) /
                            bandWidth
                        ) *
                        width;

                    spectrumContext.beginPath();
                    spectrumContext.moveTo(
                        Math.round(x) + 0.5,
                        0
                    );
                    spectrumContext.lineTo(
                        Math.round(x) + 0.5,
                        height
                    );
                    spectrumContext.stroke();
                }
            }

            spectrumContext.restore();
        }


        /*
         * Bottom reference line.
         */

        spectrumContext.beginPath();

        spectrumContext.moveTo(
            0,
            height - 5
        );

        spectrumContext.lineTo(
            width,
            height - 5
        );

        spectrumContext.strokeStyle =
            "rgba(255,255,255,0.12)";

        spectrumContext.lineWidth = 1;

        spectrumContext.stroke();
    }


    function waterfallColor(level) {

        /*
         * Dark anthracite -> orange -> red -> pale orange.
         */

        let r;
        let g;
        let b;

        if (level < 0.25) {

            const t = level / 0.25;

            r = Math.round(18 + 45 * t);
            g = Math.round(18 + 18 * t);
            b = Math.round(20 + 8 * t);

        } else if (level < 0.50) {

            const t =
                (level - 0.25) / 0.25;

            r = Math.round(63 + 100 * t);
            g = Math.round(36 + 18 * t);
            b = Math.round(28 - 10 * t);

        } else if (level < 0.75) {

            const t =
                (level - 0.50) / 0.25;

            r = Math.round(163 + 70 * t);
            g = Math.round(54 + 35 * t);
            b = Math.round(18 - 8 * t);

        } else {

            const t =
                (level - 0.75) / 0.25;

            r = 233;
            g = Math.round(89 + 130 * t);
            b = Math.round(10 + 70 * t);
        }

        return [r, g, b];
    }


    function drawWaterfall(data) {

        if (!waterfallCanvas || !waterfallContext) {
            return;
        }

        const bins =
            data.getUint16(0, true);

        const rect =
            waterfallCanvas.getBoundingClientRect();

        const width =
            Math.max(
                1,
                Math.floor(rect.width)
            );

        const height =
            Math.max(
                1,
                Math.floor(rect.height)
            );

        /*
         * Shift previous waterfall down one pixel.
         */

        if (height > 1) {

            const previous =
                waterfallContext.getImageData(
                    0,
                    0,
                    width,
                    height - 1
                );

            waterfallContext.putImageData(
                previous,
                0,
                1
            );
        }


        let maxDb = -Infinity;

        for (let i = 0; i < bins; i++) {

            const db =
                data.getFloat32(
                    2 + (i * 4),
                    true
                );

            if (Number.isFinite(db)) {
                maxDb =
                    Math.max(
                        maxDb,
                        db
                    );
            }
        }

        if (!Number.isFinite(maxDb)) {
            return;
        }


        const floor =
            Math.max(
                -120,
                maxDb - 65
            );

        const range =
            Math.max(
                1,
                maxDb - floor
            );


        const image =
            waterfallContext.createImageData(
                width,
                1
            );


        const {
            startBin,
            endBin
        } = getBandBins(bins);


        for (let x = 0; x < width; x++) {

            const bin =
                Math.min(
                    endBin,
                    startBin +
                    Math.floor(
                        x *
                        (endBin - startBin) /
                        width
                    )
                );

            const db =
                data.getFloat32(
                    2 + (bin * 4),
                    true
                );

            let level =
                (
                    db - floor
                ) /
                range;

            level =
                Math.max(
                    0,
                    Math.min(1, level)
                );


            const [r, g, b] =
                waterfallColor(level);

            const index =
                x * 4;

            image.data[index] =
                r;

            image.data[index + 1] =
                g;

            image.data[index + 2] =
                b;

            image.data[index + 3] =
                255;
        }


        waterfallContext.putImageData(
            image,
            0,
            0
        );
    }


    function updateVfoMarker() {

        if (!vfoMarker) {
            return;
        }

        const frequency =
            Number(
                rgoState?.frequency
            );

        if (!Number.isFinite(frequency)) {
            return;
        }


        const range =
            getSdrBandRange();

        const position =
            (
                frequency -
                range.start
            ) /
            (
                range.end -
                range.start
            );

        const clamped =
            Math.max(
                0,
                Math.min(
                    1,
                    position
                )
            );

        vfoMarker.style.left =
            `${clamped * 100}%`;

        if (clamped <= 0.05) {
            vfoMarker.style.transform =
                "translateX(0)";
            vfoMarker.style.textAlign =
                "left";
        } else if (clamped >= 0.95) {
            vfoMarker.style.transform =
                "translateX(-100%)";
            vfoMarker.style.textAlign =
                "right";
        } else {
            vfoMarker.style.transform =
                "translateX(-0.5px)";
            vfoMarker.style.textAlign =
                "center";
        }

        vfoMarker.textContent =
            `${(
                frequency / 1000000
            ).toFixed(3)} MHz`;
    }

    function updateSdrFrequency() {

        if (!sdrFrequency) {
            return;
        }

        const frequency =
            Number(
                rgoState?.frequency
            );

        if (!Number.isFinite(frequency)) {
            return;
        }

        sdrFrequency.textContent =
            `${formatFrequency(frequency)}`;
    }


    function sdrUrl() {

        const protocol =
            window.location.protocol === "https:"
                ? "wss:"
                : "ws:";

        return `${protocol}//${window.location.host}/sdr`;
    }


    function connectSdr() {

        if (
            sdrSocket &&
            (
                sdrSocket.readyState === WebSocket.OPEN ||
                sdrSocket.readyState === WebSocket.CONNECTING
            )
        ) {
            return;
        }


        console.log(
            "RGO SDR: connecting to /sdr"
        );


        sdrSocket =
            new WebSocket(
                sdrUrl()
            );

        sdrSocket.binaryType =
            "arraybuffer";


        sdrSocket.onopen = () => {

            console.log(
                "RGO SDR: WebSocket connected"
            );
        };


        sdrSocket.onmessage = event => {

            if (
                !(event.data instanceof ArrayBuffer)
            ) {
                return;
            }


            const data =
                new DataView(
                    event.data
                );


            if (data.byteLength < 2) {
                return;
            }


            const bins =
                data.getUint16(
                    0,
                    true
                );


            if (
                bins <= 0 ||
                data.byteLength <
                2 + bins * 4
            ) {
                return;
            }


            sdrFrames++;


            drawSpectrum(data);
            drawWaterfall(data);
            updateVfoMarker();
            updateSdrFrequency();


            if (
                sdrFrames === 1 ||
                sdrFrames % 100 === 0
            ) {

                console.log(
                    `RGO SDR: FFT frame ${sdrFrames}, bins=${bins}`
                );
            }
        };


        sdrSocket.onerror = error => {

            console.error(
                "RGO SDR: WebSocket error",
                error
            );
        };


        sdrSocket.onclose = () => {

            console.log(
                "RGO SDR: WebSocket disconnected"
            );

            sdrSocket = null;


            setTimeout(
                connectSdr,
                2000
            );
        };
    }


    /*
     * Initial sizing.
     */

    resizeSdr();


    if (
        typeof ResizeObserver !==
        "undefined"
    ) {

        const observer =
            new ResizeObserver(
                resizeSdr
            );

        if (spectrumCanvas) {
            observer.observe(
                spectrumCanvas
            );
        }

        if (waterfallCanvas) {
            observer.observe(
                waterfallCanvas
            );
        }

    } else {

        window.addEventListener(
            "resize",
            resizeSdr
        );
    }


    window.addEventListener(
        "resize",
        resizeSdr
    );


    requestAnimationFrame(
        resizeSdr
    );


    setTimeout(
        resizeSdr,
        250
    );


    connectSdr();

})();
 


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
        initRgoCwSpeedControl();
        initBandControls();
        initMeterSelector();
	startRgoPolling();

    }
);


/* =========================================================
   RGO VFO CONTROL
   One frequency field, selected by VFO A / VFO B
   ========================================================= */

function parseRgoFrequency(value) {

    let text =
        String(value)
            .trim()
            .replace(/,/g, ".");

    if (!text) {
        return null;
    }

    let frequency;

    /*
     * 14.100       -> 14.100 MHz
     * 7.074        -> 7.074 MHz
     * 14.100.000   -> 14.100.000 Hz
     * 14100000     -> Hz
     * 14100        -> kHz
     */
    if (/^\d{1,3}\.\d{1,3}$/.test(text)) {

        frequency =
            Number(text) * 1000000;

    } else if (/^\d{1,3}\.\d{3}\.\d{3}$/.test(text)) {

        const parts =
            text.split(".");

        frequency =
            Number(parts[0]) * 1000000 +
            Number(parts[1]) * 1000 +
            Number(parts[2]);

    } else {

        frequency =
            Number(text.replace(/\./g, ""));

        if (
            Number.isFinite(frequency) &&
            frequency < 100000
        ) {
            frequency *= 1000;
        }
    }

    if (
        !Number.isFinite(frequency) ||
        frequency < 100000 ||
        frequency > 60000000
    ) {
        return null;
    }

    return Math.round(frequency);
}




async function setRgoFrequency(value) {

    const frequency =
        parseRgoFrequency(value);

    if (frequency === null) {

        await fetchRgoState();
        return;
    }

    /*
     * rgoState.rxVfo:
     * 0 = VFO A
     * 1 = VFO B
     */
    const activeVfo =
        Number(rgoState?.rxVfo) === 1
            ? "B"
            : "A";

    try {

        let response;

        if (activeVfo === "B") {

            response =
                await fetch(
                    "/api/radio/split-frequency",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            frequency
                        })
                    }
                );

        } else {

            response =
                await fetch(
                    "/api/radio/frequency",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            frequency
                        })
                    }
                );
        }

        if (!response.ok) {

            throw new Error(
                `Frequency update failed: HTTP ${response.status}`
            );
        }

        await fetchRgoState();

    } catch (error) {

        console.error(
            "RGO frequency:",
            error
        );

    }
}


/*
 * Replace the old two-field VFO display.
 */
function updateVfo() {

    if (!rgoState) {
        return;
    }

    const buttonA =
        document.getElementById("rgo-vfo-a");

    const buttonB =
        document.getElementById("rgo-vfo-b");

    const label =
        document.getElementById(
            "rgo-vfo-frequency-label"
        );

    const input =
        document.getElementById(
            "rgo-vfo-frequency"
        );

    const splitButton =
        document.getElementById(
            "rgo-split"
        );

    if (!buttonA || !buttonB || !label || !input) {
        return;
    }

    if (splitButton) {
        splitButton.classList.toggle(
            "active",
            rgoState.split === true
        );
    }

    const activeVfo =
        Number(rgoState.rxVfo) === 1
            ? "B"
            : "A";

    const frequency =
        activeVfo === "B"
            ? Number(rgoState.frequencyB)
            : Number(rgoState.frequency);

    buttonA.classList.toggle(
        "active",
        activeVfo === "A"
    );

    buttonB.classList.toggle(
        "active",
        activeVfo === "B"
    );

    label.textContent =
        activeVfo;

    if (
        Number.isFinite(frequency) &&
        document.activeElement !== input
    ) {
        input.value =
            formatFrequency(frequency);
    }
}






/* =========================================================
   RGO CONTROLS (CAT manual v1.05)
   POST /api/rgo/control { control, value }
   ========================================================= */

/* a control the user is moving is not overwritten by the poll */
const rgoEditUntil = new WeakMap();

function rgoEditing(element) {
    return (rgoEditUntil.get(element) || 0) > Date.now();
}

function rgoHold(element, ms = 2500) {
    rgoEditUntil.set(element, Date.now() + ms);
}

async function rgoControl(control, value) {
    try {
        const response = await fetch("/api/rgo/control", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ control, value })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            rgoFlash(result.error || `HTTP ${response.status}`);
            return false;
        }
        return true;
    }
    catch {
        rgoFlash("SHACK-SERVER not reachable");
        return false;
    }
}

/* short error message at the bottom of the page */
let rgoFlashTimer = null;

function rgoFlash(message) {
    console.error("RGO:", message);
    let box = document.getElementById("rgo-flash");
    if (!box) {
        box = document.createElement("div");
        box.id = "rgo-flash";
        box.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:50;"
            + "background:#3a0d0d;border:1px solid #ff4d4d;color:#ffb3b3;padding:8px 14px;border-radius:6px;font:13px sans-serif;max-width:90vw";
        document.body.appendChild(box);
    }
    box.textContent = message;
    box.hidden = false;
    clearTimeout(rgoFlashTimer);
    rgoFlashTimer = setTimeout(() => { box.hidden = true; }, 6000);
}

/* slider -> control (sent when released, the value shown while moving) */
function bindRgoSlider(id, control, format = value => String(value)) {
    const slider = document.getElementById(id);
    if (!slider) return;
    const output = slider.parentElement?.querySelector("output");
    slider.addEventListener("input", () => {
        rgoHold(slider);
        if (output) output.textContent = format(slider.value);
    });
    slider.addEventListener("change", async () => {
        rgoHold(slider);
        await rgoControl(control, Number(slider.value));
        rgoHold(slider, 1500);
    });
}

function updateRgoExtras() {

    if (!rgoState) return;

    // ATU: TUNE / TUNING, greyed when the tuner is off (menu 34)
    const tune = document.getElementById("rgo-atu-tune");
    if (tune) {
        tune.textContent = rgoState.atuTuning ? "TUNING" : "TUNE";
        tune.classList.toggle("tuning", rgoState.atuTuning === true);
        tune.classList.toggle("unavailable", rgoState.atuEnabled !== true);
        tune.title = rgoState.atuEnabled
            ? "Start / stop the internal tuner"
            : "Internal tuner off (menu 34) or no ATU board";
    }

    const split = document.getElementById("rgo-split");
    if (split) split.classList.toggle("active", rgoState.split === true);

}

function initRgoControls() {

    bindRgoSlider("rgo-power-slider", "power", value => `${value} W`);
    bindRgoSlider("rgo-break-in-delay-slider", "breakIn");
    bindRgoSlider("rgo-rf-gain", "rfGain");
    bindRgoSlider("rgo-mic-gain", "micGain");

    // PREAMP / ATT / NB: toggle
    document.querySelectorAll("[data-fn]").forEach(button => {
        button.addEventListener("click", async () => {
            const on = !button.classList.contains("active");
            button.classList.toggle("active", on);
            button.textContent = on ? "ON" : "OFF";
            if (rgoState) {
                if (button.dataset.fn === "preamp") rgoState.preamp = on;
                if (button.dataset.fn === "att") rgoState.rgoAttenuator = on;
                if (button.dataset.fn === "nb") rgoState.rgoNoiseBlanker = on;
            }
            await rgoControl(button.dataset.fn, on);
        });
    });

    // AGC
    document.querySelectorAll("[data-agc]").forEach(button => {
        button.addEventListener("click", async () => {
            if (rgoState) rgoState.agc = button.dataset.agc;
            updateAgc();
            await rgoControl("agc", button.dataset.agc);
        });
    });

    // ATU TUNE
    const tune = document.getElementById("rgo-atu-tune");
    tune?.addEventListener("click", async () => {
        const start = !(rgoState?.atuTuning);
        if (await rgoControl("tune", start) && rgoState) {
            rgoState.atuTuning = start;
            updateRgoExtras();
        }
    });

    initRgoTuning();
    initRgoAudio();
    initRgoCtr2();

}

/* ---------------------------------------------------------------- VFO knob */

const RGO_STEPS = [1, 10, 100, 1000];
let rgoStep = 100;
try { rgoStep = Number(localStorage.getItem("rgo-step")) || 100; } catch { /* no storage */ }
if (!RGO_STEPS.includes(rgoStep)) rgoStep = 100;

/* the frequency moves at once on the page, the radio gets at most
   ~12 commands per second (absolute frequency, nothing gets lost) */
const rgoTuning = { target: 0, holdUntil: 0, timer: null, angle: 0 };

function rgoActiveFrequency() {
    if (!rgoState) return 0;
    return Number(rgoState.rxVfo) === 1 ? Number(rgoState.frequencyB) : Number(rgoState.frequency);
}

function rgoTuneBy(steps, step = rgoStep) {
    if (!rgoState || !steps) return;
    const now = Date.now();
    const base = now < rgoTuning.holdUntil && rgoTuning.target ? rgoTuning.target : rgoActiveFrequency();
    if (!(base > 0)) return;
    rgoTuning.target = Math.max(100000, Math.min(60e6, Math.round(base / step) * step + steps * step));
    rgoTuning.holdUntil = now + 1200;

    // shown at once
    if (Number(rgoState.rxVfo) === 1) rgoState.frequencyB = rgoTuning.target;
    else rgoState.frequency = rgoTuning.target;
    updateFrequency();
    updateVfo();

    if (!rgoTuning.timer) rgoSendTarget();
}

function rgoSendTarget() {
    rgoTuning.timer = setTimeout(async () => {
        const target = rgoTuning.target;
        await rgoControl("frequency", target);
        rgoTuning.timer = null;
        if (rgoTuning.target !== target) rgoSendTarget();
    }, 80);
}

function rgoRotateKnob(deg) {
    rgoTuning.angle = (rgoTuning.angle + deg) % 360;
    document.querySelector(".vfo-knob")?.style.setProperty("--knob-angle", `${rgoTuning.angle}deg`);
}

function initRgoTuning() {

    const setStep = value => {
        rgoStep = value;
        try { localStorage.setItem("rgo-step", String(value)); } catch { /* no storage */ }
        document.querySelectorAll("[data-step]").forEach(button =>
            button.classList.toggle("active", Number(button.dataset.step) === value));
    };
    setStep(rgoStep);
    document.querySelectorAll("[data-step]").forEach(button =>
        button.addEventListener("click", () => setStep(Number(button.dataset.step))));

    document.getElementById("rgo-step-down")?.addEventListener("click", () => { rgoRotateKnob(-8); rgoTuneBy(-1); });
    document.getElementById("rgo-step-up")?.addEventListener("click", () => { rgoRotateKnob(8); rgoTuneBy(1); });

    const knob = document.querySelector(".vfo-knob");
    if (!knob) return;

    let last = null;
    let acc = 0;
    const angleOf = event => {
        const r = knob.getBoundingClientRect();
        return Math.atan2(event.clientY - (r.top + r.height / 2), event.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };

    knob.addEventListener("pointerdown", event => {
        knob.setPointerCapture(event.pointerId);
        last = angleOf(event);
        acc = 0;
    });

    knob.addEventListener("pointermove", event => {
        if (last === null) return;
        const a = angleOf(event);
        let d = a - last;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        last = a;
        rgoRotateKnob(d);
        acc += d;
        // one step per 8 degrees
        const steps = Math.trunc(acc / 8);
        if (steps) {
            acc -= steps * 8;
            rgoTuneBy(steps);
        }
    });

    const end = () => { last = null; };
    knob.addEventListener("pointerup", end);
    knob.addEventListener("pointercancel", end);

    knob.addEventListener("wheel", event => {
        event.preventDefault();
        const steps = event.deltaY < 0 ? 1 : -1;
        rgoRotateKnob(steps * 8);
        rgoTuneBy(steps);
    }, { passive: false });

}

/* ---------------------------------------------------------------- AUDIO */

/* RX audio of the transceiver (USB sound card of SHACK-SERVER, /audio) */
function initRgoAudio() {

    const button = document.getElementById("rgo-audio-on");
    if (!button) return;

    let socket = null;
    let context = null;
    let node = null;
    const queue = [];
    let pending = null;

    const enqueue = data => {
        const bytes = new Uint8Array(data);
        let offset = 0;
        if (pending !== null && bytes.length) {
            const v = pending | (bytes[0] << 8);
            queue.push(v < 0x8000 ? v / 32768 : (v - 0x10000) / 32768);
            pending = null;
            offset = 1;
        }
        const end = bytes.length - ((bytes.length - offset) % 2);
        for (let i = offset; i < end; i += 2) {
            const v = bytes[i] | (bytes[i + 1] << 8);
            queue.push(v < 0x8000 ? v / 32768 : (v - 0x10000) / 32768);
        }
        if (end < bytes.length) pending = bytes[end];
        // at most 0.5 s buffered
        if (queue.length > 24000) queue.splice(0, queue.length - 24000);
    };

    const stop = () => {
        const s = socket;
        socket = null;
        s?.close();
        if (node) { node.disconnect(); node.onaudioprocess = null; node = null; }
        context?.close().catch(() => {});
        context = null;
        queue.length = 0;
        pending = null;
        button.classList.remove("active");
        button.textContent = "AUDIO";
    };

    const start = () => {
        context = new AudioContext({ sampleRate: 48000 });
        node = context.createScriptProcessor(4096, 0, 1);
        node.onaudioprocess = event => {
            const out = event.outputBuffer.getChannelData(0);
            for (let i = 0; i < out.length; i++) out[i] = queue.length ? queue.shift() : 0;
        };
        node.connect(context.destination);

        socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/audio`);
        socket.binaryType = "arraybuffer";
        socket.onopen = () => {
            context?.resume();
            button.classList.add("active");
            button.textContent = "AUDIO ON";
        };
        socket.onmessage = event => {
            if (event.data instanceof ArrayBuffer) enqueue(event.data);
            else if (event.data instanceof Blob) event.data.arrayBuffer().then(enqueue);
        };
        socket.onerror = () => rgoFlash("No audio: check Settings > Audio (USB sound card)");
        socket.onclose = () => { if (socket) stop(); };
    };

    button.title = "RX audio of the transceiver in this browser";
    button.addEventListener("click", () => (socket ? stop() : start()));

}

/* ---------------------------------------------------------------- CTR2-MIDI */

/* CTR2-MIDI encoder (WebHID, Chrome / Edge): CC100 65 = right, 63 = left */
function initRgoCtr2() {

    const button = document.getElementById("rgo-ctr2-midi");
    if (!button) return;

    button.title = "Connect a CTR2-MIDI encoder (Chrome / Edge, USB) as the VFO knob";

    let device = null;

    const report = event => {
        const bytes = new Uint8Array(event.data.buffer);
        if (bytes.length < 3 || bytes[0] !== 0xB0 || bytes[1] !== 100) return;
        if (bytes[2] === 0x41) { rgoRotateKnob(8); rgoTuneBy(1); }
        else if (bytes[2] === 0x3F) { rgoRotateKnob(-8); rgoTuneBy(-1); }
    };

    button.addEventListener("click", async () => {
        if (!navigator.hid) {
            rgoFlash("CTR2: this browser has no WebHID (Chrome or Edge, over https or localhost)");
            return;
        }
        if (device) return;
        try {
            const devices = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x2886, productId: 0x0056 }] });
            if (!devices.length) return;
            device = devices[0];
            if (!device.opened) await device.open();
            device.addEventListener("inputreport", report);
            button.classList.add("active");
            button.textContent = "CTR2 ON";
        }
        catch (error) {
            device = null;
            rgoFlash(`CTR2: ${error.message || error}`);
        }
    });

    navigator.hid?.addEventListener("disconnect", event => {
        if (event.device === device) {
            device = null;
            button.classList.remove("active");
            button.textContent = "CTR2-MIDI";
        }
    });

}

document.addEventListener("DOMContentLoaded", initRgoControls);
