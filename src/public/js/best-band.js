let bestBandTimer = null;


async function updateBestBand() {

    try {

        const response =
            await fetch("/api/best-band");


        const data =
            await response.json();


        const title =
            document.getElementById(
                "best-band-title"
            );


        const status =
            document.getElementById(
                "best-band-status"
            );


        if (
            data.band &&
            data.count > 0
        ) {

            title.textContent =
                "BEST BAND";


            status.textContent =
                `${data.band} ACTIVE`;

        }
        else {

            title.textContent =
                "BEST BAND";


            status.textContent =
                "No activity";

        }


    }

    catch(error) {

        console.error(
            "Best band update failed:",
            error
        );

    }

}



function startBestBand() {

    updateBestBand();


    bestBandTimer =
        setInterval(
            updateBestBand,
            30000
        );

}



window.addEventListener(
    "componentsLoaded",
    startBestBand
);
