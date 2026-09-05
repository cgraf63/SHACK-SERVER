
async function updatePriorityDX() {

    const container =
        document.getElementById(
            "priority-dx-list"
        );

    if (!container) {
        return;
    }


    try {

        

        const dx =
            [...currentSpots]
                .filter(
                    spot =>
                        spot.distance !== undefined &&
                        spot.mode !== "UNKNOWN"
                )
                .sort(
                    (a,b) =>
                        b.distance - a.distance
                )
                .slice(0,3);



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
${
    spot.countryCode
    ?
      `<img src="/assets/flags/${spot.countryCode}.svg" class="flag" title="${spot.country || ""}" alt="${spot.country || ""}">`
    :
    "🌐"
}
<span class="priority-call" style="cursor:pointer;">${spot.call}</span>
</strong>


                    ${freq} MHz ${spot.mode}
                    <br>
                    ${spot.distance} km
                    AZ ${spot.azimuth ?? "-"}
                `;

const callElement =
    div.querySelector(".priority-call");

if (callElement) {

    callElement.addEventListener(
        "click",
        () => {

            if (
                typeof window.openQsoDialog !==
                "function"
            ) {
                console.error(
                    "openQsoDialog() is not available."
                );
                return;
            }

            window.openQsoDialog(
                spot,
                {}
            );

        }
    );

}

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




