let liveSpotsTimer = null;
console.log("LIVE SPOTS JS LOADED");

let currentSpots = [];


let sortField = "confidence";


let sortDirection = "desc";





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



    const sorted =
        sortSpots(
            [...currentSpots]
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
                parseInt(spot.age) < 300
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








function startLiveSpotsUpdater() {

console.log("START LIVE SPOTS");


    setupSpotSorting();


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


