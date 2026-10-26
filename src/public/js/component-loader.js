async function loadComponent(id, file) {

    const element =
        document.getElementById(id);

    if (!element) return;


    const response =
        await fetch(`components/${file}`, { cache: "no-cache" });


    element.innerHTML =
        await response.text();

}



/*
    loadComponents() may be called several times (some pages call
    it again on DOMContentLoaded). Load everything only once,
    otherwise sidebar.js, settings-modal.js etc. run twice.
*/
let componentsLoadPromise = null;

function loadComponents() {

    if (!componentsLoadPromise) {
        componentsLoadPromise = loadComponentsOnce();
    }

    return componentsLoadPromise;

}

async function loadComponentsOnce() {

    /*
        Sidebar
    */

    await loadComponent(
        "sidebar",
        "sidebar.html"
    );


    /*
        Settings modal content

        Must be loaded AFTER sidebar
        because #settings-content
        is inside sidebar.html.
    */

    await loadComponent(
        "settings-content",
        "settings-modal.html"
    );


    /*
        System status
    */

    await loadComponent(
        "system-status",
        "system-status.html"
    );


    /*
        Header
    */

    await loadComponent(
        "header",
        "header.html"
    );


    /*
        Command strip
    */

    await loadComponent(
        "command-strip",
        "command-strip.html"
    );


    /*
        Propagation
    */

    await loadComponent(
        "propagation",
        "propagation.html"
    );


    /*
        Cluster connections
    */

    await loadComponent(
        "cluster-connections",
        "cluster-connections.html"
    );


    /*
        Live spots
    */

    await loadComponent(
        "live-spots",
        "live-spots.html"
    );


    /*
        Station status
    */

    await loadComponent(
        "station-status",
        "station-status.html"
    );


    /*
        Priority DX
    */

    await loadComponent(
        "priority-dx",
        "priority-dx.html"
    );

    /*
        Manual QSO
    */

    await loadComponent(
        "manual-qso",
        "manual-qso.html"
    );

    /*
        Manual QSO functionality
    */

    const manualQsoScript =
        document.createElement(
            "script"
        );

    manualQsoScript.src =
        "js/manual-qso.js";

    document.body.appendChild(
        manualQsoScript
    );
    /*
        Recommendations
    */

    await loadComponent(
        "recommendations",
        "recommendations.html"
    );


    /*
        Initialize sidebar functionality
    */

const sidebarScript =
    document.createElement(
        "script"
    );

sidebarScript.src =
    "js/sidebar.js?v=2";

await new Promise(resolve => {

    sidebarScript.onload =
        resolve;

    document.body.appendChild(
        sidebarScript
    );

});

    /*
        Initialize settings modal
    */

    const settingsScript =
        document.createElement(
            "script"
        );

    settingsScript.src =
        "js/settings-modal.js?v=4";

    document.body.appendChild(
        settingsScript
    );


    /*
        Transceiver settings (part of the settings modal)
    */

    const radioSettingsScript =
        document.createElement(
            "script"
        );

    radioSettingsScript.src =
        "js/radio-settings.js?v=3";

    document.body.appendChild(
        radioSettingsScript
    );

}



loadComponents().then(() => {

    window.dispatchEvent(
        new Event(
            "componentsLoaded"
        )
    );

});
