console.log("SIDEBAR JS LOADED");


function setupSidebar() {

    /*
        Shutdown elements
    */

    const shutdownButton =
        document.getElementById("shutdown-btn");

    const modal =
        document.getElementById("shutdown-modal");

    const cancelButton =
        document.getElementById("shutdown-cancel");

    const confirmButton =
        document.getElementById("shutdown-confirm");


    /*
        About elements
    */

    const aboutButton =
        document.getElementById("about-btn");

    const aboutModal =
        document.getElementById("about-modal");

    const aboutClose =
        document.getElementById("about-close");


    /*
        Check shutdown UI
    */

    if (
        !shutdownButton ||
        !modal ||
        !cancelButton ||
        !confirmButton
    ) {

        console.warn(
            "Shutdown UI elements not found"
        );

        return;

    }


    /*
        Shutdown button
    */

    shutdownButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            modal.classList.add(
                "visible"
            );

        }
    );


    /*
        Shutdown cancel
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
        Close shutdown modal
        when clicking outside dialog
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
        Shutdown confirmation
    */

    confirmButton.addEventListener(
        "click",
        async () => {

            confirmButton.disabled =
                true;

            confirmButton.textContent =
                "Shutting down...";


            try {

                const response =
                    await fetch(
                        "/api/system/shutdown",
                        {
                            method: "POST"
                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `HTTP ${response.status}`
                    );

                }


                confirmButton.textContent =
                    "Server shutting down...";

            }
            catch (error) {

                console.error(
                    "Shutdown failed:",
                    error
                );


                confirmButton.disabled =
                    false;

                confirmButton.textContent =
                    "Shutdown";

            }

        }
    );


    /*
        ABOUT
    */

    if (
        aboutButton &&
        aboutModal &&
        aboutClose
    ) {


        /*
            Open About
        */

        aboutButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                aboutModal.classList.add(
                    "visible"
                );

            }
        );


        /*
            Close About
        */

        aboutClose.addEventListener(
            "click",
            () => {

                aboutModal.classList.remove(
                    "visible"
                );

            }
        );


        /*
            Close About
            when clicking outside dialog
        */

        aboutModal.addEventListener(
            "click",
            event => {

                if (
                    event.target === aboutModal
                ) {

                    aboutModal.classList.remove(
                        "visible"
                    );

                }

            }
        );

    }
    else {

        console.warn(
            "About UI elements not found"
        );

    }

}


/*
    Components are loaded dynamically.
*/

window.addEventListener(
    "componentsLoaded",
    setupSidebar
);
