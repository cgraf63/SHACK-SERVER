console.log("RBN JS LOADED");


let rbnRefreshTimer = null;


function setupRbn() {

    /*
        rbn-btn ist jetzt ein Link auf /rbn.html.
        Kein Popup-Handler mehr noetig - Link
        navigiert normal. Fallback: falls doch
        noch ein Button existiert, Popup.
    */

    const rbnButton =
        document.getElementById("rbn-btn");

    if (!rbnButton) {
        return;
    }

    if (rbnButton.tagName === "A") {
        return;
    }

    rbnButton.addEventListener(
        "click",
        event => {

            event.preventDefault();

            openRbnPopup();

        }
    );

}

function createRbnModal() {

    let modal =
        document.getElementById("rbn-modal");


    if (modal) {
        return modal;
    }


    modal =
        document.createElement("div");

    modal.id =
        "rbn-modal";

    modal.className =
        "rbn-modal";

    modal.innerHTML = `

        <div class="rbn-dialog">

            <button
                id="rbn-close"
                class="rbn-close"
                type="button"
                aria-label="Close">
                ×
            </button>

<div class="rbn-title">
    <span>RBN</span>
    <button
        id="rbn-map-btn"
        class="rbn-map-button"
        type="button"
        title="Show RBN Spotters on map"
    >🗺 MAP</button>
</div>
            <div id="rbn-content">
                Loading...
            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    document
        .getElementById("rbn-close")
        ?.addEventListener(
            "click",
            () => {

                closeRbnPopup();

            }
        );

    document
        .getElementById("rbn-map-btn")
        ?.addEventListener(
            "click",
            () => {

                openRbnMap();

            }
        );
    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeRbnPopup();

            }

        }
    );


    return modal;

}


function closeRbnPopup() {

    const modal =
        document.getElementById(
            "rbn-modal"
        );


    if (modal) {

        modal.classList.remove(
            "visible"
        );

    }


    if (rbnRefreshTimer) {

        clearInterval(
            rbnRefreshTimer
        );

        rbnRefreshTimer =
            null;

    }

}


async function openRbnPopup() {

    const modal =
        createRbnModal();


    modal.classList.add(
        "visible"
    );


    await loadRbnData();


    if (rbnRefreshTimer) {

        clearInterval(
            rbnRefreshTimer
        );

    }


    rbnRefreshTimer =
        setInterval(
            () => {

                const visible =
                    modal.classList.contains(
                        "visible"
                    );


                if (!visible) {

                    clearInterval(
                        rbnRefreshTimer
                    );

                    rbnRefreshTimer =
                        null;

                    return;

                }


                loadRbnData();

            },
            5000
        );

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/*
 * RBN page: who hears my signal?
 *
 *   summary   call / frequency, number of skimmers, best signal,
 *             farthest skimmer, last report
 *   table     one line per skimmer (best SNR, number of reports,
 *             last time), per band when there are several;
 *             sorted by SNR, distance or time (click the head)
 */
let rbnSort = "snr";
try { rbnSort = localStorage.getItem("rbn-sort") || "snr"; } catch { /* no storage */ }

function rbnBand(khz) {
    const bands = [[1800, 2000, "160m"], [3500, 4000, "80m"], [5250, 5450, "60m"], [7000, 7300, "40m"],
        [10100, 10150, "30m"], [14000, 14350, "20m"], [18068, 18168, "17m"], [21000, 21450, "15m"],
        [24890, 24990, "12m"], [28000, 29700, "10m"], [50000, 54000, "6m"]];
    const band = bands.find(([low, high]) => khz >= low && khz <= high);
    return band ? band[2] : `${(khz / 1000).toFixed(3)} MHz`;
}

/* "IT9GSF-#" -> "IT9GSF" (the "-#" only marks a skimmer) */
function rbnSkimmerName(spotter) {
    return String(spotter || "").replace(/-#$/, "");
}

function rbnSnrColor(snr) {
    if (snr >= 20) return "#27d17f";
    if (snr >= 10) return "#f0b429";
    return "#e05252";
}

/* "1440Z" -> minutes ago (today, or yesterday when in the future) */
function rbnMinutesAgo(time) {
    const match = /^(\d{2})(\d{2})Z$/.exec(String(time || ""));
    if (!match) return null;
    const now = new Date();
    let spot = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), Number(match[1]), Number(match[2]));
    if (spot > now.getTime() + 60000) spot -= 86400000;
    return Math.max(0, Math.round((now.getTime() - spot) / 60000));
}

function rbnAgoText(minutes) {
    if (minutes === null) return "—";
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)} h ${minutes % 60} min ago`;
}

