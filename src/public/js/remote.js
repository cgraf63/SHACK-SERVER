const vfoDisplays = document.querySelectorAll(".frequency");
const connection = document.querySelector(".connection");
const powerDisplay = document.querySelector(".power-number");
const powerIcon = document.querySelector(".power-icon");
const powerSlider = document.querySelector(".power-slider");
const rfGainSlider = document.querySelector("#rf-gain-slider");
const afGainSlider = document.querySelector("#af-gain-slider");
const cwSpeedSlider = document.querySelector("#cw-speed-slider");
const micGainSlider = document.querySelector("#mic-gain-slider");
const micEqButton = document.querySelector("#mic-eq-button");
const sMeterNeedle = document.querySelector(".meter-needle");
const powerNeedle = document.querySelector(".power-needle");
const alcNeedle = document.querySelector(".alc-needle");
const swrNeedle = document.querySelector(".swr-needle");
const modeButtons = document.querySelectorAll(".mode-popup-grid button");
const vfoBadges = document.querySelectorAll(".vfo-status");
const txButtons = document.querySelectorAll(".small-tx");
let lastRadioState = null;

const filterWidthSlider =
    document.querySelector("#filter-width");

const filterShiftSlider =
    document.querySelector("#filter-shift");


const FTDX10_WIDTH_HZ = [
    0,
    300,
    400,
    600,
    850,
    1100,
    1200,
    1500,
    1650,
    1800,
    1950,
    2100,
    2250,
    2400,
    2450,
    2500,
    2600,
    2700,
    2800,
    2900,
    3000,
    3200,
    3500,
    4000
];


function formatFilterWidth(hz) {
    const value = Number(hz) || 0;

    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)} kHz`;
    }

    return `${value} Hz`;
}


function nearestFilterWidthCode(hz) {
    const value = Number(hz) || 0;

    let bestCode = 0;
    let bestDistance = Infinity;

    FTDX10_WIDTH_HZ.forEach((width, code) => {
        const distance = Math.abs(width - value);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestCode = code;
        }
    });

    return bestCode;
}


async function setFilterGainControl(control, value) {

    try {

        const response = await fetch(
            "/api/radio/filter-gain",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    control,
                    value
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `FILTER/GAIN HTTP ${response.status}`
            );
        }

    } catch (error) {

        console.error(
            "FILTER/GAIN control error:",
            error
        );
    }
}


/* RF GAIN */

if (rfGainSlider) {

    rfGainSlider.addEventListener(
        "input",
        () => {

            const percent =
                Number(rfGainSlider.value);

            rfGainSlider.nextElementSibling.textContent =
                `${percent}`;

            const catValue =
                Math.round(
                    percent / 100 * 255
                );

            setFilterGainControl(
                "rfGain",
                catValue
            );
        }
    );
}


/* AF GAIN */

if (afGainSlider) {

    afGainSlider.addEventListener(
        "input",
        () => {

            const percent =
                Number(afGainSlider.value);

            afGainSlider.nextElementSibling.textContent =
                `${percent}`;

            const catValue =
                Math.round(
                    percent / 100 * 255
                );

            setFilterGainControl(
                "afGain",
                catValue
            );
        }
    );
}


/* CW SPEED */

if (cwSpeedSlider) {

    cwSpeedSlider.addEventListener(
        "input",
        () => {

            const value =
                Number(cwSpeedSlider.value);

            const valueDisplay =
                document.querySelector("#cw-speed-value");

            if (valueDisplay) {
                valueDisplay.textContent =
                    `${value}`;
            }

            setFilterGainControl(
                "cwSpeed",
                value
            );
        }
    );
}


/* MIC GAIN */

if (micGainSlider) {

    micGainSlider.addEventListener(
        "input",
        () => {

            const value =
                Number(micGainSlider.value);

            const valueDisplay =
                document.querySelector("#mic-gain-value");

            if (valueDisplay) {
                valueDisplay.textContent =
                    `${value}`;
            }

            setFilterGainControl(
                "micGain",
                value
            );
        }
    );
}


/* MIC EQ */

if (micEqButton) {

    micEqButton.addEventListener(
        "click",
        async () => {

            const enabled =
                !micEqButton.classList.contains("active");

            await setFilterGainControl(
                "micEq",
                enabled
            );
        }
    );
}


/* BK-IN */

const bkInButton =
    document.querySelector("#bk-in-button");

if (bkInButton) {

    bkInButton.addEventListener(
        "click",
        async () => {

            const enabled =
                !bkInButton.classList.contains("active");

            await setFilterGainControl(
                "breakIn",
                enabled
            );
        }
    );
}


/* FILTER WIDTH */

if (filterWidthSlider) {

    filterWidthSlider.addEventListener(
        "input",
        () => {

            const percent =
                Number(filterWidthSlider.value);

            const code = Math.round(
                percent / 100 * 23
            );

            const hz =
                FTDX10_WIDTH_HZ[code];

            filterWidthSlider.nextElementSibling.textContent =
                formatFilterWidth(hz);

            setFilterGainControl(
                "filterWidth",
                code
            );
        }
    );
}


/* FILTER SHIFT */

if (filterShiftSlider) {

    filterShiftSlider.addEventListener(
        "input",
        () => {

            const percent =
                Number(filterShiftSlider.value);

            const shift = Math.round(
                ((percent - 50) / 50 * 1200) / 20
            ) * 20;

            filterShiftSlider.nextElementSibling.textContent =
                `${shift > 0 ? "+" : ""}${shift} Hz`;

            setFilterGainControl(
                "filterShift",
                shift
            );
        }
    );
}



async function setDspControl(control, value) {

    try {

        const response = await fetch(
            "/api/radio/dsp-control",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    control,
                    value
                })
            }
        );

        if (!response.ok) {
            throw new Error(
                `DSP HTTP ${response.status}`
            );
        }

        await new Promise(
            resolve => setTimeout(resolve, 100)
        );

        await updateRadioState();

    } catch (error) {

        console.error(
            "DSP control error:",
            error
        );
    }
}


function formatDspFrequency(hz) {

    const value = Number(hz) || 0;

    if (value >= 1000) {
        return `${(value / 1000).toFixed(3)} kHz`;
    }

    return `${value} Hz`;
}


/* NOTCH */

const dspNotch =
    document.querySelector("#dsp-notch");

if (dspNotch) {

    const toggle =
        dspNotch.querySelector(".toggle-button");

    const slider =
        dspNotch.querySelector("#notch-slider");

    const value =
        dspNotch.querySelector("strong");

    if (toggle) {

        toggle.addEventListener(
            "click",
            () => {

                const enabled =
                    !toggle.classList.contains("dsp-on");

                setDspControl(
                    "notch",
                    enabled
                );
            }
        );
    }

    if (slider) {

        slider.addEventListener(
            "input",
            () => {

                const hz =
                    Number(slider.value);

                if (value) {
                    value.textContent =
                        formatDspFrequency(hz);
                }
            }
        );

        slider.addEventListener(
            "change",
            () => {

                const hz =
                    Number(slider.value);

                setDspControl(
                    "notchFrequency",
                    hz
                );
            }
        );
    }
}


/* CONTOUR */

const dspContour =
    document.querySelector("#dsp-contour");

if (dspContour) {

    const toggle =
        dspContour.querySelector(".toggle-button");

    const slider =
        dspContour.querySelector("#contour-slider");

    const value =
        dspContour.querySelector("strong");

    if (toggle) {

        toggle.addEventListener(
            "click",
            () => {

                const enabled =
                    !toggle.classList.contains("dsp-on");

                setDspControl(
                    "contour",
                    enabled
                );
            }
        );
    }

    if (slider) {

        slider.addEventListener(
            "input",
            () => {

                const hz =
                    Number(slider.value);

                if (value) {
                    value.textContent =
                        formatDspFrequency(hz);
                }
            }
        );

        slider.addEventListener(
            "change",
            () => {

                const hz =
                    Number(slider.value);

                setDspControl(
                    "contourFrequency",
                    hz
                );
            }
        );
    }
}


/* DNR */



const dspDnr =
    document.querySelector("#dsp-dnr");

if (dspDnr) {

    const toggle =
        dspDnr.querySelector(".toggle-button");

    const buttons =
        dspDnr.querySelectorAll(".value-button");

    if (toggle) {

        toggle.addEventListener(
            "click",
            () => {

                const enabled =
                    !toggle.classList.contains("dsp-on");

                setDspControl(
                    "dnr",
                    enabled
                );
            }
        );
    }

    if (buttons.length >= 2) {

        buttons[0].addEventListener(
            "click",
            () => {

                const level =
                    Number(
                        lastRadioState?.dnrLevel
                    ) || 1;

                setDspControl(
                    "dnrLevel",
                    Math.max(1, level - 1)
                );
            }
        );

        buttons[1].addEventListener(
            "click",
            () => {

                const level =
                    Number(
                        lastRadioState?.dnrLevel
                    ) || 1;

                setDspControl(
                    "dnrLevel",
                    Math.min(15, level + 1)
                );
            }
        );
    }
}


/* NB */

const dspNb =
    document.querySelector("#dsp-nb");

if (dspNb) {

    const toggle =
        dspNb.querySelector(".toggle-button");

    const buttons =
        dspNb.querySelectorAll(".value-button");

    if (toggle) {

        toggle.addEventListener(
            "click",
            () => {

                const enabled =
                    !toggle.classList.contains("dsp-on");

                setDspControl(
                    "nb",
                    enabled
                );
            }
        );
    }

    if (buttons.length >= 2) {

        buttons[0].addEventListener(
            "click",
            () => {

                const level =
                    Number(
                        lastRadioState?.nbLevel
                    ) || 0;

                setDspControl(
                    "nbLevel",
                    Math.max(0, level - 1)
                );
            }
        );

        buttons[1].addEventListener(
            "click",
            () => {

                const level =
                    Number(
                        lastRadioState?.nbLevel
                    ) || 0;

                setDspControl(
                    "nbLevel",
                    Math.min(10, level + 1)
                );
            }
        );
    }
}


async function loadStationSettings() {
    try {
        const response = await fetch("/api/settings", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Settings HTTP ${response.status}`);
        }

        const settings = await response.json();

        const operator = document.querySelector(".operator");

        if (operator) {
            const fields = operator.querySelectorAll("div");

            if (fields[0]) {
                fields[0].textContent = settings.callsign || "";
            }

            if (fields[1]) {
                fields[1].textContent = settings.locator || "";
            }
        }
    } catch (error) {
        console.error("Could not load station settings:", error);
    }
}


