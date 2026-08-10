let liveSpotsTimer = null;
console.log("LIVE SPOTS JS LOADED");

let currentSpots = [];

let selectedMode = "ALL";
let selectedBand = "ALL";
let selectedCountry = "ALL";
let selectedSource = "ALL";
let selectedConfidence = 0;

let sortField = "age";


let sortDirection = "asc";





function sortSpots(spots) {


    return spots.sort(
        (a, b) => {


            let valueA =
                a[sortField];


            let valueB =
                b[sortField];



            if (
                valueA === undefined
            ) {

                valueA = 0;

            }



            if (
                valueB === undefined
            ) {

                valueB = 0;

            }



            if (
                typeof valueA === "string"
            ) {

                valueA =
                    valueA.toLowerCase();


                valueB =
                    valueB.toLowerCase();

            }



            if (
                valueA < valueB
            ) {

                return sortDirection === "asc"
                    ? -1
                    : 1;

            }



            if (
                valueA > valueB
            ) {

                return sortDirection === "asc"
                    ? 1
                    : -1;

            }



            return 0;


        }
    );


}


function filterSpots(spots) {

    return spots.filter(
        spot =>

            (
                !selectedMode ||
                selectedMode === "ALL" ||
                spot.mode === selectedMode
            )

            &&

            (
                !selectedBand ||
                selectedBand === "ALL" ||
                spot.band === selectedBand
            )

            &&

            (
                !selectedCountry ||
                selectedCountry === "ALL" ||
                spot.countryCode === selectedCountry
            )

            &&

            (
                !selectedSource ||
                selectedSource === "ALL" ||
                spot.source.includes(selectedSource)
            )

            &&

            (
                selectedConfidence === 0 ||
                spot.confidence >= selectedConfidence
            )

    );

}