function rbnSkimmers(spots) {
    const map = new Map();
    for (const spot of spots) {
        const key = String(spot.spotter || "").toUpperCase();
        if (!key) continue;
        const snr = Number(spot.snr);
        const minutes = rbnMinutesAgo(spot.time);
        const entry = map.get(key);
        if (!entry) {
            map.set(key, { ...spot, snr, minutes, count: 1 });
            continue;
        }
        entry.count++;
        if (Number.isFinite(snr) && !(snr <= entry.snr)) {
            entry.snr = snr;
            entry.frequency = spot.frequency;
            entry.speed = spot.speed;
        }
        if (minutes !== null && (entry.minutes === null || minutes < entry.minutes)) {
            entry.minutes = minutes;
            entry.time = spot.time;
        }
        if (entry.distanceKm == null && spot.distanceKm != null) entry.distanceKm = spot.distanceKm;
    }
    const list = [...map.values()];
    const by = {
        snr: (a, b) => (b.snr ?? -99) - (a.snr ?? -99),
        distance: (a, b) => (b.distanceKm ?? -1) - (a.distanceKm ?? -1),
        time: (a, b) => (a.minutes ?? 1e9) - (b.minutes ?? 1e9)
    };
    return list.sort(by[rbnSort] || by.snr);
}

function rbnTable(skimmers, maxSnr) {
    const head = (key, label) =>
        `<span class="rbn-sort${rbnSort === key ? " active" : ""}" data-rbn-sort="${key}" title="Sort">${label}${rbnSort === key ? " ▾" : ""}</span>`;
    return `
        <div class="rbn-table rbn-skimmers">
            <div class="rbn-table-header">
                <span>SKIMMER</span>
                ${head("distance", "DISTANCE")}
                ${head("snr", "SIGNAL")}
                <span>WPM</span>
                ${head("time", "LAST")}
            </div>
            <div class="rbn-table-body">
                ${skimmers.map(skimmer => {
                    const snr = Number(skimmer.snr);
                    const width = Number.isFinite(snr) ? Math.max(4, Math.min(100, (snr / Math.max(30, maxSnr)) * 100)) : 0;
                    return `
                        <div class="rbn-table-row" title="${escapeHtml(`${skimmer.spotter}: ${skimmer.count} report(s), best ${snr} dB on ${(Number(skimmer.frequency) / 1000).toFixed(3)} MHz`)}">
                            <span>
                                ${skimmer.spotterCountryCode ? `<img class="rbn-flag" src="/assets/flags/${escapeHtml(skimmer.spotterCountryCode)}.svg" alt="">` : ""}
                                ${escapeHtml(rbnSkimmerName(skimmer.spotter))}${skimmer.count > 1 ? `<span class="rbn-count">×${skimmer.count}</span>` : ""}
                            </span>
                            <span>${skimmer.distanceKm != null ? `${skimmer.distanceKm} km` : '<span class="rbn-muted">—</span>'}</span>
                            <span class="rbn-snr">
                                <span class="rbn-snr-bar"><i style="width:${width}%;background:${rbnSnrColor(snr)}"></i></span>
                                <span class="rbn-snr-value" style="color:${rbnSnrColor(snr)}">${Number.isFinite(snr) ? `${snr >= 0 ? "+" : ""}${snr} dB` : "—"}</span>
                            </span>
                            <span>${skimmer.speed ? escapeHtml(skimmer.speed) : '<span class="rbn-muted">—</span>'}</span>
                            <span>${escapeHtml(skimmer.time || "—")}</span>
                        </div>`;
                }).join("")}
            </div>
        </div>`;
}