let powerSwitchBusy = false;

if (powerIcon) {
    powerIcon.addEventListener("click", async () => {
        if (powerSwitchBusy || !lastRadioState) return;

        powerSwitchBusy = true;

        try {
            const enabled = lastRadioState.poweredOn !== true;

            await fetch("/api/radio/power", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ enabled })
            });

            await updateRadioState();
        } catch (error) {
            console.error("Power switch error:", error);
        } finally {
            powerSwitchBusy = false;
        }
    });
}


function formatFrequency(hz) {
    if (!Number.isFinite(hz)) {
        return "---.---.---";
    }

    return Math.round(hz)
        .toLocaleString("de-CH");
}

function updateMode(mode) {
    modeButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.textContent.trim() === mode
        );
    });
}


// ============================================================
// BAND SELECT
// ============================================================

document.addEventListener("change", async event => {

    const select = event.target.closest(".band-button");

    if (!select) {
        return;
    }

    const band = select.value;
    const vfo = select.dataset.vfo;

    if (!band || !vfo) {
        return;
    }

    console.log(
        "BAND SELECT:",
        vfo,
        band
    );

    try {

        const response = await fetch("/api/radio/band", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                band,
                vfo
            })
        });

        if (!response.ok) {
            throw new Error("BAND selection failed");
        }

        /*
         * Keine Frequenz setzen.
         *
         * Der FTDX10 ruft selbst die zuletzt
         * verwendete Frequenz dieses Bandes ab.
         */

        await new Promise(resolve =>
            setTimeout(resolve, 500)
        );

        await updateRadioState();

    } catch (error) {

        console.error(
            "BAND selection error:",
            error
        );

    }
});


// ============================================================
// BAND DETECTION
// ============================================================

function getBandCodeFromFrequency(frequency) {

    const f = Number(frequency);

    if (!Number.isFinite(f)) {
        return "11"; // GEN
    }

    if (f >= 1800000 && f < 2000000) return "00"; // 160 m
    if (f >= 3500000 && f < 4000000) return "01"; // 80 m
    if (f >= 5000000 && f < 5500000) return "02"; // 60 m
    if (f >= 7000000 && f < 7300000) return "03"; // 40 m
    if (f >= 10000000 && f < 10200000) return "04"; // 30 m
    if (f >= 14000000 && f < 14400000) return "05"; // 20 m
    if (f >= 18000000 && f < 18200000) return "06"; // 17 m
    if (f >= 21000000 && f < 21500000) return "07"; // 15 m
    if (f >= 24800000 && f < 25000000) return "08"; // 12 m
    if (f >= 28000000 && f < 30000000) return "09"; // 10 m
    if (f >= 50000000 && f < 55000000) return "10"; // 6 m

    return "11"; // GEN
}

function updateBandDisplays(data) {

    const bandSelects =
        document.querySelectorAll(".band-button");

    if (bandSelects.length < 2) {
        return;
    }

    const bandA =
        getBandCodeFromFrequency(data.frequency);

    const bandB =
        getBandCodeFromFrequency(data.frequencyB);

    bandSelects.forEach(select => {

        const vfo =
            select.dataset.vfo;

        const band =
            vfo === "A"
                ? bandA
                : bandB;

        if (
            select.value !== band
        ) {
            select.value = band;
        }
    });
}

