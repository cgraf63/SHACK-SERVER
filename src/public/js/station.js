async function loadStationInfo() {

    try {

        const response =
            await fetch(
                "/api/settings?_=" + Date.now(),
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const settings =
            await response.json();

        const operator =
            document.getElementById(
                "operator"
            );

        const locator =
            document.getElementById(
                "locator"
            );

        console.log(
            "Settings data:",
            settings
        );

        console.log(
            "Operator element:",
            operator
        );


        if (operator) {

            operator.textContent =
                `${settings.callsign ?? ""}, ${settings.operatorName ?? ""}`;

        }


        if (locator) {

            locator.textContent =
                `📍 ${settings.locator ?? ""}`;

        }

    }
    catch (error) {

        console.error(
            "Station info loading failed:",
            error
        );

    }

}

function updateCwMemoryTooltips(cwMemories) {

    const buttons =
        document.querySelectorAll(
            ".cw-memory"
        );

    buttons.forEach(
        (button, index) => {

            button.title =
                cwMemories[index] || "";

        }
    );
}


let cwMemoryBusy = false;


document.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                ".cw-memory"
            );

        if (!button || cwMemoryBusy) {
            return;
        }

        const memory =
            Number(button.textContent.trim());

        if (
            !Number.isInteger(memory) ||
            memory < 1 ||
            memory > 5
        ) {
            return;
        }

        cwMemoryBusy = true;

        const buttons =
            document.querySelectorAll(
                ".cw-memory"
            );

        buttons.forEach(
            item => {
                item.disabled = true;
            }
        );

        button.classList.add(
            "active"
        );

        console.log(
            "CW memory requested:",
            memory
        );

        try {

            const response =
                await fetch(
                    "/api/radio/cw-memory",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            memory: memory
                        })
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
                "CW memory sent:",
                data
            );

        }
        catch (error) {

            console.error(
                "CW memory failed:",
                error
            );

        }
        finally {

            button.classList.remove(
                "active"
            );

            buttons.forEach(
                item => {
                    item.disabled = false;
                }
            );

            cwMemoryBusy = false;

        }

    }
);


async function loadRadioInfo() {

    try {

        const response =
            await fetch('/api/radio');

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        updateCwMemoryTooltips(
            data.cwMemories || []
        );


        console.log(
            "Radio data:",
            data
        );


        const container =
            document.getElementById(
                "station-radios"
            );


        const statusElement =
            document.getElementById(
                "station-status"
            );


        if (!container) {

            return;

        }


        container.innerHTML = "";


        const radios =
            data.radios || [];


        if (
            radios.length === 0
        ) {

            container.innerHTML = `
                <div class="station-radio-placeholder">
                    No radios configured
                </div>
            `;

            return;

        }


        radios.forEach(
            radio => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "station-radio-card";


                if (
                    radio.active
                ) {

                    card.classList.add(
                        "active"
                    );

                }


                if (
                    !radio.connected
                ) {

                    card.classList.add(
                        "disconnected"
                    );

                }


                const frequency =
                    radio.frequency
                        ? `${
                            (
                                radio.frequency /
                                1000000
                            ).toFixed(3)
                        } MHz`
                        : "---.--- MHz";


                const mode =
                    radio.mode ||
                    "--";


                const power =
                    `${radio.power ?? 0} W`;


                const connection =
                    radio.connected
                        ? "CAT Connected"
                        : "CAT Disconnected";


                card.innerHTML = `

                    <div class="station-radio-name">

                        📻
                        ${radio.name}

                    </div>


                    <div class="station-radio-frequency">

                        ${frequency}

                    </div>


                    <div class="station-radio-details">

                        ${mode}
                        ·
                        ${power}

                    </div>


                    <div class="station-radio-connection">

                        ${
                            radio.connected
                                ? "●"
                                : "○"
                        }

                        ${connection}

                    </div>

                `;


                card.addEventListener(
                    "click",
                    async () => {

                        try {

                            const response =
                                await fetch(
                                    "/api/radio/active",
                                    {

                                        method:
                                            "POST",

                                        headers: {

                                            "Content-Type":
                                                "application/json"

                                        },

                                        body:
                                            JSON.stringify({

                                                radioId:
                                                    radio.id

                                            })

                                    }
                                );


                            if (
                                !response.ok
                            ) {

                                throw new Error(
                                    "Failed to select radio"
                                );

                            }


                            console.log(
                                "Active radio selected:",
                                radio.id
                            );


                            loadRadioInfo();

                        }
                        catch (error) {

                            console.error(
                                "Radio selection failed:",
                                error
                            );

                        }

                    }
                );


                container.appendChild(
                    card
                );

            }
        );


        if (statusElement) {

            const activeRadio =
                radios.find(
                    radio =>
                        radio.active
                );


            if (activeRadio) {

                statusElement.textContent =
                    `${activeRadio.name} active`;

                statusElement.className =
                    "status-ok";

            }
            else {

                statusElement.textContent =
                    "No active radio";

                statusElement.className =
                    "status-warning";

            }

        }

    }
    catch (error) {

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

// Station/Settings regelmässig aktualisieren
setInterval(
    loadStationInfo,
    2000
);
