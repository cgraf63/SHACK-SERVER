console.log("SIDEBAR JS LOADED");


function setupSidebar() {

    const restartButton =
        document.getElementById(
            "restart-btn"
        );

    const shutdownButton =
        document.getElementById(
            "shutdown-btn"
        );

    const modal =
        document.getElementById(
            "shutdown-modal"
        );

    const title =
        document.getElementById(
            "shutdown-title"
        );

    const message =
        document.getElementById(
            "shutdown-message"
        );

    const cancelButton =
        document.getElementById(
            "shutdown-cancel"
        );

    const confirmButton =
        document.getElementById(
            "shutdown-confirm"
        );


    if (
        !restartButton ||
        !shutdownButton ||
        !modal ||
        !title ||
        !message ||
        !cancelButton ||
        !confirmButton
    ) {

        console.warn(
            "Sidebar system controls not found"
        );

        return;

    }


    let systemAction =
        "shutdown";


    /*
        Open dialog
    */

    function openDialog(action) {

        systemAction =
            action;


        if (action === "restart") {

            title.textContent =
                "Restart SHACK-SERVER?";

            message.textContent =
                "Are you sure you want to restart the server?";

            confirmButton.textContent =
                "Restart";

        }
        else {

            title.textContent =
                "Shutdown SHACK-SERVER?";

            message.textContent =
                "Are you sure you want to shut down the server?";

            confirmButton.textContent =
                "Shutdown";

        }


        confirmButton.disabled =
            false;


        modal.classList.add(
            "visible"
        );

    }


    /*
        Restart
    */

    restartButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openDialog(
                "restart"
            );

        }
    );


    /*
        Shutdown
    */

    shutdownButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openDialog(
                "shutdown"
            );

        }
    );


    /*
        Cancel
    */

    cancelButton.addEventListener(
        "click",
        () => {

            modal.classList.remove(
                "visible"
            );

        }
    );


    /*
        Click outside dialog
    */

    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                modal.classList.remove(
                    "visible"
                );

            }

        }
    );


    /*
        Confirm
    */

    confirmButton.addEventListener(
        "click",
        async () => {

            confirmButton.disabled =
                true;


            if (
                systemAction ===
                "restart"
            ) {

                confirmButton.textContent =
                    "Restarting...";

            }
            else {

                confirmButton.textContent =
                    "Shutting down...";

            }


            const endpoint =
                systemAction === "restart"
                    ? "/api/system/restart"
                    : "/api/system/shutdown";


            try {

                const response =
                    await fetch(
                        endpoint,
                        {
                            method: "POST"
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                if (
                    systemAction ===
                    "restart"
                ) {

                    confirmButton.textContent =
                        "Server restarting...";

                }
                else {

                    confirmButton.textContent =
                        "Server shutting down...";

                }

            }
            catch (error) {

                console.error(
                    "System action failed:",
                    error
                );


                confirmButton.disabled =
                    false;


                confirmButton.textContent =
                    systemAction === "restart"
                        ? "Restart"
                        : "Shutdown";

            }

        }
    );

}


window.addEventListener(
    "componentsLoaded",
    setupSidebar
);