async function updateRadioState() {

    try {

        const response =
            await fetch("/api/radio", {
                cache: "no-store"
            });

        if (!response.ok) {
            throw new Error("Radio API unavailable");
        }

        const data =
            await response.json();

	lastRadioState = data;

        // POWER STATE
        if (powerIcon) {
            powerIcon.classList.toggle("power-on", data.poweredOn === true);
            powerIcon.classList.toggle("power-off", data.poweredOn !== true);
        }


        // SPLIT
        updateSplitDisplay(data);
        // VFO A
        if (
            vfoDisplays[0] &&
            !vfoDisplays[0].querySelector("input")
        ) {
            vfoDisplays[0].textContent =
                formatFrequency(data.frequency);
        }

        // VFO B
        if (
            vfoDisplays[1] &&
            !vfoDisplays[1].querySelector("input")
        ) {
            vfoDisplays[1].textContent =
                formatFrequency(data.frequencyB);
        }

        // BAND
        updateBandDisplays(data);

        // TX Power

	if (powerDisplay) {
 	   powerDisplay.textContent =
        `${data.power} W`;
}

	if (powerSlider) {
    	   powerSlider.value = data.power;
}

        // RF / AF Gain
        if (rfGainSlider) {
            rfGainSlider.value =
                Math.round((Number(data.rfGain) || 0) / 255 * 100);
            rfGainSlider.nextElementSibling.textContent =
                `${rfGainSlider.value}`;
        }

        if (afGainSlider) {
            afGainSlider.value =
                Math.round((Number(data.afGain) || 0) / 255 * 100);
            afGainSlider.nextElementSibling.textContent =
                `${afGainSlider.value}`;
        }

        // CW SPEED / MIC GAIN

        if (cwSpeedSlider) {

            const speed =
                Math.max(
                    4,
                    Math.min(
                        60,
                        Number(data.cwSpeed) || 20
                    )
                );

            cwSpeedSlider.value =
                speed;

            const valueDisplay =
                document.querySelector("#cw-speed-value");

            if (valueDisplay) {
                valueDisplay.textContent =
                    `${speed}`;
            }
        }


        if (micGainSlider) {

            const gain =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(data.micGain) || 50
                    )
                );

            micGainSlider.value =
                gain;

            const valueDisplay =
                document.querySelector("#mic-gain-value");

            if (valueDisplay) {
                valueDisplay.textContent =
                    `${gain}`;
            }
        }

        // MIC EQ

        if (micEqButton) {
            const enabled =
                Boolean(data.micEq);

            micEqButton.classList.toggle(
                "active",
                enabled
            );

            micEqButton.textContent =
                enabled ? "MIC EQ ON" : "MIC EQ";
        }

        // BK-IN

        const bkInButton =
            document.querySelector("#bk-in-button");

        if (bkInButton) {
            const enabled =
                Boolean(data.breakIn);

            bkInButton.classList.toggle(
                "active",
                enabled
            );

            bkInButton.textContent =
                enabled ? "BK-IN ON" : "BK-IN";
        }


        // FILTER WIDTH / SHIFT

        if (filterWidthSlider) {

            const widthCode = Math.max(
                0,
                Math.min(
                    23,
                    Math.round(
                        Number(data.filterWidth) || 0
                    )
                )
            );

            filterWidthSlider.value =
                Math.round(
                    widthCode / 23 * 100
                );

            filterWidthSlider.nextElementSibling.textContent =
                formatFilterWidth(
                    FTDX10_WIDTH_HZ[widthCode]
                );
        }


        if (filterShiftSlider) {

            const shift =
                Number(data.filterShift) || 0;

            filterShiftSlider.value =
                Math.round(
                    (shift + 1200) / 2400 * 100
                );

            filterShiftSlider.nextElementSibling.textContent =
                `${shift > 0 ? "+" : ""}${shift} Hz`;
        }


        // DSP status
        const dspNotch = document.querySelector("#dsp-notch");
        const dspContour = document.querySelector("#dsp-contour");
        const dspDnr = document.querySelector("#dsp-dnr");
        const dspNb = document.querySelector("#dsp-nb");

        if (dspNotch) {
            const toggle = dspNotch.querySelector(".toggle-button");
            const slider = dspNotch.querySelector("#notch-slider");
            const value = dspNotch.querySelector("strong");

            if (toggle) {
                toggle.textContent = data.notch ? "ON" : "OFF";
                toggle.classList.toggle("dsp-on", !!data.notch);
            }

            if (slider) {
                const hz = Math.max(
                    10,
                    Math.min(3200, Number(data.notchFrequency) || 1500)
                );

                slider.value = String(hz);

                if (value) {
                    value.textContent = formatDspFrequency(hz);
                }
            }
        }

        if (dspContour) {
            const toggle = dspContour.querySelector(".toggle-button");
            const slider = dspContour.querySelector("#contour-slider");
            const value = dspContour.querySelector("strong");

            if (toggle) {
                toggle.textContent = data.contour ? "ON" : "OFF";
                toggle.classList.toggle("dsp-on", !!data.contour);
            }

            if (slider) {
                const hz = Math.max(
                    20,
                    Math.min(3170, Number(data.contourFrequency) || 1500)
                );

                slider.value = String(hz);

                if (value) {
                    value.textContent = formatDspFrequency(hz);
                }
            }
        }

        if (dspDnr) {
            const toggle = dspDnr.querySelector(".toggle-button");
            const value = dspDnr.querySelector("strong");

            if (toggle) {
                toggle.textContent = data.dnr ? "ON" : "OFF";
                toggle.classList.toggle("dsp-on", !!data.dnr);
            }

            if (value) {
                value.textContent = `${Number(data.dnrLevel) || 0}`;
            }
        }

        if (dspNb) {
            const toggle = dspNb.querySelector(".toggle-button");
            const value = dspNb.querySelector("strong");

            if (toggle) {
                toggle.textContent = data.nb ? "ON" : "OFF";
                toggle.classList.toggle("dsp-on", !!data.nb);
            }

            if (value) {
                value.textContent = `${Number(data.nbLevel) || 0}`;
            }
        }

        // S-Meter
        if (sMeterNeedle) {
            const value = Math.max(
                0,
                Math.min(255, Number(data.meterS) || 0)
            );

            // FTDX10 S-Meter calibration
            // Measured: S5=70, S7=103, S9=132
            let sPosition;

            if (value <= 70) {
                sPosition = value / 70 * 5;
            } else if (value <= 103) {
                sPosition = 5 + (value - 70) / (103 - 70) * 2;
            } else if (value <= 132) {
                sPosition = 7 + (value - 103) / (132 - 103) * 2;
            } else {
                // Above S9: continue into the +dB range
                sPosition = 9 + (value - 132) / (255 - 132) * 60;
            }

            const angle =
                -45 + (sPosition / 69) * 90;

            sMeterNeedle.style.transform =
                `rotate(${angle}deg)`;
        }

        // Power meter
        if (powerNeedle) {
            const value = Math.max(
                0,
                Math.min(255, Number(data.meterPower) || 0)
            );

            const angle =
                -45 + (value / 255) * 90;

            powerNeedle.style.transform =
                `rotate(${angle}deg)`;
        }

        // ALC meter (linear 0-100 %)
        if (alcNeedle) {
            const value = Math.max(
                0,
                Math.min(100, Number(data.meterAlc) || 0)
            );

            const angle =
                -45 + (value / 100) * 90;

            alcNeedle.style.transform =
                `rotate(${angle}deg)`;

            const alcValue = alcNeedle
                .closest(".meter")
                ?.querySelector(".meter-value");

            if (alcValue) {
                alcValue.textContent = `${value} %`;
            }
        }

        // SWR meter (linear 1.0-5.0)
        if (swrNeedle) {
            const value = Math.max(
                1,
                Math.min(5, Number(data.meterSwr) || 1)
            );

            const angle =
                -45 + ((value - 1) / 4) * 90;

            swrNeedle.style.transform =
                `rotate(${angle}deg)`;

            const swrValue = swrNeedle
                .closest(".meter")
                ?.querySelector(".meter-value");

            if (swrValue) {
                swrValue.textContent = value.toFixed(1);
            }
        }

        // VFO modes
        if (vfoBadges[0]) {
            const mode =
                vfoBadges[0].querySelector(".vfo-control-badge .badge-value");

            if (mode) {
                mode.textContent = data.mode ?? "---";
            }
        }

        if (vfoBadges[1]) {
            const mode =
                vfoBadges[1].querySelector(".vfo-control-badge .badge-value");

            if (mode) {
                mode.textContent = data.modeB ?? "---";
            }
        }

        // Global mode grid
        updateMode(data.mode);

        // Active TX / VFO
        txButtons.forEach(button => {
            button.classList.toggle(
                "active",
                (button.textContent.trim() === "VFO A" && data.activeVfo === "A") ||
                (button.textContent.trim() === "VFO B" && data.activeVfo === "B")
            );
        });

        // Live receiver status
        // ATT / IPO / R.FIL / AGC gehören zum aktiven VFO.
        // Deshalb werden sie nur dort angezeigt.

        vfoBadges.forEach((status, index) => {

            const badges =
                status.querySelectorAll(".vfo-control-badge");

            const isActive =
                (index === 0 && data.activeVfo === "A") ||
                (index === 1 && data.activeVfo === "B");

            // MODE bleibt immer sichtbar.
            // ATT / IPO / R.FIL / AGC nur beim aktiven VFO.
            for (let i = 1; i <= 4; i++) {

                if (badges[i]) {

                    badges[i].style.display =
                        isActive
                            ? "inline-flex"
                            : "none";
                }
            }

            if (!isActive) {
                return;
            }

            if (badges[1]) {
                const value =
                    badges[1].querySelector(".badge-value");

                if (value) {
                    value.textContent =
                        data.attenuator ?? "---";
                }
            }

            if (badges[2]) {
                const value =
                    badges[2].querySelector(".badge-value");

                if (value) {
                    value.textContent =
                        data.ipo ?? "---";
                }
            }

            if (badges[3]) {
                const value =
                    badges[3].querySelector(".badge-value");

                if (value) {
                    value.textContent =
                        data.roofingFilter ?? "---";
                }
            }

            if (badges[4]) {
                const value =
                    badges[4].querySelector(".badge-value");

                if (value) {
                    value.textContent =
                        data.agc ?? "---";
                }
            }
        });

        // Connection
        if (connection) {
            const dot =
                connection.querySelector(".status-dot");

            connection.lastChild.textContent =
                data.connected
                    ? " CONNECTED"
                    : " DISCONNECTED";

            if (dot) {
                dot.classList.toggle(
                    "active",
                    data.connected
                );
            }
        }

    } catch (error) {

        console.error(
            "Remote radio update failed:",
            error
        );

        if (connection) {

            const dot =
                connection.querySelector(".status-dot");

            connection.lastChild.textContent =
                " DISCONNECTED";

            if (dot) {
                dot.classList.remove("active");
            }
        }
    }
}

loadStationSettings();
updateRadioState();

setInterval(
    updateRadioState,
    1000
);

/* =========================================================
   MODE POPUP
   ========================================================= */

const modeControls =
    document.querySelectorAll(".mode-control");

const modePopup =
    document.getElementById("mode-popup");

modeControls.forEach(control => {
    control.addEventListener("click", event => {
        event.stopPropagation();

        if (!modePopup) {
            return;
        }

        const rect = control.getBoundingClientRect();

        modePopup.style.left = `${rect.left}px`;
        modePopup.style.top = `${rect.bottom + 6}px`;

        modePopup.classList.toggle("open");
    });
});

document.addEventListener("click", () => {
    if (modePopup) {
        modePopup.classList.remove("open");
    }
});

/* =========================================================
   MODE / ATT / IPO / R.FIL / AGC CONTROLS
   ========================================================= */

/*
    MODE selection
*/

modeButtons.forEach(button => {

    button.addEventListener("click", async event => {

        event.stopPropagation();

        const mode =
            button.dataset.mode;

        if (!mode || !lastRadioState) {
            return;
        }

        try {

            const response =
                await fetch(
                    "/api/radio/tune",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                mode,
                                frequency:
                                    lastRadioState.frequency
                            })
                    }
                );

            if (!response.ok) {
                throw new Error(
                    "MODE update failed"
                );
            }

            if (modePopup) {
                modePopup.classList.remove("open");
            }

            await updateRadioState();

        } catch (error) {

            console.error(
                "MODE update error:",
                error
            );
        }
    });
});


