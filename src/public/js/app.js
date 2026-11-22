console.log("SHACK-SERVER frontend loaded");


/*
 * DX CLUSTER card: the sources (clusters) and their state.
 * More than 5: up / down in the title, mouse wheel over the list,
 * the tooltip of the title lists all of them.
 */
const CLUSTER_PAGE = 5;
let clusterOffset = 0;
let clusterSources = [];

function clusterName(source) {
    return source.name === "HB9ON-8" ? "HB9ON Cluster" : source.name;
}

function escapeClusterHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function renderClusterStatus() {

    const container = document.getElementById("cluster-status-list");
    const title = document.getElementById("cluster-title");

    if (!container) return;

    const all = clusterSources;
    clusterOffset = Math.max(0, Math.min(clusterOffset, all.length - CLUSTER_PAGE));
    const shown = all.slice(clusterOffset, clusterOffset + CLUSTER_PAGE);

    container.innerHTML = shown.map(source => `
        <div class="cluster-item">
            <span class="status-online"></span>
            <span class="cluster-name">${escapeClusterHtml(clusterName(source))}</span>
        </div>`).join("");

    if (title) {
        const nav = all.length > CLUSTER_PAGE
            ? `<span class="needed-nav">
                   <button type="button" class="needed-nav-btn" data-cluster-nav="-1" ${clusterOffset === 0 ? "disabled" : ""} title="Up">▲</button>
                   <span class="needed-nav-pos">${clusterOffset + 1}–${clusterOffset + shown.length}/${all.length}</span>
                   <button type="button" class="needed-nav-btn" data-cluster-nav="1" ${clusterOffset + CLUSTER_PAGE >= all.length ? "disabled" : ""} title="Down">▼</button>
               </span>`
            : "";
        title.innerHTML = `<span>DX CLUSTER</span>${nav}`;
        title.title = `DX cluster connections (${all.length}):\n` + all.map(clusterName).join("\n");
    }

}

function scrollClusters(step) {
    const next = Math.max(0, Math.min(clusterOffset + step, clusterSources.length - CLUSTER_PAGE));
    if (next === clusterOffset) return false;
    clusterOffset = next;
    renderClusterStatus();
    return true;
}

document.addEventListener("click", event => {
    const button = event.target.closest?.("[data-cluster-nav]");
    if (!button) return;
    event.stopPropagation();
    scrollClusters(Number(button.dataset.clusterNav));
});

document.addEventListener("wheel", event => {
    if (!event.target.closest?.("#cluster-status-list") || clusterSources.length <= CLUSTER_PAGE) return;
    if (scrollClusters(event.deltaY > 0 ? 1 : -1)) event.preventDefault();
}, { passive: false });

async function updateClusterStatus() {

    try {
        const response = await fetch("/api/source-status");
        const sources = await response.json();
        clusterSources = Array.isArray(sources) ? sources : [];
        renderClusterStatus();
    }
    catch (error) {
        console.error("Cluster status error:", error);
    }

}


// wichtig: erst nach Component-Load
window.addEventListener(
    "componentsLoaded",
    () => {

        updateClusterStatus();

    }
);


// später automatisch aktualisieren
setInterval(
    updateClusterStatus,
    30000
);
