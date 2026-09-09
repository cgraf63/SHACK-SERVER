console.log("RBN JS LOADED");


let rbnRefreshTimer = null;


function setupRbn() {

    const rbnButton =
        document.getElementById("rbn-btn");

    if (!rbnButton) {

        console.warn(
            "RBN button not found"
        );

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


async function loadRbnData() {

    const content =
        document.getElementById(
            "rbn-content"
        );


    if (!content) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/rbn"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const spots =
            await response.json();


        if (
            !Array.isArray(spots) ||
            spots.length === 0
        ) {

            content.innerHTML =
                "Waiting for RBN data";

            return;

        }


        const visibleSpots =
            spots.slice(
                0,
                20
            );


        content.innerHTML = `

            <div class="rbn-table">

                <div class="rbn-table-header">

                    <span>CALL</span>
                    <span>FREQUENCY</span>
                    <span>MODE</span>
                    <span>SNR</span>
                    <span>SPOTTER</span>
                    <span>DISTANCE</span>
                    <span>TIME</span>

                </div>

                <div class="rbn-table-body">

                    ${visibleSpots
                        .map(
                            spot => {

                                const frequency =
                                    Number(
                                        spot.frequency
                                    ) / 1000;


                                const frequencyText =
                                    Number.isFinite(
                                        frequency
                                    )
                                        ? `${frequency.toFixed(3)} MHz`
                                        : "—";


                                const snr =
                                    Number(
                                        spot.snr
                                    );


                                const snrText =
                                    Number.isFinite(
                                        snr
                                    )
                                        ? (
                                            snr >= 0
                                                ? `+${snr}`
                                                : `${snr}`
                                        )
                                        : "—";


                                const distance =
                                    spot.distanceKm != null
                                        ? `${spot.distanceKm} km`
                                        : "—";


                                return `

                                    <div class="rbn-table-row">

                                        <span>
                                            ${escapeHtml(
                                                spot.callsign
                                            )}
                                        </span>

                                        <span>
                                            ${frequencyText}
                                        </span>

                                        <span>
                                            ${escapeHtml(
                                                spot.mode
                                            )}
                                        </span>

                                        <span>
                                            ${snrText} dB
                                        </span>

                                        <span>
                                            ${
                                                spot.spotterCountryCode
                                                    ? `<img class="rbn-flag" src="/assets/flags/${spot.spotterCountryCode}.svg" alt="">`
                                                    : ""
                                            }
                                            ${escapeHtml(
                                                spot.spotter
                                            )}
                                        </span>

                                        <span>
                                            ${escapeHtml(
                                                distance
                                            )}
                                        </span>

                                        <span>
                                            ${escapeHtml(
                                                spot.time
                                            )}
                                        </span>

                                    </div>

                                `;

                            }
                        )
                        .join("")}

                </div>

            </div>
        `;

    }
    catch (error) {

        console.error(
            "RBN popup:",
            error
        );


        content.innerHTML =
            "RBN data unavailable";

    }

}


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