/*
    ATT / IPO / R.FIL / AGC
*/

async function setVfoControl(control, value) {

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
                    body:
                        JSON.stringify({
                            control,
                            value
                        })
                }
            );

        if (!response.ok) {
            throw new Error(
                `${control} update failed`
            );
        }

        await updateRadioState();

    } catch (error) {

        console.error(
            `${control} control error:`,
            error
        );
    }
}


vfoBadges.forEach(status => {

    const badges =
        status.querySelectorAll(".vfo-control-badge");


    /*
        ATT
    */

    if (badges[1]) {

        badges[1].addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                const names = [
                    "OFF",
                    "6 dB",
                    "12 dB",
                    "18 dB"
                ];

                const values = [0, 1, 2, 3];

                const current =
                    String(
                        lastRadioState?.attenuator ??
                        "OFF"
                    );

                const index =
                    names.indexOf(current);

                const next =
                    values[
                        (index + 1) %
                        values.length
                    ];

                await setVfoControl(
                    "att",
                    next
                );
            }
        );
    }


    /*
        IPO
    */

    if (badges[2]) {

        badges[2].addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                const names = [
                    "IPO",
                    "AMP1",
                    "AMP2"
                ];

                const values = [0, 1, 2];

                const current =
                    String(
                        lastRadioState?.ipo ??
                        "IPO"
                    );

                const index =
                    names.indexOf(current);

                const next =
                    values[
                        (index + 1) %
                        values.length
                    ];

                await setVfoControl(
                    "ipo",
                    next
                );
            }
        );
    }


    /*
        R.FIL
    */

    if (badges[3]) {

        badges[3].addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                const names = [
                    "500 Hz",
                    "3 kHz",
                    "12 kHz"
                ];

                const values = [
                    "9",
                    "7",
                    "6"
                ];

                const current =
                    String(
                        lastRadioState?.roofingFilter ??
                        "3 kHz"
                    );

                const index =
                    names.indexOf(current);

                const next =
                    values[
                        (index + 1) %
                        values.length
                    ];

                await setVfoControl(
                    "roofingFilter",
                    next
                );
            }
        );
    }


    /*
        AGC
    */

    if (badges[4]) {

        badges[4].addEventListener(
            "click",
            async event => {

                event.stopPropagation();

                const names = [
                    "OFF",
                    "FAST",
                    "MID",
                    "SLOW",
                    "AUTO"
                ];

                const values = [
                    0,
                    1,
                    2,
                    3,
                    4
                ];

                const current =
                    String(
                        lastRadioState?.agc ??
                        "AUTO"
                    );

                const index =
                    names.indexOf(current);

                const next =
                    values[
                        (index + 1) %
                        values.length
                    ];

                await setVfoControl(
                    "agc",
                    next
                );
            }
        );
    }

});


/* =========================================================
   VFO A / B SELECTION
   ========================================================= */

txButtons.forEach(button => {
    button.addEventListener("click", async () => {

        const vfo =
            button.textContent.trim() === "VFO B"
                ? "B"
                : "A";

        try {
            const response =
                await fetch("/api/radio/vfo", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        vfo
                    })
                });

            if (!response.ok) {
                throw new Error("VFO selection failed");
            }

            await updateRadioState();

        } catch (error) {
            console.error("VFO selection error:", error);
        }
    });
});

/* =========================================================
   VFO FREQUENCY INPUT
   ========================================================= */

async function enableVfoFrequencyInput(display) {

    if (!display || display.querySelector("input")) {
        return;
    }

    const vfo =
        display.id === "vfo-a-frequency"
            ? "A"
            : "B";

    /*
        Only the active VFO may be edited.
    */
    if (
        !lastRadioState ||
        lastRadioState.activeVfo !== vfo
    ) {
        return;
    }

    const currentValue =
        display.textContent.trim();

    const input =
        document.createElement("input");

    input.type = "text";
    input.inputMode = "decimal";
    input.className = "vfo-frequency-input";
    input.value = currentValue;

    display.textContent = "";
    display.appendChild(input);

    input.focus();
    input.select();

    let finished = false;

    async function finish(save) {

        if (finished) {
            return;
        }

        finished = true;

        if (!save) {
            display.textContent = currentValue;
            return;
        }

        const value =
            input.value.trim();

        if (!value) {
            display.textContent = currentValue;
            return;
        }

        /*
            Convert 14.200.295 / 14,200,295 / 14200295
            into Hz.
        */
        const normalized =
            value
                .replace(/\s/g, "")
                .replace(/,/g, ".");

        let frequency;

        if (/^\d{1,3}\.\d{3}\.\d{3}$/.test(normalized)) {

            const parts =
                normalized.split(".");

            frequency =
                Number(parts[0]) * 1000000 +
                Number(parts[1]) * 1000 +
                Number(parts[2]);

        } else {

            frequency =
                Number(normalized);
        }

        if (
            !Number.isFinite(frequency) ||
            frequency < 30000 ||
            frequency > 75000000
        ) {
            display.textContent = currentValue;
            return;
        }

        try {

            const response =
                await fetch(
                    "/api/radio/frequency",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                frequency
                            })
                    }
                );

            if (!response.ok) {
                throw new Error(
                    "Frequency update failed"
                );
            }

            const data =
                await response.json();

            display.textContent =
                formatFrequency(data.frequency);

            await updateRadioState();

        } catch (error) {

            console.error(
                "VFO frequency update failed:",
                error
            );

            display.textContent =
                currentValue;
        }
    }

    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {
                event.preventDefault();
                finish(true);
            }

            if (event.key === "Escape") {
                event.preventDefault();
                finish(false);
            }
        }
    );

    input.addEventListener(
        "blur",
        () => finish(true)
    );
}


vfoDisplays.forEach(display => {

    display.addEventListener(
        "click",
        () => {
            enableVfoFrequencyInput(display);
        }
    );

});



/* =========================================================
   SPLIT
   ========================================================= */

const splitToggle =
    document.getElementById("split-toggle");

const splitUp5 =
    document.getElementById("split-up5");

const splitRxFrequency =
    document.getElementById("split-rx-frequency");

const splitTxFrequency =
    document.getElementById("split-tx-frequency");

const splitTxFrequencyInput =
    document.getElementById("split-tx-frequency-input");


function updateSplitDisplay(state) {

    if (!state) {
        return;
    }

    if (splitRxFrequency) {
        splitRxFrequency.textContent =
            formatFrequency(state.frequency);
    }

    if (splitTxFrequency) {
        splitTxFrequency.textContent =
            formatFrequency(state.frequencyB);
    }

    if (splitTxFrequencyInput) {
        splitTxFrequencyInput.value =
            formatFrequency(state.frequencyB);
    }

    if (splitToggle) {
        splitToggle.classList.toggle(
            "active",
            state.split === true
        );
    }
}


/*
    SPLIT ON / OFF
*/

if (splitToggle) {

    splitToggle.addEventListener(
        "click",
        async () => {

            const enabled =
                !(lastRadioState?.split === true);

            console.log(
                "SPLIT CLICK:",
                "enabled =", enabled,
                "lastRadioState =", lastRadioState
            );

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
                            body:
                                JSON.stringify({
                                    enabled
                                })
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        "SPLIT update failed"
                    );
                }

                await updateRadioState();

            } catch (error) {

                console.error(
                    "SPLIT error:",
                    error
                );
            }
        }
    );
}


/*
    SPLIT UP +5 kHz
*/

if (splitUp5) {

    splitUp5.addEventListener(
        "click",
        async () => {

            try {

                const response =
                    await fetch(
                        "/api/radio/split-up5",
                        {
                            method: "POST"
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        "SPLIT UP +5 failed"
                    );
                }

                await updateRadioState();

            } catch (error) {

                console.error(
                    "SPLIT UP +5 error:",
                    error
                );
            }
        }
    );
}


/*
    Optional direct TX frequency input
*/

if (splitTxFrequencyInput) {

    splitTxFrequencyInput.addEventListener(
        "keydown",
        async event => {

            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();

            const normalized =
                splitTxFrequencyInput.value
                    .trim()
                    .replace(/\s/g, "")
                    .replace(/,/g, ".");

            let frequency;

            if (/^\d{1,3}\.\d{3}\.\d{3}$/.test(normalized)) {

                const parts =
                    normalized.split(".");

                frequency =
                    Number(parts[0]) * 1000000 +
                    Number(parts[1]) * 1000 +
                    Number(parts[2]);

            } else {

                frequency =
                    Number(normalized);
            }

            if (
                !Number.isFinite(frequency) ||
                frequency < 30000 ||
                frequency > 75000000
            ) {
                return;
            }

            try {

                const response =
                    await fetch(
                        "/api/radio/split-frequency",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body:
                                JSON.stringify({
                                    frequency
                                })
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        "TX frequency update failed"
                    );
                }

                await updateRadioState();

            } catch (error) {

                console.error(
                    "TX frequency update failed:",
                    error
                );
            }
        }
    );
}


