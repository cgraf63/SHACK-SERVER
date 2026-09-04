async function loadComponent(id, file) {

    const element =
        document.getElementById(id);

    if (!element) return;


    const response =
        await fetch(`components/${file}`);


    element.innerHTML =
        await response.text();

}



async function loadComponents() {

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
        "js/sidebar.js";

    document.body.appendChild(
        sidebarScript
    );


    /*
        Initialize settings modal
    */

    const settingsScript =
        document.createElement(
            "script"
        );

    settingsScript.src =
        "js/settings-modal.js";

    document.body.appendChild(
        settingsScript
    );

}



loadComponents().then(() => {

    window.dispatchEvent(
        new Event(
            "componentsLoaded"
        )
    );

});
