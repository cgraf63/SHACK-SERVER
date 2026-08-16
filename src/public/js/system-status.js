let systemStatusTimer = null;


function formatUptime(seconds) {

    const days =
        Math.floor(seconds / 86400);

    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    return `${days}d ${hours}h ${minutes}m`;

}


async function updateSystemStatus() {

    try {

        const response =
            await fetch(
                "/api/system-status",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const serverState =
            document.getElementById(
                "server-state"
            );

        const serverModel =
            document.getElementById(
                "server-model"
            );

        const cpuTemp =
            document.getElementById(
                "cpu-temp"
            );

        const serverIp =
            document.getElementById(
                "server-ip"
            );

        const uptime =
            document.getElementById(
                "uptime"
            );

        const ramUsage =
            document.getElementById(
                "ram-usage"
            );

        const diskUsage =
            document.getElementById(
                "disk-usage"
            );

        const dockerStatus =
            document.getElementById(
                "docker-status"
            );

        const dbStatus =
            document.getElementById(
                "db-status"
            );


        if (serverState) {

            serverState.textContent =
                "Online";

        }


        if (serverModel) {

            serverModel.textContent =
                data.model ?? "--";

        }


        if (cpuTemp) {

            cpuTemp.textContent =
                data.temperature ?? "--";

        }


        if (serverIp) {

            serverIp.textContent =
                data.ip ?? "--";

        }


        if (uptime) {

            uptime.textContent =
                formatUptime(
                    data.uptime ?? 0
                );

        }


        if (
            ramUsage &&
            data.memory &&
            data.memory.total
        ) {

            const ramUsed =
                100 -
                (
                    data.memory.free /
                    data.memory.total *
                    100
                );

            ramUsage.textContent =
                Math.round(
                    ramUsed
                ) + "%";

        }


        if (diskUsage) {

            diskUsage.textContent =
                data.disk
                    ? data.disk.percent
                    : "--";

        }


        if (dockerStatus) {

            dockerStatus.textContent =
                data.docker ?? "--";

        }


        if (dbStatus) {

            dbStatus.textContent =
                data.sqlite ?? "--";

        }

    }

    catch (error) {

        console.error(
            "System status failed:",
            error
        );


        const serverState =
            document.getElementById(
                "server-state"
            );

        if (serverState) {

            serverState.textContent =
                "Offline";

        }

    }

}


function startSystemStatus() {

    if (systemStatusTimer) {

        clearInterval(
            systemStatusTimer
        );

    }


    updateSystemStatus();


    systemStatusTimer =
        setInterval(
            updateSystemStatus,
            15000
        );

}


/*
 * Components are loaded by
 * component-loader.js.
 *
 * Start only after the sidebar
 * and system-status component
 * actually exist in the DOM.
 */

window.addEventListener(
    "componentsLoaded",
    startSystemStatus
);