async function loadRbnData() {

    const content = document.getElementById("rbn-content");
    if (!content) return;

    try {

        const response = await fetch("/api/rbn", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const spots = await response.json();

        if (!Array.isArray(spots) || spots.length === 0) {
            content.innerHTML = '<div class="rbn-muted">Waiting for RBN data - call CQ in CW and the skimmers report you here.</div>';
            return;
        }

        const all = rbnSkimmers(spots);
        const calls = [...new Set(spots.map(spot => String(spot.callsign || "").toUpperCase()).filter(Boolean))];
        const best = [...all].sort((a, b) => (b.snr ?? -99) - (a.snr ?? -99))[0];
        const farthest = [...all].filter(s => s.distanceKm != null).sort((a, b) => b.distanceKm - a.distanceKm)[0];
        const latest = [...all].filter(s => s.minutes !== null).sort((a, b) => a.minutes - b.minutes)[0];
        const maxSnr = Math.max(...all.map(s => Number.isFinite(s.snr) ? s.snr : 0));

        // per band (frequency of the reports)
        const bands = new Map();
        for (const spot of spots) {
            const band = rbnBand(Number(spot.frequency));
            if (!bands.has(band)) bands.set(band, []);
            bands.get(band).push(spot);
        }

        const freqs = [...new Set(spots.map(spot => (Number(spot.frequency) / 1000).toFixed(3)))];
        const modes = [...new Set(spots.map(spot => spot.mode).filter(Boolean))];

        const stat = (label, value, sub = "", cls = "") => `
            <div class="rbn-stat">
                <div class="rbn-stat-label">${label}</div>
                <div class="rbn-stat-value ${cls}">${value}</div>
                <div class="rbn-stat-sub">${sub || "&nbsp;"}</div>
            </div>`;

        content.innerHTML = `
            <div class="rbn-summary">
                ${stat("Heard", escapeHtml(calls.join(", ")), `${escapeHtml(freqs.length === 1 ? `${freqs[0]} MHz` : [...bands.keys()].join(", "))} · ${escapeHtml(modes.join("/"))}`, "cyan")}
                ${stat("Skimmers", String(all.length), `${spots.length} report(s)`)}
                ${stat("Best signal", best && Number.isFinite(best.snr) ? `${best.snr >= 0 ? "+" : ""}${best.snr} dB` : "—", best ? escapeHtml(rbnSkimmerName(best.spotter)) : "")}
                ${stat("Farthest", farthest ? `${farthest.distanceKm} km` : "—", farthest ? escapeHtml(rbnSkimmerName(farthest.spotter)) : "")}
                ${stat("Last report", latest ? escapeHtml(latest.time) : "—", latest ? rbnAgoText(latest.minutes) : "")}
            </div>
            ${bands.size > 1
                ? [...bands.entries()].map(([band, list]) => `<div class="rbn-band-title">${escapeHtml(band)}</div>${rbnTable(rbnSkimmers(list), maxSnr)}`).join("")
                : rbnTable(all, maxSnr)}
        `;

    }
    catch (error) {
        console.error("RBN:", error);
        content.innerHTML = '<div class="rbn-muted">RBN data unavailable</div>';
    }

}

/* click on DISTANCE / SIGNAL / LAST: sort */
document.addEventListener("click", event => {
    const head = event.target.closest?.("[data-rbn-sort]");
    if (!head) return;
    rbnSort = head.dataset.rbnSort;
    try { localStorage.setItem("rbn-sort", rbnSort); } catch { /* no storage */ }
    loadRbnData();
});


async function openRbnMap() {

    try {

        const response =
            await fetch(
                "/api/rbn"
            );

        if (!response.ok) {
            throw new Error(
                `RBN API: ${response.status}`
            );
        }

        const spots =
            await response.json();

        const stationResponse =
            await fetch(
                "/api/station"
            );

        if (!stationResponse.ok) {
            throw new Error(
                `Station API: ${stationResponse.status}`
            );
        }

        const station =
            await stationResponse.json();

        const qthPosition =
            window.maidenheadToLatLon
                ? window.maidenheadToLatLon(
                    station.locator
                )
                : null;

        if (!qthPosition) {

            console.error(
                "RBN map: invalid shack locator"
            );

            return;

        }

        const overlay =
            document.createElement(
                "div"
            );

        overlay.id =
            "rbn-map-overlay";

        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        overlay.innerHTML = `

            <div
                id="rbn-map-dialog"
                style="
                    position: relative;
                    width: 92vw;
                    max-width: 1200px;
                    background: #0b151e;
                    border-radius: 10px;
                    padding: 18px;
                    box-shadow: 0 10px 40px rgba(0,0,0,.6);
                "
            >

                <button
                    id="rbn-map-close"
                    type="button"
                    style="
                        position:absolute;
                        right:12px;
                        top:8px;
                        background:none;
                        border:none;
                        color:white;
                        font-size:20px;
                        cursor:pointer;
                    "
                >✕</button>

                <div
                    style="
                        color:white;
                        font-size:16px;
                        padding-right:35px;
                        margin-bottom:14px;
                    "
                >
                    RBN Spotters
                </div>

                <div
                    id="rbn-map"
                    style="
                        width:100%;
                        height:650px;
                        border-radius:6px;
                        overflow:hidden;
                    "
                ></div>

            </div>
        `;

        document.body.appendChild(
            overlay
        );

        const mapElement =
            document.getElementById(
                "rbn-map"
            );

        if (!mapElement) {
            return;
        }

        const map =
            L.map(
                mapElement
            );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 18,
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);

        const qthMarker =
            L.marker([
                qthPosition.lat,
                qthPosition.lon
            ])
            .addTo(map);

        qthMarker.bindPopup(
            `<b>${escapeHtml(
                station.callsign || ""
            )}</b><br>${escapeHtml(
                station.locator || ""
            )}`
        );

        const points = [
            [
                qthPosition.lat,
                qthPosition.lon
            ]
        ];

        const spotters =
            new Map();

        for (
            const spot of spots
        ) {

            if (
                !spot.spotterGrid
            ) {
                continue;
            }

            const normalizedSpotter =
                String(
                    spot.spotter || ""
                )
                .split("-")[0]
                .toUpperCase();

            if (!normalizedSpotter) {
                continue;
            }

            if (
                !spotters.has(
                    normalizedSpotter
                )
            ) {

                spotters.set(
                    normalizedSpotter,
                    spot
                );

            }

        }

        for (
            const spot of spotters.values()
        ) {

            const position =
                window.maidenheadToLatLon
                    ? window.maidenheadToLatLon(
                        spot.spotterGrid
                    )
                    : null;

            if (!position) {
                continue;
            }

            const flag =
                spot.spotterCountryCode
                    ? `<img
                            src="/assets/flags/${spot.spotterCountryCode}.svg"
                            style="width:18px;height:12px;vertical-align:middle;margin-right:5px;"
                        >`
                    : "";

            const marker =
                L.marker([
                    position.lat,
                    position.lon
                ])
                .addTo(map);

            marker.bindPopup(`
                <b>
                    ${flag}${escapeHtml(
                        spot.spotter
                    )}
                </b><br>
                ${escapeHtml(
                    spot.spotterGrid
                )}<br>
                ${spot.distanceKm != null
                    ? `${escapeHtml(
                        String(spot.distanceKm)
                    )} km`
                    : ""}
            `);

            L.polyline(
                [
                    [
                        qthPosition.lat,
                        qthPosition.lon
                    ],
                    [
                        position.lat,
                        position.lon
                    ]
                ],
                {
                    weight: 2
                }
            ).addTo(map);

            points.push([
                position.lat,
                position.lon
            ]);

        }

        map.fitBounds(
            points,
            {
                padding: [
                    40,
                    40
                ]
            }
        );

        document
            .getElementById(
                "rbn-map-close"
            )
            ?.addEventListener(
                "click",
                () => overlay.remove()
            );

        overlay.addEventListener(
            "click",
            event => {

                if (
                    event.target === overlay
                ) {

                    overlay.remove();

                }

            }
        );

    }
    catch (error) {

        console.error(
            "RBN map:",
            error
        );

    }

}


window.addEventListener(
    "componentsLoaded",
    setupRbn
);
