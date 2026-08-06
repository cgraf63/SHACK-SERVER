let liveSpotsTimer = null;
console.log("LIVE SPOTS JS LOADED");

let currentSpots = [];

let selectedMode = "ALL";
let selectedBand = "ALL";
let selectedCountry = "ALL";
let selectedSource = "ALL";

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
        .slice(0, 15)
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



                <td>
                    👀 ☆
                </td>


            `;



            table.appendChild(
                row
            );


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


    const dx =
    [...currentSpots]
        .filter(
            spot =>
                spot.distance &&
                spot.mode !== "UNKNOWN" &&
                parseInt(spot.age) < 900
        )
        .sort(
            (a,b) =>
                b.distance - a.distance
        )[0];
console.log(
    "TOP DX:",
    [...currentSpots]
        .filter(
            s =>
                s.distance &&
                s.mode !== "UNKNOWN"
        )
        .sort(
            (a,b) =>
                b.distance - a.distance
        )
        .slice(0,10)
        .map(s => ({
    call: s.call,
    distance: s.distance,
    mode: s.mode,
    age: s.age,
    flag: s.flag,
    countryCode: s.countryCode,
    frequency: s.frequency
}))
);

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