/* =========================================================
   CTR2-MIDI HID VFO
   ========================================================= */

(() => {
    const connectButton =
        document.getElementById("ctr2-connect");

    const status =
        document.getElementById("ctr2-status");

    if (!connectButton || !status) {
        console.warn("CTR2: UI nicht gefunden");
        return;
    }

    const CTR2_HID_VENDOR_ID = 0x2886;
    const CTR2_HID_PRODUCT_ID = 0x0056;

    // CTR2-MIDI Home Encoder:
    // CC100 / 65 = rechts
    // CC100 / 63 = links
    const CTR2_VFO_CC = 100;
    const CTR2_TUNE_STEP_HZ = 10;

    let ctr2Device = null;
    let ctr2TargetFrequency = null;
    let ctr2TargetVfo = null;
    let ctr2Busy = false;

    function setStatus(text, connected = false) {
        status.textContent = text;
        status.classList.toggle("connected", connected);
    }

    function getActiveFrequency() {
        if (!lastRadioState) {
            return null;
        }

        const vfo = lastRadioState.activeVfo === "B"
            ? "B"
            : "A";

        const frequency = vfo === "A"
            ? Number(lastRadioState.frequency)
            : Number(lastRadioState.frequencyB);

        if (!Number.isFinite(frequency)) {
            return null;
        }

        return {
            vfo,
            frequency: Math.round(frequency)
        };
    }

    async function sendFrequency(frequency) {
        const response = await fetch("/api/radio/frequency", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                frequency
            })
        });

        if (!response.ok) {
            throw new Error(
                `Frequency HTTP ${response.status}`
            );
        }

        const result = await response.json();

        if (result.success !== true) {
            throw new Error("Frequency update failed");
        }

        return result;
    }

    async function stepVfo(direction) {
        const active = getActiveFrequency();

        if (!active) {
            console.warn(
                "CTR2: keine aktive VFO-Frequenz verfügbar"
            );
            return;
        }

        /*
         * Bei schnellen Encoderbewegungen darf nicht jedes Event
         * wieder dieselbe alte Frequenz verwenden.
         * Deshalb führen wir lokal das Ziel weiter.
         */
        if (
            ctr2TargetFrequency === null ||
            ctr2TargetVfo !== active.vfo
        ) {
            ctr2TargetFrequency = active.frequency;
            ctr2TargetVfo = active.vfo;
        }

        ctr2TargetFrequency +=
            direction * CTR2_TUNE_STEP_HZ;

        const target = ctr2TargetFrequency;

        if (ctr2Busy) {
            return;
        }

        ctr2Busy = true;

        try {
            /*
             * Alle bis dahin aufgelaufenen Schritte werden
             * nacheinander verarbeitet.
             */
            while (
                ctr2TargetFrequency !== null &&
                ctr2TargetVfo ===
                    getActiveFrequency()?.vfo
            ) {
                const nextTarget =
                    ctr2TargetFrequency;

                const current =
                    getActiveFrequency();

                if (!current) {
                    break;
                }

                if (nextTarget === current.frequency) {
                    break;
                }

                await sendFrequency(nextTarget);

                /*
                 * Falls während des Requests weitere
                 * Encoder-Events kamen, bleibt das Ziel
                 * entsprechend weiter vorne.
                 */
                if (
                    ctr2TargetFrequency ===
                    nextTarget
                ) {
                    break;
                }
            }

            await updateRadioState();

        } catch (error) {
            console.error(
                "CTR2: VFO step failed:",
                error
            );

            ctr2TargetFrequency = null;
            ctr2TargetVfo = null;

        } finally {
            ctr2Busy = false;
        }
    }

    function handleInputReport(event) {
        const bytes =
            new Uint8Array(event.data.buffer);

        if (bytes.length < 3) {
            return;
        }

        const statusByte = bytes[0];
        const controller = bytes[1];
        const value = bytes[2];

        /*
         * CTR2 Home Encoder:
         *
         * B0 64 41 = rechts
         * B0 64 3F = links
         */
        if (
            statusByte !== 0xB0 ||
            controller !== CTR2_VFO_CC
        ) {
            return;
        }

        if (value === 0x41) {
            stepVfo(+1);
        } else if (value === 0x3F) {
            stepVfo(-1);
        }
    }

    async function connectCtr2() {
        if (!navigator.hid) {
            setStatus("WEBHID UNAVAILABLE");
            console.error(
                "CTR2: WebHID wird von diesem Browser nicht unterstützt"
            );
            return;
        }

        try {
            const devices =
                await navigator.hid.requestDevice({
                    filters: [
                        {
                            vendorId:
                                CTR2_HID_VENDOR_ID,
                            productId:
                                CTR2_HID_PRODUCT_ID
                        }
                    ]
                });

            if (!devices.length) {
                return;
            }

            const device = devices[0];

            if (!device.opened) {
                await device.open();
            }

            ctr2Device = device;

            device.addEventListener(
                "inputreport",
                handleInputReport
            );

            setStatus(
                "CONNECTED",
                true
            );

            connectButton.textContent =
                "CTR2 CONNECTED";

            console.log(
                "CTR2: HID connected",
                device.productName
            );

        } catch (error) {
            console.error(
                "CTR2: HID connection failed:",
                error
            );

            setStatus("ERROR");
        }
    }

    connectButton.addEventListener(
        "click",
        connectCtr2
    );

    if (navigator.hid) {
        navigator.hid.addEventListener(
            "disconnect",
            event => {
                if (
                    ctr2Device &&
                    event.device === ctr2Device
                ) {
                    ctr2Device = null;
                    ctr2TargetFrequency = null;
                    ctr2TargetVfo = null;

                    setStatus("DISCONNECTED");

                    connectButton.textContent =
                        "CONNECT CTR2";
                }
            }
        );
    }

    setStatus("DISCONNECTED");

})();

