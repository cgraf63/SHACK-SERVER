console.log("RBN JS LOADED");


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


async function openRbnPopup() {

    let modal =
        document.getElementById("rbn-modal");


    if (!modal) {

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

                    modal?.classList.remove(
                        "visible"
                    );

                }
            );


        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    modal.classList.remove(
                        "visible"
                    );

                }

            }
        );

    }


    modal.classList.add(
        "visible"
    );


    const content =
        document.getElementById(
            "rbn-content"
        );


    if (!content) {
        return;
    }


    content.innerHTML =
        "Loading...";


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


        const spot =
            spots[0];


        const frequency =
            Number(
                spot.frequency
            ).toFixed(2);


        const snr =
            Number(
                spot.snr
            );


        const snrText =
            snr >= 0
                ? `+${snr}`
                : `${snr}`;


        const distance =
            spot.distanceKm != null
                ? `${spot.distanceKm} km`
                : "—";


        content.innerHTML = `

            <div class="rbn-row">
                <span>CALL</span>
                <strong>
                    ${spot.callsign || "—"}
                </strong>
            </div>

            <div class="rbn-row">
                <span>FREQUENCY</span>
                <strong>
                    ${frequency} MHz
                </strong>
            </div>

            <div class="rbn-row">
                <span>MODE</span>
                <strong>
                    ${spot.mode || "—"}
                </strong>
            </div>

            <div class="rbn-row">
                <span>SNR</span>
                <strong>
                    ${snrText} dB
                </strong>
            </div>

            <div class="rbn-row">
                <span>SPOTTER</span>
                <strong>
                    ${spot.spotter || "—"}
                </strong>
            </div>

            <div class="rbn-row">
                <span>DISTANCE</span>
                <strong>
                    ${distance}
                </strong>
            </div>

            <div class="rbn-row">
                <span>TIME</span>
                <strong>
                    ${spot.time || "—"}
                </strong>
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
