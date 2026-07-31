let liveSpotsTimer = null;


let currentSpots = [];


let sortField = "age";


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



    sorted.forEach(
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

            10000

        );


}







window.addEventListener(

    "componentsLoaded",

    startLiveSpotsUpdater

);
