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
                RBN
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

¨					<span>
    ${
        spot.countryCode
            ? `<img class="rbn-flag" src="/assets/flags/${spot.countryCode}.svg" alt="">`
            : ""
    }
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


window.addEventListener(
    "componentsLoaded",
    setupRbn
);
