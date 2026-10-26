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

const sidcF107 =
    document.getElementById(
        "sidc-f107"
    );


const sidcAp =
    document.getElementById(
        "sidc-ap"
    );


const sidcF107Scale =
    document.getElementById(
        "sidc-f107-scale"
    );


const sidcApScale =
    document.getElementById(
        "sidc-ap-scale"
    );


if (
    data.sidc
) {

    if (sidcF107) {

        sidcF107.textContent =
            data.sidc.solarFlux ??
            "--";

    }


    if (sidcAp) {

        sidcAp.textContent =
            data.sidc.ap ??
            "--";

    }


    if (sidcF107Scale) {

        sidcF107Scale.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    ((data.sidc.solarFlux - 70) / 100) * 100
                )
            )}%`;

    }


    if (sidcApScale) {

        sidcApScale.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    (data.sidc.ap / 40) * 100
                )
            )}%`;

    }

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
                ? Number(activeRadio.frequency).toLocaleString("de-CH")
                : "---.---.---";

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

        const remoteButton =
            document.createElement("button");

        remoteButton.className =
            "station-remote-button";

        remoteButton.type =
            "button";

        remoteButton.textContent =
            "FTDX10";

        remoteButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                window.location.href =
                    "/remote.html";

            }
        );

        /*
         * The remote page (remote.html) is made for the
         * Yaesu FTDX10 - show the button only for it.
         */
        if (
            String(activeRadio.protocol || "").toLowerCase() ===
            "ftdx10"
        ) {

            wrapper.appendChild(
                remoteButton
            );

        }

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
    Leichter 2s-Poll: aktualisiert nur Frequenz/Mode/Power
    und CAT-Status im bestehenden Inline-Block, ohne das
    Select neu zu bauen. Rebuild nur bei Radio-Listen-Aenderung.
*/

let stationInlineFingerprint = null;


async function refreshStationInlineFrequency() {

    try {

        const response =
            await fetch("/api/radio");

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        const radios =
            Array.isArray(data.radios)
                ? data.radios
                : [];

        const fingerprint =
            radios
                .map(
                    radio =>
                        `${radio.id}:${radio.active ? 1 : 0}:${radio.connected ? 1 : 0}`
                )
                .join("|");

        if (
            stationInlineFingerprint !== null &&
            fingerprint !== stationInlineFingerprint
        ) {

            /*
                Radio-Liste / Active-Status hat sich
                geaendert -> kompletter Rebuild.
            */

            stationInlineFingerprint =
                fingerprint;

            await updateStationInline();

            return;

        }

        stationInlineFingerprint =
            fingerprint;

        const dataElement =
            document.querySelector(
                "#station-inline-content .station-inline-data"
            );

        if (!dataElement) {
            return;
        }

        const activeRadio =
            radios.find(
                radio =>
                    radio.active
            ) ||
            radios[0];

        if (!activeRadio) {
            return;
        }

        const frequency =
            activeRadio.frequency
                ? Number(activeRadio.frequency).toLocaleString("de-CH")
                : "---.---.---";

        const mode =
            activeRadio.mode ||
            "--";

        const power =
            `${activeRadio.power ?? 0} W`;

        dataElement.textContent =
            `${frequency} · ${mode} · ${power}`;

    }
    catch (error) {

        /*
            Netzwerk-/Serverfehler still ignorieren,
            naechster Poll versucht es erneut.
        */

    }

}


setInterval(
    refreshStationInlineFrequency,
    2000
);



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
