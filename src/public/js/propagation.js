/*
    Propagation update
*/

async function updatePropagation() {

    try {

        const response =
            await fetch(
                "/api/propagation"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const solarFlux =
            document.getElementById(
                "solarFlux"
            );


        const aIndex =
            document.getElementById(
                "aIndex"
            );


        const kIndex =
            document.getElementById(
                "kIndex"
            );


        if (solarFlux) {

            solarFlux.textContent =
                data.solarFlux ??
                "--";

        }


        if (aIndex) {

            aIndex.textContent =
                data.aIndex ??
                "--";

        }


        if (kIndex) {

            kIndex.textContent =
                data.kIndex ??
                "--";

        }

const sidcF107 =
    document.getElementById(
        "sidc-f107"
    );


const sidcAp =
    document.getElementById(
        "sidc-ap"
    );


const sidcF107Scale =
    document.getElementById(
        "sidc-f107-scale"
    );


const sidcApScale =
    document.getElementById(
        "sidc-ap-scale"
    );


if (
    data.sidc
) {

    if (sidcF107) {

        sidcF107.textContent =
            data.sidc.solarFlux ??
            "--";

    }


    if (sidcAp) {

        sidcAp.textContent =
            data.sidc.ap ??
            "--";

    }


    if (sidcF107Scale) {

        sidcF107Scale.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    ((data.sidc.solarFlux - 70) / 100) * 100
                )
            )}%`;

    }


    if (sidcApScale) {

        sidcApScale.style.width =
            `${Math.min(
                100,
                Math.max(
                    0,
                    (data.sidc.ap / 40) * 100
                )
            )}%`;

    }

}

        if (
            Array.isArray(
                data.bands
            )
        ) {

            updateBandGraph(
                data.bands
            );

        }

    }
    catch (error) {

        console.error(
            "Propagation update failed:",
            error
        );

    }

}



/*
    Band conditions: one point per band (height = score 0-100,
    colour = condition), joined by a smooth line with a soft area
    below it. The API returns [{ band: "20m", score: 72, condition: "Good" }].
*/
const BAND_GRAPH_BANDS = ["10m", "12m", "15m", "17m", "20m", "30m", "40m", "60m", "80m"];

function bandColor(score) {
    if (score >= 70) return "#27d17f";
    if (score >= 40) return "#f0b429";
    return "#e05252";
}

function updateBandGraph(bands) {

    const graph = document.getElementById("bandGraph");
    if (!graph) return;

    const NS = "http://www.w3.org/2000/svg";
    const width = 600;
    const height = 40;
    const top = 6;              // room for the point at 100
    const bottom = height - 6;  // and at 0

    graph.setAttribute("viewBox", `0 0 ${width} ${height}`);
    graph.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const byBand = {};
    (bands || []).forEach(item => { byBand[item.band] = item; });

    const step = width / BAND_GRAPH_BANDS.length;

    const points = BAND_GRAPH_BANDS.map((band, index) => {
        const item = byBand[band] || {};
        const raw = Number(item.score);
        const known = Number.isFinite(raw);
        const score = known ? Math.max(0, Math.min(100, raw)) : 0;
        return {
            band,
            known,
            score,
            condition: item.condition || "",
            x: index * step + step / 2,
            y: bottom - (score / 100) * (bottom - top)
        };
    });

    const known = points.filter(point => point.known);

    /* smooth line through the points (Catmull-Rom as Bezier) */
    const curve = list => list.map((point, index) => {
        if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
        const p0 = list[index - 2] || list[index - 1];
        const p1 = list[index - 1];
        const p3 = list[index + 1] || point;
        const c1x = p1.x + (point.x - p0.x) / 6;
        const c1y = p1.y + (point.y - p0.y) / 6;
        const c2x = point.x - (p3.x - p1.x) / 6;
        const c2y = point.y - (p3.y - p1.y) / 6;
        return `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }).join(" ");

    const el = (name, attrs) => {
        const node = document.createElementNS(NS, name);
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
        return node;
    };

    graph.innerHTML = "";

    const defs = el("defs", {});
    const area = el("linearGradient", { id: "bandAreaFill", x1: 0, y1: 0, x2: 0, y2: 1 });
    area.appendChild(el("stop", { offset: "0%", "stop-color": "#00e5ff", "stop-opacity": 0.22 }));
    area.appendChild(el("stop", { offset: "100%", "stop-color": "#00e5ff", "stop-opacity": 0 }));
    defs.appendChild(area);

    /* line colour along x follows the colour of the points */
    const lineGradient = el("linearGradient", { id: "bandLineColor", x1: 0, y1: 0, x2: width, y2: 0, gradientUnits: "userSpaceOnUse" });
    points.forEach(point => lineGradient.appendChild(el("stop", {
        offset: `${(point.x / width) * 100}%`,
        "stop-color": point.known ? bandColor(point.score) : "#455560"
    })));
    defs.appendChild(lineGradient);
    graph.appendChild(defs);

    /* faint guides at the colour limits (40 fair, 70 good) */
    [40, 70].forEach(limit => {
        const y = bottom - (limit / 100) * (bottom - top);
        graph.appendChild(el("line", {
            x1: 0, x2: width, y1: y, y2: y,
            stroke: "rgba(255,255,255,0.07)", "stroke-width": 1, "stroke-dasharray": "3 4"
        }));
    });

    if (known.length >= 2) {
        const line = curve(known);
        const first = known[0];
        const last = known[known.length - 1];
        graph.appendChild(el("path", {
            d: `${line} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`,
            fill: "url(#bandAreaFill)"
        }));
        graph.appendChild(el("path", {
            d: line, fill: "none", stroke: "url(#bandLineColor)",
            "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.85
        }));
    }

    points.forEach(point => {
        const dot = el("circle", {
            cx: point.x.toFixed(1),
            cy: point.y.toFixed(1),
            r: point.known ? 4.5 : 3,
            fill: point.known ? bandColor(point.score) : "#455560",
            stroke: "#0b1117",
            "stroke-width": 2
        });
        const tip = el("title", {});
        tip.textContent = point.known
            ? `${point.band}: ${point.condition || ""} (score ${Math.round(point.score)})`
            : `${point.band}: no data`;
        dot.appendChild(tip);
        graph.appendChild(dot);
    });

}