/* SHACK-SERVER AUDIO STREAM */
(() => {
    const audioButton = document.getElementById("audio-toggle");

    if (!audioButton) {
        console.warn("AUDIO: #audio-toggle nicht gefunden");
        return;
    }

    let audioSocket = null;
    let audioContext = null;
    let audioNode = null;

    // PCM-Samples, die vom WebSocket kommen.
    const sampleQueue = [];

    // Falls ein WebSocket-Paket mitten in einem 16-bit Sample endet.
    let pendingByte = null;

    function audioUrl() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${window.location.host}/audio`;
    }

    function enqueuePcm(data) {
        const bytes = new Uint8Array(data);

        let offset = 0;

        // Eventuell übrig gebliebenes Byte vom vorherigen Paket ergänzen.
        if (pendingByte !== null) {
            if (bytes.length === 0) {
                return;
            }

            const value = pendingByte | (bytes[0] << 8);
            sampleQueue.push(value < 0x8000 ? value / 32768 : (value - 0x10000) / 32768);

            pendingByte = null;
            offset = 1;
        }

        // Immer vollständige 16-bit Samples verarbeiten.
        const end = bytes.length - ((bytes.length - offset) % 2);

        for (let i = offset; i < end; i += 2) {
            const value = bytes[i] | (bytes[i + 1] << 8);
            sampleQueue.push(
                value < 0x8000
                    ? value / 32768
                    : (value - 0x10000) / 32768
            );
        }

        // Ungerades letztes Byte für das nächste Paket merken.
        if (end < bytes.length) {
            pendingByte = bytes[end];
        }

        // Schutz gegen eine immer weiter anwachsende Latenz.
        // Maximal ca. 0.5 Sekunden Audio puffern.
        const maxSamples = 48000 / 2;

        if (sampleQueue.length > maxSamples) {
            sampleQueue.splice(0, sampleQueue.length - maxSamples);
        }
    }

    function startAudioPlayback() {
        if (audioContext) {
            return;
        }

        audioContext = new AudioContext({
            sampleRate: 48000
        });

        /*
         * ScriptProcessorNode ist zwar älter, aber für unseren
         * ersten Audio-Test sehr robust und benötigt keine
         * separate AudioWorklet-Datei.
         */
        audioNode = audioContext.createScriptProcessor(4096, 0, 1);

        audioNode.onaudioprocess = (event) => {
            const output = event.outputBuffer.getChannelData(0);

            for (let i = 0; i < output.length; i++) {
                output[i] = sampleQueue.length > 0
                    ? sampleQueue.shift()
                    : 0;
            }
        };

        audioNode.connect(audioContext.destination);
    }

    function stopAudioPlayback() {
        if (audioNode) {
            audioNode.disconnect();
            audioNode.onaudioprocess = null;
            audioNode = null;
        }

        if (audioContext) {
            audioContext.close().catch(() => {});
            audioContext = null;
        }

        sampleQueue.length = 0;
        pendingByte = null;
    }

    function connectAudio() {
        if (audioSocket &&
            (audioSocket.readyState === WebSocket.OPEN ||
             audioSocket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log("AUDIO: connecting to /audio");

        audioSocket = new WebSocket(audioUrl());
        audioSocket.binaryType = "arraybuffer";

        audioSocket.onopen = async () => {
            console.log("AUDIO: WebSocket connected");

            startAudioPlayback();

            if (audioContext.state === "suspended") {
                await audioContext.resume();
            }

            audioButton.textContent = "Audio Off";
            audioButton.classList.add("active");
        };

        audioSocket.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                enqueuePcm(event.data);
            } else if (event.data instanceof Blob) {
                event.data.arrayBuffer().then(enqueuePcm);
            }
        };

        audioSocket.onerror = (error) => {
            console.error("AUDIO: WebSocket error", error);
        };

        audioSocket.onclose = () => {
            console.log("AUDIO: WebSocket disconnected");

            audioSocket = null;
            stopAudioPlayback();

            audioButton.textContent = "Audio On";
            audioButton.classList.remove("active");
        };
    }

    function disconnectAudio() {
        if (audioSocket) {
            console.log("AUDIO: disconnecting");

            audioSocket.close();
            audioSocket = null;
        }

        stopAudioPlayback();

        audioButton.textContent = "Audio On";
        audioButton.classList.remove("active");
    }

    audioButton.addEventListener("click", () => {
        if (audioSocket &&
            (audioSocket.readyState === WebSocket.OPEN ||
             audioSocket.readyState === WebSocket.CONNECTING)) {
            disconnectAudio();
        } else {
            connectAudio();
        }
    });

    console.log("AUDIO: UI initialized");
})();

/* SHACK-SERVER TX BUTTONS: TUNE / MONI */
(() => {

    const tuneButton =
        document.querySelector(".tune-button");

    const moniSlider =
        document.querySelector(".moni-slider");

    const moniValue =
        document.querySelector(".moni-value");


    if (!tuneButton || !moniSlider) {
        console.warn(
            "TX BUTTONS: controls not found"
        );
        return;
    }


    /*
     * TUNE
     */

    tuneButton.addEventListener(
        "click",
        async () => {

            if (tuneButton.disabled) {
                return;
            }

            tuneButton.disabled = true;
            tuneButton.classList.add("active");
            tuneButton.textContent = "TUNING...";

            try {

                const response =
                    await fetch(
                        "/api/radio/tune-start",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({})
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        `TUNE HTTP ${response.status}`
                    );
                }

                const result =
                    await response.json();

                if (
                    result.success !== true ||
                    result.tune !== true
                ) {
                    throw new Error(
                        "Invalid TUNE response"
                    );
                }

                console.log(
                    "TUNE: completed"
                );

            } catch (error) {

                console.error(
                    "TUNE:",
                    error
                );

            } finally {

                tuneButton.disabled = false;
                tuneButton.classList.remove("active");
                tuneButton.textContent = "TUNE";

            }

        }
    );


    /*
     * MONI
     */

    let moniBusy = false;

    moniSlider.addEventListener(
        "input",
        () => {

            if (moniValue) {
                moniValue.textContent =
                    moniSlider.value;
            }

        }
    );


    moniSlider.addEventListener(
        "change",
        async () => {

            if (moniBusy) {
                return;
            }

            moniBusy = true;
            moniSlider.disabled = true;

            const level =
                Number(moniSlider.value);

            try {

                const response =
                    await fetch(
                        "/api/radio/monitor",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                level
                            })
                        }
                    );

                if (!response.ok) {
                    throw new Error(
                        `MONI HTTP ${response.status}`
                    );
                }

                const result =
                    await response.json();

                if (
                    result.success !== true ||
                    result.monitor !== level
                ) {
                    throw new Error(
                        "Invalid MONI response"
                    );
                }

                console.log(
                    "MONI:",
                    level
                );

            } catch (error) {

                console.error(
                    "MONI:",
                    error
                );

            } finally {

                moniSlider.disabled = false;

            }

        }
    );


    console.log(
        "TX BUTTONS: UI initialized"
    );

})();


/* SHACK-SERVER PTT TOGGLE + TX AUDIO */
(() => {
    const pttButton = document.querySelector(".ptt-button");

    if (!pttButton) {
        console.warn("PTT: button not found");
        return;
    }

    let pttActive = false;
    let pttBusy = false;

    let txSocket = null;
    let micStream = null;
    let audioContext = null;
    let micSource = null;
    let processor = null;
    let silentGain = null;

    function getTxAudioUrl() {
        const protocol =
            window.location.protocol === "https:"
                ? "wss:"
                : "ws:";

        return `${protocol}//${window.location.host}/audio-tx`;
    }

    async function setCatPtt(enabled) {
        const response = await fetch("/api/radio/ptt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                enabled
            })
        });

        if (!response.ok) {
            throw new Error(`PTT HTTP ${response.status}`);
        }

        const result = await response.json();

        if (
            result.success !== true ||
            result.ptt !== enabled
        ) {
            throw new Error("Invalid PTT response");
        }
    }

    async function openTxSocket() {
        return new Promise((resolve, reject) => {
            const socket =
                new WebSocket(getTxAudioUrl());

            socket.binaryType = "arraybuffer";

            socket.addEventListener("open", () => {
                console.log("TX AUDIO: WebSocket connected");
                txSocket = socket;
                resolve();
            }, { once: true });

            socket.addEventListener("error", () => {
                reject(new Error("TX AUDIO WebSocket error"));
            }, { once: true });

            socket.addEventListener("close", () => {
                if (txSocket === socket) {
                    txSocket = null;
                }

                console.log("TX AUDIO: WebSocket closed");
            });
        });
    }

    function stopMicrophone() {
        if (processor) {
            try {
                processor.disconnect();
            } catch (_) {}

            processor.onaudioprocess = null;
            processor = null;
        }

        if (micSource) {
            try {
                micSource.disconnect();
            } catch (_) {}

            micSource = null;
        }

        if (silentGain) {
            try {
                silentGain.disconnect();
            } catch (_) {}

            silentGain = null;
        }

        if (micStream) {
            for (const track of micStream.getTracks()) {
                track.stop();
            }

            micStream = null;
        }

        if (audioContext) {
            try {
                audioContext.close();
            } catch (_) {}

            audioContext = null;
        }
    }

    function closeTxSocket() {
        if (!txSocket) {
            return;
        }

        const socket = txSocket;
        txSocket = null;

        try {
            socket.close();
        } catch (_) {}
    }

    async function startMicrophone() {
        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {
            throw new Error(
                "Mikrofonzugriff nicht verfügbar. HTTPS erforderlich."
            );
        }

        console.log("TX AUDIO: requesting microphone");

        micStream =
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

        audioContext =
            new AudioContext({
                sampleRate: 48000
            });

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        console.log(
            `TX AUDIO: AudioContext ${audioContext.sampleRate}Hz`
        );

        micSource =
            audioContext.createMediaStreamSource(
                micStream
            );

        /*
         * ScriptProcessorNode ist hier bewusst gewählt:
         * Wir benötigen rohe 16-bit PCM-Daten für aplay.
         */
        processor =
            audioContext.createScriptProcessor(
                4096,
                1,
                1
            );

        /*
         * Der Prozessor muss mit dem Audio-Graph verbunden sein,
         * damit die Callback-Verarbeitung zuverlässig läuft.
         * Der Gain steht auf 0, damit wir unser Mikrofon nicht
         * über die Lautsprecher zurückhören.
         */
        silentGain =
            audioContext.createGain();

        silentGain.gain.value = 0;

        processor.onaudioprocess = (event) => {
            if (
                !txSocket ||
                txSocket.readyState !== WebSocket.OPEN ||
                !pttActive
            ) {
                return;
            }

            const input =
                event.inputBuffer.getChannelData(0);

            const buffer =
                new ArrayBuffer(input.length * 2);

            const view =
                new DataView(buffer);

            for (let i = 0; i < input.length; i++) {
                let sample = input[i];

                if (sample > 1) {
                    sample = 1;
                } else if (sample < -1) {
                    sample = -1;
                }

                const value =
                    sample < 0
                        ? sample * 0x8000
                        : sample * 0x7fff;

                view.setInt16(
                    i * 2,
                    value,
                    true
                );
            }

            txSocket.send(buffer);
        };

        micSource.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);

        console.log("TX AUDIO: microphone streaming ready");
    }

    async function startTx() {
        if (pttBusy || pttActive) {
            return;
        }

        pttBusy = true;
        pttButton.disabled = true;

        try {
            /*
             * Erst Mikrofon vorbereiten.
             */
            await startMicrophone();

            /*
             * Dann TX-WebSocket öffnen.
             */
            await openTxSocket();

            /*
             * Erst jetzt CAT wirklich auf TX.
             */
            await setCatPtt(true);

            pttActive = true;

            pttButton.classList.add("active");
            pttButton.textContent = "TX ACTIVE";

            console.log("PTT: TX ACTIVE");

        } catch (error) {
            console.error("PTT TX:", error);

            /*
             * Sicherheit: alles wieder schließen.
             */
            stopMicrophone();
            closeTxSocket();

            /*
             * Falls CAT eventuell bereits auf TX ging,
             * sicherheitshalber wieder RX setzen.
             */
            try {
                await setCatPtt(false);
            } catch (rxError) {
                console.error(
                    "PTT: failed to restore RX",
                    rxError
                );
            }

            pttActive = false;
            pttButton.classList.remove("active");
            pttButton.textContent = "PTT";

        } finally {
            pttBusy = false;
            pttButton.disabled = false;
        }
    }

    async function stopTx() {
        if (pttBusy || !pttActive) {
            return;
        }

        pttBusy = true;
        pttButton.disabled = true;

        try {
            /*
             * Kein weiteres Mikrofon-Audio senden.
             */
            pttActive = false;

            stopMicrophone();
            closeTxSocket();

            /*
             * CAT zurück auf RX.
             */
            await setCatPtt(false);

            pttButton.classList.remove("active");
            pttButton.textContent = "PTT";

            console.log("PTT: RX");

        } catch (error) {
            console.error("PTT RX:", error);

            /*
             * Auch bei Fehlern lokale Audio-Ressourcen freigeben.
             */
            stopMicrophone();
            closeTxSocket();

            pttActive = false;
            pttButton.classList.remove("active");
            pttButton.textContent = "PTT";

        } finally {
            pttBusy = false;
            pttButton.disabled = false;
        }
    }

    pttButton.addEventListener("click", () => {
        if (pttActive) {
            stopTx();
        } else {
            startTx();
        }
    });

    /*
     * Beim Verlassen der Seite lokale Audio-Ressourcen stoppen.
     */
    window.addEventListener("beforeunload", () => {
        pttActive = false;
        stopMicrophone();
        closeTxSocket();
    });
})();

