async function loadStationInfo() {

    try {

        const response = await fetch('/api/station');

        const station = await response.json();


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


window.addEventListener(
    "componentsLoaded",
    loadStationInfo
);

// Fallback falls Komponenten bereits geladen wurden
loadStationInfo();