/*
    Update inline station status
*/

async function updateStationInline() {

    try {

        const response =
            await fetch(
                "/api/radio"
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        const station =
            document.getElementById(
                "station-inline-content"
            );

        if (!station) {
            return;
        }

        const radios =
            Array.isArray(data.radios)
                ? data.radios
                : [];

        station.innerHTML = "";

        if (!radios.length) {
            return;
        }

        /*
         * Only radios enabled in
         * radios.config.ts are shown.
         */
        const availableRadios =
            radios.filter(
                radio =>
                    radio &&
                    radio.id &&
                    radio.name
            );

        if (!availableRadios.length) {
            return;
        }

        const activeRadio =
            availableRadios.find(
                radio =>
                    radio.active
            ) ||
            availableRadios[0];

        /*
         * Container keeps the selector
         * to the left of the active radio.
         */
        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "station-inline-wrapper";


        /*
         * Radio selector
         */
        const select =
            document.createElement(
                "select"
            );

        select.className =
            "station-inline-selector";

        select.setAttribute(
            "aria-label",
            "Active Transceiver"
        );


        availableRadios.forEach(
            radio => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(
                        radio.id
                    );

                option.textContent =
                    radio.name;

                if (
                    radio.id ===
                    activeRadio.id
                ) {
                    option.selected =
                        true;
                }

                select.appendChild(
                    option
                );

            }
        );


        /*
         * Change active radio.
         */
        select.addEventListener(
            "change",
            async event => {

                const target =
                    event.target;

                if (
                    !(target instanceof
                    HTMLSelectElement)
                ) {
                    return;
                }

                const radioId =
                    target.value;

                if (!radioId) {
                    return;
                }

                select.disabled =
                    true;

                try {

                    const response =
                        await fetch(
                            "/api/radio/active",
                            {

                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            radioId:
                                                radioId
                                        }
                                    )

                            }
                        );

                    if (!response.ok) {

                        throw new Error(
                            `HTTP ${response.status}`
                        );

                    }

                    await updateStationInline();

                }
                catch (error) {

                    console.error(
                        "Active radio change failed:",
                        error
                    );

                    select.value =
                        String(
                            activeRadio.id
                        );

                }
                finally {

                    select.disabled =
                        false;

                }

            }
        );


        /*
         * Active radio card
         */
        const frequency =
            activeRadio.frequency
                ? Number(activeRadio.frequency).toLocaleString("de-CH")
                : "---.---.---";

        const mode =
            activeRadio.mode ||
            "--";

        const power =
            `${activeRadio.power ?? 0} W`;

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "station-inline-radio";


        if (
            !activeRadio.connected
        ) {

            card.classList.add(
                "disconnected"
            );

        }
        else {

            card.classList.add(
                "active"
            );

        }


        card.innerHTML = `
            <div class="station-inline-top">

                <span class="station-inline-name">
                    ${activeRadio.name}
                </span>

                <span class="station-inline-cat">

                    <span
                        class="cat-dot ${
                            activeRadio.connected
                                ? "connected"
                                : "disconnected"
                        }"
                    ></span>

                    CAT

                </span>

            </div>

            <div class="station-inline-bottom">

                <span class="station-inline-data">
                    ${frequency}
                    ·
                    ${mode}
                    ·
                    ${power}
                </span>

            </div>
        `;


        wrapper.appendChild(
            select
        );

        wrapper.appendChild(
            card
        );

        const remoteButton =
            document.createElement("button");

        remoteButton.className =
            "station-remote-button";

        remoteButton.type =
            "button";

        /*
         * Remote pages per driver.
         */
        const REMOTE_PAGES = {
            "ftdx10": { label: "FTDX10", url: "/remote.html" },
            "rgo-one": { label: "RGO ONE", url: "/rgo-remote.html" },
            "ftx-1": { label: "FTX-1", url: "/ftx1" },
            "ic7300": { label: "IC-7300", url: "/ic7300" },
            "qmx": { label: "QMX", url: "/qmx" }
        };

        const remotePage =
            REMOTE_PAGES[
                String(activeRadio.protocol || "").toLowerCase()
            ];

        remoteButton.textContent =
            remotePage ? remotePage.label : "";

        remoteButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                if (remotePage) {
                    window.location.href =
                        remotePage.url;
                }

            }
        );

        /*
         * Only for transceivers with a remote page
         * (FTDX10, RGO One).
         */
        if (remotePage) {

            wrapper.appendChild(
                remoteButton
            );

        }

        station.appendChild(
            wrapper
        );

    }
    catch (error) {

        console.error(
            "Station inline update failed:",
            error
        );

    }

}



