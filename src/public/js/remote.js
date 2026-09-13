const vfoDisplays = document.querySelectorAll(".frequency");
const connection = document.querySelector(".connection");
const powerDisplay = document.querySelector(".power-number");
const powerSlider = document.querySelector(".power-slider");
const rfGainSlider = document.querySelector("#rf-gain-slider");
const afGainSlider = document.querySelector("#af-gain-slider");
const sMeterNeedle = document.querySelector(".meter-needle");
const powerNeedle = document.querySelector(".power-needle");
const modeButtons = document.querySelectorAll(".mode-grid button");
const vfoBadges = document.querySelectorAll(".vfo-status");
const txButtons = document.querySelectorAll(".small-tx");

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

        // VFO A
        if (vfoDisplays[0]) {
            vfoDisplays[0].textContent =
                formatFrequency(data.frequency);
        }

        // VFO B
        if (vfoDisplays[1]) {
            vfoDisplays[1].textContent =
                formatFrequency(data.frequencyB);
        }

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

        // DSP status
        const dspNotch = document.querySelector("#dsp-notch");
        const dspContour = document.querySelector("#dsp-contour");
        const dspDnr = document.querySelector("#dsp-dnr");
        const dspNb = document.querySelector("#dsp-nb");

        if (dspNotch) {
            const toggle = dspNotch.querySelector(".toggle-button");
            const value = dspNotch.querySelector("strong");

            if (toggle) {
                toggle.textContent = data.notch ? "ON" : "OFF";
                toggle.classList.toggle("dsp-on", !!data.notch);
            }

            if (value) {
                const hz = Number(data.notchFrequency) || 0;
                value.textContent =
                    hz >= 1000
                        ? `${(hz / 1000).toFixed(3)} kHz`
                        : `${hz} Hz`;
            }
        }

        if (dspContour) {
            const toggle = dspContour.querySelector(".toggle-button");
            const value = dspContour.querySelector("strong");

            if (toggle) {
                toggle.textContent = data.contour ? "ON" : "OFF";
                toggle.classList.toggle("dsp-on", !!data.contour);
            }

            if (value) {
                const hz = Number(data.contourFrequency) || 0;
                value.textContent =
                    hz >= 1000
                        ? `${(hz / 1000).toFixed(3)} kHz`
                        : `${hz} Hz`;
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
