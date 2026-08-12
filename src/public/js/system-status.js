let systemStatusTimer = null;


function formatUptime(seconds) {

    const days =
        Math.floor(seconds / 86400);

    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );

    return `${days}d ${hours}h`;

}



async function updateSystemStatus() {

    try {

        const response =
            await fetch("/api/system-status");


        const data =
            await response.json();



        document.getElementById(
            "cpu-temp"
        ).textContent =
            data.temperature ?? "--";

document.getElementById(
    "server-model"
).textContent =
    data.model ?? "--";

        document.getElementById(
            "server-ip"
        ).textContent =
            data.ip ?? "--";

        const ramUsed =
            100 -
            (
                data.memory.free /
                data.memory.total *
                100
            );

document.getElementById(
    "uptime"
).textContent =
    formatUptime(data.uptime);


        document.getElementById(
            "ram-usage"
        ).textContent =
            Math.round(ramUsed) + "%";

document.getElementById(
    "disk-usage"
).textContent =
    data.disk
        ? data.disk.percent
        : "--";

        document.getElementById(
            "server-state"
        ).textContent =
            "Online";
document.getElementById(
    "disk-usage"
).textContent =
    data.disk
        ? data.disk.percent
        : "--";


document.getElementById(
    "docker-status"
).textContent =
    data.docker ?? "--";


document.getElementById(
    "db-status"
).textContent =
    data.sqlite ?? "--";
    }

    catch(error) {

        console.error(
            "System status failed:",
            error
        );


        document.getElementById(
            "server-state"
        ).textContent =
            "Offline";

    }

}



function startSystemStatus() {

    updateSystemStatus();


    systemStatusTimer =
        setInterval(
            updateSystemStatus,
            15000
        );

}



window.addEventListener(
    "componentsLoaded",
    startSystemStatus
);


function startSystemStatus() {

    updateSystemStatus();


    systemStatusTimer =
        setInterval(
            updateSystemStatus,
            15000
        );

}



window.addEventListener(
    "componentsLoaded",
    startSystemStatus
);