function updateModeFilter(spots) {

    const select =
        document.getElementById(
            "modeFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const modes =
        [
            ...new Set(
                spots
                    .map(
                        s => s.mode
                    )
                    .filter(
                        m =>
                            m &&
                            m !== "UNKNOWN"
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL MODES
        </option>
        `;


    modes.forEach(
        mode => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                mode;

            option.textContent =
                mode;


            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}



function updateBandFilter(spots) {

    const select =
        document.getElementById(
            "bandFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const bands =
        [
            ...new Set(
                spots
                    .map(
                        s => s.band
                    )
                    .filter(
                        b => b
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL BANDS
        </option>
        `;


    bands.forEach(
        band => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                band;

            option.textContent =
                band;

            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}


function updateCountryFilter(spots) {

    const select =
        document.getElementById(
            "countryFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const countries =
        [
            ...new Set(
                spots
                    .map(
                        s => s.countryCode
                    )
                    .filter(
                        c => c
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL COUNTRIES
        </option>
        `;


    countries.forEach(
        country => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                country;

            option.textContent =
                country.toUpperCase();

            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}


function updateSourceFilter(spots) {

    const select =
        document.getElementById(
            "sourceFilter"
        );


    if (!select) {
        return;
    }


    const current =
        select.value;


    const sources =
        [
            ...new Set(
                spots
                    .flatMap(
                        s =>
                            s.source
                                .split(", ")
                    )
                    .filter(
                        s => s
                    )
            )
        ]
        .sort();


    select.innerHTML =
        `
        <option value="">
            ALL SOURCES
        </option>
        `;


    sources.forEach(
        source => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                source;

            option.textContent =
                source;

            select.appendChild(
                option
            );

        }
    );


    select.value =
        current;

}






function updateSortIcons() {


    document
        .querySelectorAll(
            "th[data-sort]"
        )
        .forEach(
            th => {


                const icon =
                    th.querySelector(
                        ".sort-icon"
                    );


                if (!icon) {

                    return;

                }


                if (
                    th.dataset.sort === sortField
                ) {

                    icon.textContent =
                        sortDirection === "asc"
                        ?
                        "↑"
                        :
                        "↓";

                }
                else {

                    icon.textContent =
                        "↕";

                }


            }
        );

}








function mapSpotModeToRgo(
    mode,
    frequencyHz
) {

    const normalized =
        String(mode || "").toUpperCase();

    if (
        normalized === "SSB"
    ) {

        if (
            frequencyHz < 10000000
        ) {

            return "LSB";

        }

        return "USB";

    }

    if (
        normalized === "CW"
    ) {

        return "CW";

    }

    if (
        normalized === "CW-R"
    ) {

        return "CW-R";

    }

    if (
        normalized === "AM"
    ) {

        return "AM";

    }

    if (
        normalized === "FM"
    ) {

        return "FM";

    }

    return null;

}


function renderLiveSpots() {


    const table =
        document.getElementById(
            'spotTableBody'
        );


    if (!table) {

        return;

    }



    table.innerHTML = "";



    const filtered =
    filterSpots(
        [...currentSpots]
    );


    const sorted =
        sortSpots(
            filtered
    );


    sorted
        .slice(0, 22)
        .forEach(
            spot => {



            const row =
                document.createElement(
                    'tr'
                );



            row.innerHTML = `


                <td class="call-cell">

                    ${
                        spot.countryCode
                        ?
                        `<img
                            src="/assets/flags/${spot.countryCode}.svg"
                            class="flag">`
                        :
                        ""
                    }

                   
		<span>
    ${
        spot.activity === "POTA"
            ? `<span style="color:#00c853; font-size:12px; margin-right:5px;">▲</span>`
            : spot.activity === "SOTA"
                ? `<span style="color:white; font-size:12px; margin-right:5px;">▲</span>`
                : ""
    }
    ${spot.call}
</span>

                </td>



                <td class="frequency">
                    ${spot.frequency}
                </td>



                <td>
                    ${spot.mode}
                </td>



                <td>
                    ${
                        spot.distance !== undefined
                        ?
                        `${spot.distance} km`
                        :
                        "-"
                    }
                </td>



                <td>
                    ${
                        spot.azimuth !== undefined
                        ?
                        `${spot.azimuth}°`
                        :
                        "-"
                    }
                </td>



                <td class="source">
                    ${spot.source}
                </td>



                <td>
                    ${spot.age}
                </td>



                <td class="confidence">
                    ${spot.confidence}%
                </td>



                <td class="spot-actions">

    <button
        class="spot-btn"
        title="View details">
        👀
    </button>


    <button
        class="spot-btn"
        title="Add to favorites">
        ⭐
    </button>


    <button
        class="spot-btn tune-btn"
        title="Tune radio">
        🎯
    </button>

<button
    class="spot-btn qso-btn"
    title="Log QSO">
    📝
</button>



</td>


            `;



            table.appendChild(
                row
            );


            /*
                QSO button

                The complete live-spot object is frozen at the
                exact moment of the click. The UTC timestamp is
                generated here and therefore represents the
                actual moment the operator selected the spot.
            */

            const qsoButton =
                row.querySelector(
                    ".qso-btn"
                );


            if (qsoButton) {

                qsoButton.addEventListener(
                    "click",
                    async () => {

                        console.log(
                            "OPEN QSO:",
                            spot
                        );


                        const qsoSpot = {

                            ...spot,

                            qsoTimeUtc:
                                new Date().toISOString()

                        };


                        /*
                            Load the station data so the QSO
                            dialog receives the current station
                            callsign and locator (e.g. HB9ISO / JN36FL).
                        */

                        let station = null;


                        try {

                            const response =
                                await fetch(
                                    "/api/station"
                                );


                            if (!response.ok) {

                                throw new Error(
                                    `Station API failed: HTTP ${response.status}`
                                );

                            }


                            station =
                                await response.json();


                        }
                        catch (error) {

                            console.error(
                                "Station data loading failed:",
                                error
                            );

                            return;

                        }


                        if (
                            typeof openQsoDialog !==
                            "function"
                        ) {

                            console.error(
                                "openQsoDialog() is not available."
                            );

                            return;

                        }


                        openQsoDialog(
                            qsoSpot,
                            station
                        );

                    }
                );

            }


            /*
                Tune button
            */

            const tuneButton =
                row.querySelector(
                    ".tune-btn"
                );


            if (tuneButton) {

                tuneButton.addEventListener(
                    "click",
                    async () => {

                        // FT8 vorerst nicht tunen
                        if (
                            !spot.mode ||
                            spot.mode === "FT8"
                        ) {

                            console.log(
                                "Radio tune skipped:",
                                spot.mode
                            );

                            return;
                        }


                        const frequencyKHz =
                            Number(
                                spot.frequency
                            );


                        if (
                            !Number.isFinite(
                                frequencyKHz
                            )
                        ) {

                            console.error(
                                "Invalid spot frequency:",
                                spot.frequency
                            );

                            return;
                        }


                        const frequencyHz =
                            Math.round(
                                frequencyKHz * 1000
                            );


                        const mode =
                            mapSpotModeToRgo(
                                spot.mode,
                                frequencyHz
                            );


                        if (!mode) {

                            console.log(
                                "Radio tune skipped:",
                                spot.mode
                            );

                            return;

                        }


                        console.log(
                            "TUNING RADIO:",
                            frequencyHz,
                            mode
                        );


                        try {

                            const response =
                                await fetch(
                                    "/api/radio/tune",
                                    {
                                        method:
                                            "POST",

                                        headers: {
                                            "Content-Type":
                                                "application/json"
                                        },

                                        body:
                                            JSON.stringify({
                                                frequency:
                                                    frequencyHz,

                                                mode:
                                                    mode
                                            })
                                    }
                                );


                            const result =
                                await response.json();


                            if (!response.ok) {

                                console.error(
                                    "Radio tune failed:",
                                    result
                                );

                                return;
                            }


                            console.log(
                                "Radio tuned:",
                                result
                            );

                        }
                        catch (error) {

                            console.error(
                                "Radio tune request failed:",
                                error
                            );

                        }

                    }
                );

            }

        }
    );


    updateSortIcons();

}


function updateDxOpportunity() {

    const element =
        document.getElementById(
            "dx-opportunity-value"
        );

    if (!element) {
        return;
    }


console.log(
    "TOP DISTANCE SPOTS:",
    [...currentSpots]
        .filter(
            s => s.distance !== undefined
        )
        .sort(
            (a,b) =>
                b.distance - a.distance
        )
        .slice(0,10)
        .map(
            s => ({
                call: s.call,
                distance: s.distance,
                frequency: s.frequency,
                mode: s.mode,
                age: s.age
            })
        )
);


    const dx =
    [...currentSpots]
        .filter(
            spot =>
                spot.distance !== undefined
        )
        .sort(
            (a,b) =>
                b.distance - a.distance
        )[0];

    if (!dx) {

        element.textContent =
            "No DX data";

        return;
    }


    const mhz =
        dx.frequency
            ? (
                Number(dx.frequency) / 1000
              ).toFixed(3)
              + " MHz"
            : "";


    const mode =
    dx.mode !== "UNKNOWN"
        ? " " + dx.mode
        : "";


console.log(
    "DX OBJECT JSON",
    JSON.stringify(dx, null, 2)
);

element.innerHTML =
    `
    ${
        dx.countryCode
            ? `<img class="dx-flag" src="/assets/flags/${dx.countryCode}.svg">`
            : ""
    }
    ${dx.call} on ${mhz}${mode}
    `;


}




async function updateLiveSpots() {


    try {


        const response =
            await fetch('/api/spots');



        if (!response.ok) {


            throw new Error(
                `HTTP ${response.status}`
            );


        }



        currentSpots =
    await response.json();

// Filter Functions

updateBandFilter(
    currentSpots
);

updateModeFilter(
    currentSpots
);

updateCountryFilter(
    currentSpots
);


updateSourceFilter(
    currentSpots
);


updateDxOpportunity();

renderLiveSpots();

updatePriorityDX();

    }
    catch(error) {


        console.error(
            "Live spots update failed:",
            error
        );


    }

}








function setupSpotSorting() {


    document
        .querySelectorAll(
            "th[data-sort]"
        )
        .forEach(
            th => {


                th.addEventListener(
                    "click",
                    () => {


                        const field =
                            th.dataset.sort;



                        if (
                            sortField === field
                        ) {

                            sortDirection =
                                sortDirection === "asc"
                                ?
                                "desc"
                                :
                                "asc";

                        }
                        else {

                            sortField =
                                field;


                            sortDirection =
                                "asc";

                        }



                        renderLiveSpots();


                    }
                );


            }
        );


}




function setupSpotFilters() {


const resetView =
    document.getElementById(
        "resetView"
    );


if (resetView) {

    resetView.addEventListener(
        "click",
        () => {

            selectedMode = "ALL";
            selectedBand = "ALL";
            selectedCountry = "ALL";
            selectedSource = "ALL";
            selectedConfidence = 0;


            document.getElementById(
                "modeFilter"
            ).value = "";


            document.getElementById(
                "bandFilter"
            ).value = "";


            document.getElementById(
                "countryFilter"
            ).value = "";


            document.getElementById(
                "sourceFilter"
            ).value = "";


            document.getElementById(
                "confidenceFilter"
            ).value = "";


            updateLiveSpots();

        }
    );

}



const confidence =
    document.getElementById(
        "confidenceFilter"
    );


if (confidence) {

    confidence.addEventListener(
        "change",
        () => {

            selectedConfidence =
                Number(
                    confidence.value
                ) || 0;


            renderLiveSpots();

        }
    );

}


const source =
    document.getElementById(
        "sourceFilter"
    );


if (source) {

    source.addEventListener(
        "change",
        () => {

            selectedSource =
                source.value ||
                "ALL";

            renderLiveSpots();

        }
    );

}

const country =
    document.getElementById(
        "countryFilter"
    );


if (country) {

    country.addEventListener(
        "change",
        () => {

            selectedCountry =
                country.value ||
                "ALL";

            renderLiveSpots();

        }
    );

}



    const mode =
        document.getElementById(
            "modeFilter"
        );


    if (!mode) {

        return;

    }


    mode.addEventListener(
        "change",
        () => {

            selectedMode =
                mode.value ||
                "ALL";


            renderLiveSpots();

        }
    );

}



function startLiveSpotsUpdater() {


    setupSpotSorting();
    setupSpotFilters();

    updateLiveSpots();



    if (
        liveSpotsTimer !== null
    ) {


        clearInterval(
            liveSpotsTimer
        );


    }



    liveSpotsTimer =
        setInterval(

            updateLiveSpots,

            15000

        );


}







window.addEventListener(

    "componentsLoaded",

    startLiveSpotsUpdater

);
// fallback:

// fallback
setTimeout(
    () => {
        startLiveSpotsUpdater();
    },
    500
);
