async function updateLiveSpots() {

    try {

        const response =
            await fetch('/api/spots');


        const spots =
            await response.json();



        const table =
            document.getElementById(
                'spotTableBody'
            );



        if (!table) {
            return;
        }



        table.innerHTML = "";



        spots.forEach(spot => {



            const row =
                document.createElement('tr');



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
    <span>${spot.call}</span>
</td>
                


                <td class="frequency">
                    ${spot.frequency}
                </td>


                <td>
                    ${spot.mode}
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
                    ${spot.snr ?? 0} dB
                </td>


                <td>
                    👀 ☆
                </td>


            `;



            table.appendChild(row);


        });


    }
    catch(error) {


        console.error(
            "Live spots update failed:",
            error
        );


    }

}




window.addEventListener(
    "componentsLoaded",
    updateLiveSpots
);
