console.log("SIDEBAR JS LOADED");


function setupSidebar() {

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
