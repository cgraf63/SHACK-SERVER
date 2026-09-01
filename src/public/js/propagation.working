/*
    Propagation update
*/

async function updatePropagation() {

    try {

        const response =
            await fetch(
                "/api/propagation"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const solarFlux =
            document.getElementById(
                "solarFlux"
            );


        const aIndex =
            document.getElementById(
                "aIndex"
            );


        const kIndex =
            document.getElementById(
                "kIndex"
            );


        if (solarFlux) {

            solarFlux.textContent =
                data.solarFlux ??
                "--";

        }


        if (aIndex) {

            aIndex.textContent =
                data.aIndex ??
                "--";

        }


        if (kIndex) {

            kIndex.textContent =
                data.kIndex ??
                "--";

        }


        if (
            Array.isArray(
                data.bands
            )
        ) {

            updateBandGraph(
                data.bands
            );

        }

    }
    catch (error) {

        console.error(
            "Propagation update failed:",
            error
        );

    }

}



/*
    Update propagation bands

    The API returns:

    [
        {
            band: "6m",
            score: 20,
            condition: "Poor"
        }
    ]

    We display narrow floating
    horizontal lines with a vertical
    position based on the score.
*/

function updateBandGraph(
    bands
) {

    const graph =
        document.getElementById(
            "bandGraph"
        );


    if (!graph) {

        return;

    }


    graph.innerHTML =
        "";


    const width =
        600;


    const height =
        40;


    const bandNames = [

        "6m",
        "10m",
        "12m",
        "15m",
        "17m",
        "20m",
        "30m",
        "40m",
        "60m",
        "80m"

    ];


    /*
        Convert API array into
        an easy lookup object
    */

    const bandScores =
        {};


    bands.forEach(
        item => {

            bandScores[
                item.band
            ] =
                Number(
                    item.score
                );

        }
    );


    const segmentWidth =
        width /
        bandNames.length;


    /*
        Horizontal line width

        Approximately 30% narrower
        than the previous version.
    */

    const lineWidth =
        segmentWidth *
        0.45;


    const lineHeight =
        3;


    bandNames.forEach(
        (
            band,
            index
        ) => {

            const value =
                bandScores[
                    band
                ];


            let normalized =
                Number.isFinite(
                    value
                )
                    ? value
                    : 0;


            normalized =
                Math.max(
                    0,
                    Math.min(
                        100,
                        normalized
                    )
                );


            /*
                Higher score =
                higher floating line
            */

            const usableHeight =
                height -
                lineHeight;


            const y =
                usableHeight -
                (
                    normalized /
                    100
                ) *
                usableHeight;


            /*
                Center the line
                inside its segment
            */

            const x =
                index *
                segmentWidth +
                (
                    segmentWidth -
                    lineWidth
                ) /
                2;


            const rect =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect"
                );


            rect.setAttribute(
                "x",
                String(
                    x
                )
            );


            rect.setAttribute(
                "y",
                String(
                    y
                )
            );


            rect.setAttribute(
                "width",
                String(
                    lineWidth
                )
            );


            rect.setAttribute(
                "height",
                String(
                    lineHeight
                )
            );


            rect.setAttribute(
                "rx",
                "1.5"
            );


            /*
                Colour according
                to propagation score
            */

            if (
                normalized >= 70
            ) {

                rect.setAttribute(
                    "fill",
                    "#27d17f"
                );

            }
            else if (
                normalized >= 40
            ) {

                rect.setAttribute(
                    "fill",
                    "#f0b429"
                );

            }
            else {

                rect.setAttribute(
                    "fill",
                    "#e05252"
                );

            }


            graph.appendChild(
                rect
            );

        }
    );

}



/*
    Update inline station status
*/

async function updateStationInline() {

    try {

        const response =
            await fetch(
                "/api/radio"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const station =
            document.getElementById(
                "station-inline-content"
            );


        if (!station) {

            return;

        }


        const radios =
            data.radios ||
            [];


        station.innerHTML =
            "";


        radios.forEach(
            radio => {

                const frequency =
                    radio.frequency
                        ? `${(
                            radio.frequency /
                            1000000
                        ).toFixed(
                            3
                        )} MHz`
                        : "---.--- MHz";


                const mode =
                    radio.mode ||
                    "--";


                const power =
                    `${radio.power ?? 0} W`;


                const catStatus =
                    radio.connected
                        ? "CAT Connected"
                        : "CAT Disconnected";


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "station-inline-radio";


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

card.innerHTML = `

    <div class="station-inline-top">

        <span class="station-inline-name">

            ${radio.name}

        </span>

        <span class="station-inline-cat">

            <span
    class="cat-dot ${
        radio.connected
            ? "connected"
            : "disconnected"
    }"
></span>

CAT

        </span>

    </div>


    <div class="station-inline-bottom">

        <span class="station-inline-data">

            ${frequency}
            ·
            ${mode}
            ·
            ${power}

        </span>

    </div>

`;


                card.addEventListener(
                    "click",
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
                                    "/api/radio/active",
                                    {

                                        method:
                                            "POST",

                                        headers: {

                                            "Content-Type":
                                                "application/json"

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
                                "Active radio change failed:",
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


        /*
            Fallback
        */

        if (
            radios.length === 0
        ) {

            station.textContent =
                "Not configured";

        }

    }
    catch (error) {

        console.error(
            "Station inline update failed:",
            error
        );

    }

}



/*
    Initialize after components
    are dynamically loaded
*/

function initializePropagation() {

    updatePropagation();

    updateStationInline();

}



/*
    Normal component loader event
*/

window.addEventListener(
    "componentsLoaded",
    () => {

        initializePropagation();

    }
);



/*
    Fallback.

    If propagation.js is loaded
    after the componentsLoaded event,
    wait briefly and try again.
*/

setTimeout(
    () => {

        const propagation =
            document.getElementById(
                "solarFlux"
            );


        if (
            propagation
        ) {

            initializePropagation();

        }

    },
    500
);
