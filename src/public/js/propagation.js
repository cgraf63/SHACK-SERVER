async function updatePropagation() {

    try {

        const response =
            await fetch('/api/propagation');


        const data =
            await response.json();



        const solarFlux =
            document.getElementById('solarFlux');

        const aIndex =
            document.getElementById('aIndex');

        const kIndex =
            document.getElementById('kIndex');



        if (solarFlux) {

            solarFlux.textContent =
                data.solarFlux;

        }


        if (aIndex) {

            aIndex.textContent =
                data.aIndex;

        }


        if (kIndex) {

            kIndex.textContent =
                data.kIndex;

        }



        if (data.bands) {

            updateBandGraph(
                data.bands
            );

        }


    }
    catch(error) {

        console.error(
            "Propagation update failed:",
            error
        );

    }

}




function updateBandGraph(bands) {


    const graph =
        document.getElementById(
            "bandGraph"
        );


    if (!graph) {

        console.warn(
            "bandGraph missing"
        );

        return;

    }



    graph.innerHTML = "";



    const width = 600;

    const height = 30;



    const points = [];



    bands.forEach(
        (band, index) => {


            const margin = 15;

const x =
    margin +
    (index / (bands.length - 1)) *
    (width - (2 * margin));


          const y =
    35 -
    (band.score / 100) * 25;



            points.push({

                x:x,
                y:y,
                score:band.score,
                condition:band.condition

            });


        }
    );




    /*
        Verbindungslinie
    */


    const line =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polyline"
        );


    line.setAttribute(
        "points",
        points
            .map(
                p =>
                `${p.x},${p.y}`
            )
            .join(" ")
    );


    line.setAttribute(
        "fill",
        "none"
    );


    line.setAttribute(
        "stroke",
        "#00ffff"
    );


    line.setAttribute(
        "stroke-width",
        "1.5"
    );


    line.setAttribute(
        "stroke-linecap",
        "round"
    );


    line.setAttribute(
        "stroke-linejoin",
        "round"
    );


    graph.appendChild(line);




    /*
        Punkte
    */


    points.forEach(
        p => {


            const circle =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle"
                );



            circle.setAttribute(
                "cx",
                p.x
            );


            circle.setAttribute(
                "cy",
                p.y
            );


            circle.setAttribute(
                "r",
                "4"
            );



            circle.setAttribute(
                "fill",
                getBandColor(
                    p.condition
                )
            );


            circle.setAttribute(
                "title",
                `${p.condition} (${p.score})`
            );



            graph.appendChild(
                circle
            );


        }
    );


}





function getBandColor(condition) {


    switch(condition) {


        case "Excellent":

            return "#7fff00";


        case "Good":

            return "#00ffff";


        case "Fair":

            return "#ffd000";


        case "Poor":

            return "#ff4040";


        default:

            return "#00ffff";

    }

}





window.addEventListener(
    "componentsLoaded",
    updatePropagation
);
