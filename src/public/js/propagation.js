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
            Array.isArray(data.radios)
                ? data.radios
                : [];

        station.innerHTML = "";

        if (!radios.length) {
            return;
        }

        /*
         * Only radios enabled in
         * radios.config.ts are shown.
         */
        const availableRadios =
            radios.filter(
                radio =>
                    radio &&
                    radio.id &&
                    radio.name
            );

        if (!availableRadios.length) {
            return;
        }

        const activeRadio =
            availableRadios.find(
                radio =>
                    radio.active
            ) ||
            availableRadios[0];

        /*
         * Container keeps the selector
         * to the left of the active radio.
         */
        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "station-inline-wrapper";


        /*
         * Radio selector
         */
        const select =
            document.createElement(
                "select"
            );

        select.className =
            "station-inline-selector";

        select.setAttribute(
            "aria-label",
            "Active Transceiver"
        );


        availableRadios.forEach(
            radio => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(
                        radio.id
                    );

                option.textContent =
                    radio.name;

                if (
                    radio.id ===
                    activeRadio.id
                ) {
                    option.selected =
                        true;
                }

                select.appendChild(
                    option
                );

            }
        );


        /*
         * Change active radio.
         */
        select.addEventListener(
            "change",
            async event => {

                const target =
                    event.target;

                if (
                    !(target instanceof
                    HTMLSelectElement)
                ) {
                    return;
                }

                const radioId =
                    target.value;

                if (!radioId) {
                    return;
                }

                select.disabled =
                    true;

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
                                                radioId
                                        }
                                    )

                            }
                        );

                    if (!response.ok) {

                        throw new Error(
                            `HTTP ${response.status}`
                        );

                    }

                    await updateStationInline();

                }
                catch (error) {

                    console.error(
                        "Active radio change failed:",
                        error
                    );

                    select.value =
                        String(
                            activeRadio.id
                        );

                }
                finally {

                    select.disabled =
                        false;

                }

            }
        );


        /*
         * Active radio card
         */
        const frequency =
            activeRadio.frequency
                ? `${(
                    activeRadio.frequency /
                    1000000
                ).toFixed(3)} MHz`
                : "---.--- MHz";

        const mode =
            activeRadio.mode ||
            "--";

        const power =
            `${activeRadio.power ?? 0} W`;

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "station-inline-radio";


        if (
            !activeRadio.connected
        ) {

            card.classList.add(
                "disconnected"
            );

        }
        else {

            card.classList.add(
                "active"
            );

        }


        card.innerHTML = `
            <div class="station-inline-top">

                <span class="station-inline-name">
                    ${activeRadio.name}
                </span>

                <span class="station-inline-cat">

                    <span
                        class="cat-dot ${
                            activeRadio.connected
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


        wrapper.appendChild(
            select
        );

        wrapper.appendChild(
            card
        );

        station.appendChild(
            wrapper
        );

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
