console.log("SHACK-SERVER frontend loaded");


async function updateClusterStatus() {

    try {

        const response =
            await fetch("/api/source-status");


        const sources =
            await response.json();


        const container =
            document.getElementById(
                "cluster-status-list"
            );


        if (!container) {
            console.log(
                "cluster-status-list not found"
            );
            return;
        }


        container.innerHTML = "";


        sources.forEach(source => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "cluster-item";


            const name =
                source.name === "HB9ON-8"
                ? "HB9ON Cluster"
                : source.name;


            item.innerHTML = `

    <span class="status-online"></span>

    <span class="cluster-name">
        ${name}
    </span>

`;
            


            container.appendChild(item);

        });


    }
    catch(error) {

        console.error(
            "Cluster status error:",
            error
        );

    }

}


// wichtig: erst nach Component-Load
window.addEventListener(
    "componentsLoaded",
    () => {

        updateClusterStatus();

    }
);


// später automatisch aktualisieren
setInterval(
    updateClusterStatus,
    30000
);
