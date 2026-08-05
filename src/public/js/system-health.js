let healthTimer = null;


async function updateSystemHealth() {

    try {

        const response =
            await fetch("/api/system-status");


        const data =
            await response.json();


        let icon = "💚";
        let title = "STATION READY";
        let status = "All systems operational";


        const temperature =
            Number(data.temperature);


        const disk =
            Number(
                data.disk.percent.replace("%","")
            );


        if (temperature > 65) {

            icon = "💛";
            title = "SYSTEM WARNING";
            status = "Temperature high";

        }


        if (disk > 85) {

            icon = "💛";
            title = "SYSTEM WARNING";
            status = "Disk usage high";

        }


        if (data.sqlite !== "OK") {

            icon = "❤️";
            title = "SYSTEM ERROR";
            status = "SQLite offline";

        }



        document.getElementById(
            "station-health-icon"
        ).textContent = icon;


        document.getElementById(
            "station-health-title"
        ).textContent = title;


        document.getElementById(
            "station-health-status"
        ).textContent = status;


    }

    catch(error) {

        document.getElementById(
            "station-health-icon"
        ).textContent = "❤️";


        document.getElementById(
            "station-health-title"
        ).textContent = "SYSTEM ERROR";


        document.getElementById(
            "station-health-status"
        ).textContent =
            "Backend offline";

    }

}



function startSystemHealth() {

    updateSystemHealth();


    healthTimer =
        setInterval(
            updateSystemHealth,
            15000
        );

}



window.addEventListener(
    "componentsLoaded",
    startSystemHealth
);
