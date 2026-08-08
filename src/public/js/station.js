async function loadStationInfo() {

    try {

        const response =
            await fetch('/api/station');

        const station =
            await response.json();

        const operator =
            document.getElementById("operator");

        const locator =
            document.getElementById("locator");

        console.log("Station data:", station);
        console.log("Operator element:", operator);

        if (operator) {
            operator.textContent =
                `${station.callsign}, ${station.name}`;
        }

        if (locator) {
            locator.textContent =
                `📍 ${station.locator}`;
        }

    } catch (error) {

        console.error(
            "Station info loading failed:",
            error
        );

    }

}


async function loadRadioInfo() {

    try {

        const response =
            await fetch('/api/radio');

        const radio =
            await response.json();

        console.log("Radio data:", radio);


        const radioElement =
            document.getElementById("station-radio");

        const catElement =
            document.getElementById("station-cat");

        const frequencyElement =
            document.getElementById("station-frequency");

        const modeElement =
            document.getElementById("station-mode");

        const powerElement =
            document.getElementById("station-power");

	const statusElement =
    	      document.getElementById("station-status");

        if (radioElement) {
            radioElement.textContent =
                radio.radio || "--";
        }


        if (catElement) {
            catElement.textContent =
                radio.connected
                    ? "Connected"
                    : "Disconnected";
        }


        if (frequencyElement) {
            frequencyElement.textContent =
                radio.frequency
                    ? `${(radio.frequency / 1000000).toFixed(3)} MHz`
                    : "--";
        }


        if (modeElement) {
            modeElement.textContent =
                radio.mode || "--";
        }


        if (powerElement) {
            powerElement.textContent =
                `${radio.power ?? 0} W`;
        }


if (statusElement) {

    statusElement.textContent =
        radio.connected
            ? "Radio connected"
            : "Radio disconnected";

    statusElement.className =
        radio.connected
            ? "status-ok"
            : "status-warning";
}

    } catch (error) {

        console.error(
            "Radio info loading failed:",
            error
        );

    }

}


// Station information
window.addEventListener(
    "componentsLoaded",
    loadStationInfo
);

// Radio information
window.addEventListener(
    "componentsLoaded",
    loadRadioInfo
);


// Fallback falls Komponenten bereits geladen wurden
loadStationInfo();
loadRadioInfo();


function updateUTCClock() {

    const clock =
        document.getElementById(
            "utcClock"
        );

    if (!clock) {
        return;
    }

    clock.textContent =
        new Date()
            .toISOString()
            .substring(11, 19)
        + " UTC";
}


updateUTCClock();

setInterval(
    updateUTCClock,
    1000
);


// Radio-Daten regelmässig aktualisieren
setInterval(
    loadRadioInfo,
    2000
);