/*
    Initialize after components
    are dynamically loaded
*/

function initializePropagation() {

    updatePropagation();

    updateStationInline();

}


/*
    Leichter 2s-Poll: aktualisiert nur Frequenz/Mode/Power
    und CAT-Status im bestehenden Inline-Block, ohne das
    Select neu zu bauen. Rebuild nur bei Radio-Listen-Aenderung.
*/

let stationInlineFingerprint = null;


async function refreshStationInlineFrequency() {

    try {

        const response =
            await fetch("/api/radio");

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        const radios =
            Array.isArray(data.radios)
                ? data.radios
                : [];

        const fingerprint =
            radios
                .map(
                    radio =>
                        `${radio.id}:${radio.active ? 1 : 0}:${radio.connected ? 1 : 0}`
                )
                .join("|");

        if (
            stationInlineFingerprint !== null &&
            fingerprint !== stationInlineFingerprint
        ) {

            /*
                Radio-Liste / Active-Status hat sich
                geaendert -> kompletter Rebuild.
            */

            stationInlineFingerprint =
                fingerprint;

            await updateStationInline();

            return;

        }

        stationInlineFingerprint =
            fingerprint;

        const dataElement =
            document.querySelector(
                "#station-inline-content .station-inline-data"
            );

        if (!dataElement) {
            return;
        }

        const activeRadio =
            radios.find(
                radio =>
                    radio.active
            ) ||
            radios[0];

        if (!activeRadio) {
            return;
        }

        const frequency =
            activeRadio.frequency
                ? Number(activeRadio.frequency).toLocaleString("de-CH")
                : "---.---.---";

        const mode =
            activeRadio.mode ||
            "--";

        const power =
            `${activeRadio.power ?? 0} W`;

        dataElement.textContent =
            `${frequency} · ${mode} · ${power}`;

    }
    catch (error) {

        /*
            Netzwerk-/Serverfehler still ignorieren,
            naechster Poll versucht es erneut.
        */

    }

}


setInterval(
    refreshStationInlineFrequency,
    2000
);



/*
    Normal component loader event
*/

window.addEventListener(
    "componentsLoaded",
    () => {

        initializePropagation();

    }
);



/*
    Fallback.

    If propagation.js is loaded
    after the componentsLoaded event,
    wait briefly and try again.
*/

setTimeout(
    () => {

        const propagation =
            document.getElementById(
                "solarFlux"
            );


        if (
            propagation
        ) {

            initializePropagation();

        }

    },
    500
);
