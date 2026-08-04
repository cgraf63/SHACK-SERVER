let priorityDxTimer = null;


async function updatePriorityDX() {

    const container =
        document.getElementById(
            "priority-dx-list"
        );

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch("/api/spots");


        const spots =
            await response.json();


        const dx =
            [...spots]
                .filter(
                    spot =>
                        spot.distance !== undefined &&
                        spot.mode !== "UNKNOWN"
                )
                .sort(
                    (a,b) =>
                        b.distance - a.distance
                )
                .slice(0,5);



        container.innerHTML = "";


        dx.forEach(
            spot => {

                const freq =
                    (Number(spot.frequency) / 1000)
                    .toFixed(3);


                const div =
                    document.createElement("div");


                div.className =
                    "priority-item";


                div.innerHTML = `
                    <strong>
                        ${spot.flag ?? "🌐"}
                        ${spot.call}
                    </strong>
                    ${freq} MHz ${spot.mode}
                    <br>
                    ${spot.distance} km
                    AZ ${spot.azimuth ?? "-"}
                `;


                container.appendChild(div);

            }
        );


    }
    catch(error) {

        console.error(
            "Priority DX update failed:",
            error
        );

    }

}



function startPriorityDX() {

    updatePriorityDX();


    priorityDxTimer =
        setInterval(
            updatePriorityDX,
            15000
        );

}


document.addEventListener(
    "DOMContentLoaded",
    startPriorityDX
);
