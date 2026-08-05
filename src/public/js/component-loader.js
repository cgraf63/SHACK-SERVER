async function loadComponent(id, file) {

    const element = document.getElementById(id);

    if (!element) return;


    const response =
        await fetch(`components/${file}`);


    element.innerHTML =
        await response.text();

}



async function loadComponents() {


    await loadComponent(
        "sidebar",
        "sidebar.html"
    );


    await loadComponent(
        "system-status",
        "system-status.html"
    );

    await loadComponent(
        "header",
        "header.html"
    );


    await loadComponent(
        "command-strip",
        "command-strip.html"
    );


    await loadComponent(
        "propagation",
        "propagation.html"
    );


    await loadComponent(
        "cluster-connections",
        "cluster-connections.html"
    );


    await loadComponent(
        "live-spots",
        "live-spots.html"
    );


    await loadComponent(
        "station-status",
        "station-status.html"
    );


    await loadComponent(
        "priority-dx",
        "priority-dx.html"
    );


    await loadComponent(
        "recommendations",
        "recommendations.html"
    );


}



loadComponents().then(() => {

    window.dispatchEvent(
        new Event("componentsLoaded")
    );

});
