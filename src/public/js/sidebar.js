console.log("SIDEBAR JS LOADED");


function setupSidebar() {


    /*
        Sidebar toggle
    */

    const sidebar =
        document.querySelector(".sidebar");

    const app =
        document.getElementById("app");

    const sidebarToggle =
        document.getElementById(
            "sidebar-toggle"
        );


    if (
        sidebar &&
        sidebarToggle
    ) {

        sidebarToggle.addEventListener(
            "click",
            () => {


                sidebar.classList.toggle(
                    "collapsed"
                );

                if (app) {
                    app.classList.toggle(
                        "sidebar-collapsed"
                    );
                }

                sidebarToggle.textContent =
                    sidebar.classList.contains(
                        "collapsed"
                    )
                        ? "▶"
                        : "◀";

            }
        );

    }

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


/*
    Optional modules: show RBN / SDR in the sidebar only when
    enabled in Settings → Optional Modules.
*/

function applySidebarModules(settings) {

    const modules =
        settings && settings.modules
            ? settings.modules
            : {};

    const rbn =
        document.getElementById("rbn-btn");

    const sdr =
        document.getElementById("sdr-btn");

    if (rbn) {
        rbn.style.display =
            modules.rbn === false ? "none" : "";
    }

    if (sdr) {
        sdr.style.display =
            modules.sdr === true ? "" : "none";
    }

}


async function loadSidebarModules() {

    try {

        const response =
            await fetch(
                "/api/settings?_=" + Date.now(),
                { cache: "no-store" }
            );

        if (!response.ok) {
            return;
        }

        applySidebarModules(
            await response.json()
        );

    }
    catch (error) {

        console.warn(
            "Sidebar: could not load module settings",
            error
        );

    }

}


window.addEventListener(
    "componentsLoaded",
    loadSidebarModules
);

window.addEventListener(
    "settingsSaved",
    event => applySidebarModules(event.detail)
);