/* SHACK-SERVER SDR STREAM */
(() => {

    if (window.__shackSdrStarted) {
        console.log("SDR: already initialized");
        return;
    }

    window.__shackSdrStarted = true;

    let sdrSocket = null;
    let sdrFrames = 0;

    const spectrumCanvas =
        document.getElementById("sdr-spectrum");

    const spectrumContext =
        spectrumCanvas
            ? spectrumCanvas.getContext("2d")
            : null;

    const waterfallCanvas =
        document.getElementById("sdr-waterfall");

    const waterfallStatus =
        document.getElementById("sdr-status");

    const waterfallFrequency =
        document.getElementById("sdr-frequency");

    const vfoMarker =
        document.getElementById("sdr-vfo-marker");

    const waterfallContext =
        waterfallCanvas
            ? waterfallCanvas.getContext("2d")
            : null;

    function resizeWaterfall() {

        if (!waterfallCanvas || !waterfallContext) {
            return;
        }

        const parent =
            waterfallCanvas.parentElement;

        if (!parent) {
            return;
        }

        const width =
            Math.max(
                1,
                Math.floor(parent.clientWidth)
            );

        const height = 220;

        /*
         * Use one canvas pixel per screen pixel.
         * This keeps the waterfall rendering simple
         * and avoids devicePixelRatio coordinate issues.
         */
        waterfallCanvas.width = width;
        waterfallCanvas.height = height;

        waterfallCanvas.style.width = "100%";
        waterfallCanvas.style.height = `${height}px`;
        waterfallCanvas.style.display = "block";

        waterfallContext.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );

        waterfallContext.clearRect(
            0,
            0,
            width,
            height
        );
    }

    function resizeSpectrum() {

        if (!spectrumCanvas || !spectrumContext) {
            return;
        }

        const parent =
            spectrumCanvas.parentElement;

        if (!parent) {
            return;
        }

        const width =
            Math.max(
                1,
                Math.floor(parent.clientWidth)
            );

        const height = 190;

        spectrumCanvas.width = width;
        spectrumCanvas.height = height;

        spectrumCanvas.style.width = "100%";
        spectrumCanvas.style.height = `${height}px`;
        spectrumCanvas.style.display = "block";

        spectrumContext.setTransform(
            1,
            0,
            0,
            1,
            0,
            0
        );

        spectrumContext.clearRect(
            0,
            0,
            width,
            height
        );
    }

    resizeSpectrum();

    const SPECTRUM_AVERAGE_FRAMES = 2;
    let spectrumHistory = [];

    function drawSpectrum(data) {

        if (
            !spectrumCanvas ||
            !spectrumContext
        ) {
            return;
        }

        const bins =
            data.getUint16(0, true);

        /*
         * Keep the last 4 FFT frames.
         */
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

        /*
         * Average the FFT frames.
         */
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

        /*
         * Display smoothing.
         * The FFT still uses 2 frames.
         * This only makes the displayed curve slower.
         */
        const SPECTRUM_SMOOTHING = 0.18;

        if (
            !window.__spectrumDisplayFrame ||
            window.__spectrumDisplayFrame.length !== bins
        ) {
            window.__spectrumDisplayFrame =
                new Float32Array(averagedFrame);
        } else {
            const displayFrame =
                window.__spectrumDisplayFrame;

            for (let i = 0; i < bins; i++) {
                displayFrame[i] +=
                    (averagedFrame[i] - displayFrame[i]) *
                    SPECTRUM_SMOOTHING;
            }
        }

        const displayFrame =
            window.__spectrumDisplayFrame;

        const rect =
            spectrumCanvas.getBoundingClientRect();

        const width =
            Math.max(1, Math.floor(rect.width));

        const height =
            Math.max(1, Math.floor(rect.height));

        /*
         * Fixed spectrum scale.
         *
         * This prevents the spectrum from
         * jumping up and down with every FFT frame.
         */
        const floorDb = -120;
        const ceilingDb = -40;
        const rangeDb = ceilingDb - floorDb;

        spectrumContext.clearRect(
            0,
            0,
            width,
            height
        );

        /*
         * Subtle horizontal reference grid.
         */
        spectrumContext.lineWidth = 1;
        spectrumContext.strokeStyle =
            "rgba(255,255,255,0.07)";

        for (let db = -120; db <= -40; db += 20) {

            const y =
                height -
                8 -
                ((db - floorDb) / rangeDb) *
                (height - 20);

            spectrumContext.beginPath();
            spectrumContext.moveTo(0, y);
            spectrumContext.lineTo(width, y);
            spectrumContext.stroke();
        }

        /*
         * Build spectrum path.
         */
        spectrumContext.beginPath();

        for (let x = 0; x < width; x++) {

            /*
             * Display only the 20 m amateur band.
             * The RSP1B still delivers the full 2 MHz FFT.
             */
            const bandStart = 14000000;
            const bandEnd = 14350000;
            const centerFrequency = 14100000;
            const sampleRate = 2000000;

            const fftStartFrequency =
                centerFrequency - (sampleRate / 2);

            const startBin =
                Math.max(
                    0,
                    Math.floor(
                        (bandStart - fftStartFrequency) /
                        sampleRate * bins
                    )
                );

            const endBin =
                Math.min(
                    bins - 1,
                    Math.ceil(
                        (bandEnd - fftStartFrequency) /
                        sampleRate * bins
                    )
                );

            const bin =
                Math.min(
                    endBin,
                    startBin +
                    Math.floor(
                        x * (endBin - startBin) / width
                    )
                );

            const db =
                displayFrame[bin];

            let level =
                (db - floorDb) / rangeDb;

            level =
                Math.max(
                    0,
                    Math.min(1, level)
                );

            const y =
                height -
                8 -
                (level * (height - 20));

            if (x === 0) {
                spectrumContext.moveTo(x, y);
            } else {
                spectrumContext.lineTo(x, y);
            }
        }

        /*
         * Fill the area below the spectrum.
         * Darker than the cyan trace.
         */
        spectrumContext.save();

        spectrumContext.lineTo(
            width,
            height - 8
        );

        spectrumContext.lineTo(
            0,
            height - 8
        );

        spectrumContext.closePath();

        spectrumContext.fillStyle =
            "rgba(10, 65, 95, 0.60)";

        spectrumContext.fill();

        spectrumContext.restore();

        /*
         * Draw the actual spectrum trace.
         */
        spectrumContext.beginPath();

        for (let x = 0; x < width; x++) {

            /*
             * Display only the 20 m amateur band.
             * The RSP1B still delivers the full 2 MHz FFT.
             */
            const bandStart = 14000000;
            const bandEnd = 14350000;
            const centerFrequency = 14100000;
            const sampleRate = 2000000;

            const fftStartFrequency =
                centerFrequency - (sampleRate / 2);

            const startBin =
                Math.max(
                    0,
                    Math.floor(
                        (bandStart - fftStartFrequency) /
                        sampleRate * bins
                    )
                );

            const endBin =
                Math.min(
                    bins - 1,
                    Math.ceil(
                        (bandEnd - fftStartFrequency) /
                        sampleRate * bins
                    )
                );

            const bin =
                Math.min(
                    endBin,
                    startBin +
                    Math.floor(
                        x * (endBin - startBin) / width
                    )
                );

            const db =
                displayFrame[bin];

            let level =
                (db - floorDb) / rangeDb;

            level =
                Math.max(
                    0,
                    Math.min(1, level)
                );

            const y =
                height -
                8 -
                (level * (height - 20));

            if (x === 0) {
                spectrumContext.moveTo(x, y);
            } else {
                spectrumContext.lineTo(x, y);
            }
        }

        spectrumContext.strokeStyle =
            "#39b8e8";

        spectrumContext.lineWidth = 1;

        spectrumContext.stroke();

        /*
         * Bottom reference line.
         */
        spectrumContext.beginPath();

        spectrumContext.moveTo(
            0,
            height - 8
        );

        spectrumContext.lineTo(
            width,
            height - 8
        );

        spectrumContext.strokeStyle =
            "rgba(255,255,255,0.15)";

        spectrumContext.lineWidth = 1;

        spectrumContext.stroke();
    }


    function drawWaterfall(data) {

        if (
            !waterfallCanvas ||
            !waterfallContext
        ) {
            return;
        }

        const bins =
            data.getUint16(0, true);

        const rect =
            waterfallCanvas.getBoundingClientRect();

        const width =
            Math.max(1, Math.floor(rect.width));

        const height =
            Math.max(1, Math.floor(rect.height));

        /*
         * Move the existing waterfall down
         * by exactly one pixel.
         *
         * Using ImageData avoids problems caused by
         * drawing the canvas onto itself.
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

        /*
         * Find the current FFT range.
         */
        let minDb = Infinity;
        let maxDb = -Infinity;

        for (let i = 0; i < bins; i++) {

            const db =
                data.getFloat32(
                    2 + (i * 4),
                    true
                );

            if (Number.isFinite(db)) {
                minDb = Math.min(minDb, db);
                maxDb = Math.max(maxDb, db);
            }
        }

        if (
            !Number.isFinite(minDb) ||
            !Number.isFinite(maxDb)
        ) {
            return;
        }

        /*
         * Keep the contrast reasonably stable.
         */
        const floor =
            Math.max(-120, maxDb - 65);

        const range =
            Math.max(1, maxDb - floor);

        const image =
            waterfallContext.createImageData(
                width,
                1
            );

        for (let x = 0; x < width; x++) {

            /*
             * Display only the 20 m amateur band.
             * The RSP1B still delivers the full 2 MHz FFT.
             */
            const bandStart = 14000000;
            const bandEnd = 14350000;
            const centerFrequency = 14100000;
            const sampleRate = 2000000;

            const fftStartFrequency =
                centerFrequency - (sampleRate / 2);

            const startBin =
                Math.max(
                    0,
                    Math.floor(
                        (bandStart - fftStartFrequency) /
                        sampleRate * bins
                    )
                );

            const endBin =
                Math.min(
                    bins - 1,
                    Math.ceil(
                        (bandEnd - fftStartFrequency) /
                        sampleRate * bins
                    )
                );

            const bin =
                Math.min(
                    endBin,
                    startBin +
                    Math.floor(
                        x * (endBin - startBin) / width
                    )
                );

            const db =
                data.getFloat32(
                    2 + (bin * 4),
                    true
                );

            let level =
                (db - floor) / range;

            level =
                Math.max(
                    0,
                    Math.min(1, level)
                );

            /*
             * Simple blue/cyan/yellow/white
             * SDR-style spectrum palette.
             */
            let r;
            let g;
            let b;

            if (level < 0.25) {

                const t =
                    level / 0.25;

                r = 0;
                g = Math.round(20 + 80 * t);
                b = Math.round(45 + 110 * t);

            } else if (level < 0.5) {

                const t =
                    (level - 0.25) / 0.25;

                r = 0;
                g = Math.round(100 + 100 * t);
                b = Math.round(155 - 100 * t);

            } else if (level < 0.75) {

                const t =
                    (level - 0.5) / 0.25;

                r = Math.round(255 * t);
                g = 200;
                b = Math.round(55 * (1 - t));

            } else {

                const t =
                    (level - 0.75) / 0.25;

                r = 255;
                g = Math.round(200 + 55 * t);
                b = Math.round(50 + 205 * t);
            }

            const index =
                x * 4;

            image.data[index] = r;
            image.data[index + 1] = g;
            image.data[index + 2] = b;
            image.data[index + 3] = 255;
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

        /*
         * Currently displayed amateur band.
         */
        const bandStart = 14000000;
        const bandEnd = 14350000;

        const currentFrequency =
            Number(
                lastRadioState?.frequency
            );

        if (!Number.isFinite(currentFrequency)) {
            return;
        }

        const position =
            (
                currentFrequency - bandStart
            ) / (bandEnd - bandStart);

        const clamped =
            Math.max(
                0,
                Math.min(1, position)
            );

        vfoMarker.style.left =
            `${clamped * 100}%`;

        /*
         * Show the actual VFO frequency
         * above the marker.
         */
        vfoMarker.textContent =
            `${(currentFrequency / 1000000).toFixed(3)} MHz`;
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

        console.log("SDR: connecting to /sdr");

        sdrSocket = new WebSocket(sdrUrl());
        sdrSocket.binaryType = "arraybuffer";

        sdrSocket.onopen = () => {

            console.log("SDR: WebSocket connected");

            if (waterfallStatus) {
                waterfallStatus.textContent = "CONNECTED";
                waterfallStatus.classList.add("connected");
            }
        };

        sdrSocket.onmessage = (event) => {

            if (typeof event.data === "string") {

                try {
                    const message = JSON.parse(event.data);

                    console.log("SDR:", message);

                } catch (error) {

                    console.warn(
                        "SDR: invalid JSON",
                        error
                    );
                }

                return;
            }

            if (!(event.data instanceof ArrayBuffer)) {
                return;
            }

            const data = new DataView(event.data);

            if (data.byteLength < 2) {
                return;
            }

            const bins = data.getUint16(0, true);

            if (bins !== 8192) {
                console.warn(
                    "SDR: unexpected FFT size:",
                    bins
                );
                return;
            }

            sdrFrames++;

            drawSpectrum(data);
            drawWaterfall(data);
            updateVfoMarker();

            if (waterfallStatus) {
                waterfallStatus.textContent =
                    "CONNECTED";
                waterfallStatus.classList.add(
                    "connected"
                );
            }

            if (waterfallFrequency) {
                waterfallFrequency.textContent =
                    "14.100.000 MHz";
            }

            if (
                sdrFrames === 1 ||
                sdrFrames % 50 === 0
            ) {

                const firstDb =
                    data.getFloat32(2, true);

                const centerDb =
                    data.getFloat32(
                        2 + (1024 * 4),
                        true
                    );

                console.log(
                    `SDR: FFT frame ${sdrFrames}`,
                    `first=${firstDb.toFixed(1)} dB`,
                    `center=${centerDb.toFixed(1)} dB`
                );
            }

            /*
             * Waterfall renderer will consume
             * the FFT bins here.
             */
        };

        sdrSocket.onerror = (error) => {
            console.error(
                "SDR: WebSocket error",
                error
            );
        };

        sdrSocket.onclose = () => {

            console.log(
                "SDR: WebSocket disconnected"
            );

            sdrSocket = null;

            if (waterfallStatus) {
                waterfallStatus.textContent = "DISCONNECTED";
                waterfallStatus.classList.remove("connected");
            }

            /*
             * Reconnect automatically.
             */
            setTimeout(() => {
                connectSdr();
            }, 2000);
        };
    }

    /*
     * Start immediately.
     */
    /*
     * Keep the canvas backing resolution synchronized
     * with its actual displayed size.
     */
    if (waterfallCanvas && typeof ResizeObserver !== "undefined") {

        const waterfallObserver =
            new ResizeObserver(() => {
                resizeWaterfall();
            });

        waterfallObserver.observe(
            waterfallCanvas
        );

    } else {

        window.addEventListener(
            "resize",
            resizeWaterfall
        );
    }

    resizeWaterfall();

    requestAnimationFrame(() => {
        resizeWaterfall();
    });

    setTimeout(() => {
        resizeWaterfall();
    }, 250);

    connectSdr();

})();

