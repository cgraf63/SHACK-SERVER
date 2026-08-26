async function updatePropagation() {

    try {

        const response =
            await fetch(
                '/api/propagation'
            );

        const data =
            await response.json();


        const solarFlux =
            document.getElementById(
                'solarFlux'
            );

        const aIndex =
            document.getElementById(
                'aIndex'
            );

        const kIndex =
            document.getElementById(
                'kIndex'
            );


        if (solarFlux) {

            solarFlux.textContent =
                data.solarFlux;

        }


        if (aIndex) {

            aIndex.textContent =
                data.aIndex;

        }


        if (kIndex) {

            kIndex.textContent =
                data.kIndex;

        }


        if (data.bands) {

            updateBandGraph(
                data.bands
            );

        }

    }
    catch (error) {

        console.error(
            'Propagation update failed:',
            error
        );

    }

}



async function updateStationInline() {

    try {

        const response =
            await fetch(
                '/api/radio'
            );

        const data =
            await response.json();


        const station =
            document.getElementById(
                'station-inline-content'
            );


        if (!station) {

            return;

        }


        const radios =
            data.radios || [];


        station.innerHTML = "";


        radios.forEach(
            radio => {

                const frequency =
                    radio.frequency
                        ? `${(
                            radio.frequency /
                            1000000
                        ).toFixed(3)} MHz`
                        : '---.--- MHz';


                const mode =
                    radio.mode || '--';


                const power =
                    `${radio.power ?? 0} W`;


                const connection =
                    radio.connected
                        ? 'CAT Connected'
                        : 'CAT Disconnected';


                const card =
                    document.createElement(
                        'div'
                    );


                card.className =
                    'station-inline-radio';


                if (
                    radio.active
                ) {

                    card.classList.add(
                        'active'
                    );

                }


                if (
                    !radio.connected
                ) {

                    card.classList.add(
                        'disconnected'
                    );

                }


                card.innerHTML = `

                    <div class="station-inline-name">

                        ${radio.name}

                    </div>


                    <div class="station-inline-bottom">

                        <span class="station-inline-data">

                            ${frequency}
                            ·
                            ${mode}
                            ·
                            ${power}

                        </span>


                        <span class="station-inline-cat">

                            <span class="cat-dot"></span>

                            ${connection}

                        </span>

                    </div>

                `;


                card.addEventListener(
                    'click',
                    async () => {

                        if (
                            radio.id ===
                            data.activeRadioId
                        ) {

                            return;

                        }


                        try {

                            const response =
                                await fetch(
                                    '/api/radio/active',
                                    {

                                        method: 'POST',

                                        headers: {
                                            'Content-Type':
                                                'application/json'
                                        },

                                        body:
                                            JSON.stringify(
                                                {
                                                    radioId:
                                                        radio.id
                                                }
                                            )

                                    }
                                );


                            if (
                                !response.ok
                            ) {

                                throw new Error(
                                    `HTTP ${response.status}`
                                );

                            }


                            updateStationInline();

                        }
                        catch (error) {

                            console.error(
                                'Active radio change failed:',
                                error
                            );

                        }

                    }
                );


                station.appendChild(
                    card
                );

            }
        );

    }
    catch (error) {

        console.error(
            'Station inline update failed:',
            error
        );

    }

}



window.addEventListener(
    "componentsLoaded",
    () => {

        updatePropagation();

        updateStationInline();

    }
);


updatePropagation();

updateStationInline();
