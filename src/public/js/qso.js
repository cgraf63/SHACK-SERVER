let activeQsoSpot = null;
let activeQsoStation = null;


/*
    Open QSO dialog
*/
function openQsoDialog(spot, station) {

    activeQsoSpot = {
        ...spot,
        qsoTimeUtc: new Date().toISOString()
    };

    activeQsoStation = station;

    const existing =
        document.getElementById("qso-dialog");

    if (existing) {
        existing.remove();
    }


    const dialog =
        document.createElement("div");

    dialog.id = "qso-dialog";

    dialog.className =
        "qso-overlay";


    dialog.innerHTML = `

        <div class="qso-dialog">

            <div class="qso-header">

                <div>
                    <div class="qso-title">
                        📝 New QSO
                    </div>

                    <div class="qso-station">
                        ${station.callsign || "--"}
                        ·
                        ${station.locator || "--"}
                    </div>
                </div>

                <button
                    class="qso-close"
                    id="qso-close"
                    title="Close">
                    ×
                </button>

            </div>


            <div class="qso-body">


                <div class="qso-call-section">

                    <div class="qso-label">
                        DX CALL
                    </div>

                    <div class="qso-call">
                        ${escapeQsoHtml(spot.call || "--")}
                    </div>

                </div>


                <div class="qso-info-grid">


                    <div class="qso-info-card">

                        <span>
                            FREQUENCY
                        </span>

                        <strong>
                            ${
                                Number.isFinite(
                                    Number(spot.frequency)
                                )
                                ?
                                `${Number(spot.frequency).toFixed(3)} kHz`
                                :
                                "--"
                            }
                        </strong>

                    </div>


                    <div class="qso-info-card">

                        <span>
                            BAND
                        </span>

                        <strong>
                            ${escapeQsoHtml(spot.band || "--")}
                        </strong>

                    </div>


                    <div class="qso-info-card">

                        <span>
                            MODE
                        </span>

                        <strong>
                            ${escapeQsoHtml(spot.mode || "--")}
                        </strong>

                    </div>


                    <div class="qso-info-card">

                        <span>
                            UTC
                        </span>

                        <strong id="qso-time">
                            ${formatQsoUtc(activeQsoSpot.qsoTimeUtc)}
                        </strong>

                    </div>


                </div>


                <div class="qso-form-grid">


                    <div class="qso-field">

                        <label>
                            RST SENT
                        </label>

                        <input
                            id="qso-rst-sent"
                            type="text"
                            value="59"
                            maxlength="5">

                    </div>


                    <div class="qso-field">

                        <label>
                            RST RECEIVED
                        </label>

                        <input
                            id="qso-rst-rcvd"
                            type="text"
                            value="59"
                            maxlength="5">

                    </div>


                    <div class="qso-field qso-field-wide">

                        <label>
                            NAME
                        </label>

                        <input
                            id="qso-name"
                            type="text"
                            autocomplete="off">

                    </div>


                    <div class="qso-field">

                        <label>
                            QTH
                        </label>

                        <input
                            id="qso-qth"
                            type="text"
                            autocomplete="off">

                    </div>


                    <div class="qso-field">

                        <label>
                            DX GRID
                        </label>

                        <input
                            id="qso-dx-grid"
                            type="text"
                            autocomplete="off"
                            maxlength="8">

                    </div>


                    <div class="qso-field qso-field-wide">

                        <label>
                            NOTES
                        </label>

                        <textarea
                            id="qso-notes"
                            rows="3"></textarea>

                    </div>


                </div>


                <div class="qso-source">

                    <span>
                        SPOT SOURCE
                    </span>

                    <strong>
                        ${escapeQsoHtml(spot.source || "--")}
                    </strong>

                </div>


            </div>


            <div class="qso-footer">

                <button
                    class="qso-btn-secondary"
                    id="qso-cancel">
                    CANCEL
                </button>


                <button
                    class="qso-btn-primary"
                    id="qso-save">
                    SAVE QSO
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(dialog);


    requestAnimationFrame(() => {

        dialog.classList.add(
            "qso-visible"
        );

    });


    /*
        Close buttons
    */

    document
        .getElementById("qso-close")
        ?.addEventListener(
            "click",
            closeQsoDialog
        );


    document
        .getElementById("qso-cancel")
        ?.addEventListener(
            "click",
            closeQsoDialog
        );


    /*
        Save
    */

    document
        .getElementById("qso-save")
        ?.addEventListener(
            "click",
            saveQso
        );


    /*
        Escape key
    */

    document.addEventListener(
        "keydown",
        qsoEscapeHandler
    );


    /*
        Focus callsign-independent
        first useful input
    */

    setTimeout(() => {

        document
            .getElementById("qso-rst-sent")
            ?.focus();

    }, 50);

}


/*
    Close dialog
*/

function closeQsoDialog() {

    const dialog =
        document.getElementById(
            "qso-dialog"
        );

    if (!dialog) {
        return;
    }


    dialog.classList.remove(
        "qso-visible"
    );


    setTimeout(() => {

        dialog.remove();

    }, 180);


    document.removeEventListener(
        "keydown",
        qsoEscapeHandler
    );

}


/*
    Escape key
*/

function qsoEscapeHandler(event) {

    if (event.key === "Escape") {

        closeQsoDialog();

    }

}


/*
    Save QSO
*/

async function saveQso() {

    if (!activeQsoSpot) {
        return;
    }


    const saveButton =
        document.getElementById(
            "qso-save"
        );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.textContent =
            "SAVING...";

    }


    const qso = {

        qso_date:
            activeQsoSpot.qsoTimeUtc
                .substring(0, 10),

        time_on_utc:
            activeQsoSpot.qsoTimeUtc
                .substring(11, 19),

        call:
            activeQsoSpot.call || "",

        frequency:
            Math.round(
                Number(activeQsoSpot.frequency) *
                1000
            ),

        band:
            activeQsoSpot.band || "",

        mode:
            activeQsoSpot.mode || "",

        rst_sent:
            document
                .getElementById("qso-rst-sent")
                ?.value || "59",

        rst_rcvd:
            document
                .getElementById("qso-rst-rcvd")
                ?.value || "59",

        my_callsign:
            activeQsoStation?.callsign || "",

        my_grid:
            activeQsoStation?.locator || "",

        operator_name:
            activeQsoStation?.name || "",

        name:
            document
                .getElementById("qso-name")
                ?.value.trim() || "",

        qth:
            document
                .getElementById("qso-qth")
                ?.value.trim() || "",

        dx_grid:
            document
                .getElementById("qso-dx-grid")
                ?.value.trim() || "",

        notes:
            document
                .getElementById("qso-notes")
                ?.value.trim() || "",

        spot_source:
            activeQsoSpot.source || "",

        spot_id:
            activeQsoSpot.id || null

    };


    console.log(
        "Saving QSO:",
        qso
    );


    try {

        const response =
            await fetch(
                "/api/qso",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(qso)
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                "QSO save failed"
            );

        }


        console.log(
            "QSO saved:",
            result
        );


        closeQsoDialog();


        /*
            Small confirmation
        */

        showQsoToast(
            "QSO saved ✓"
        );


    } catch (error) {

        console.error(
            "QSO save failed:",
            error
        );


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "SAVE QSO";

        }


        alert(
            `QSO could not be saved.\n\n${error.message}`
        );

    }

}


/*
    Toast
*/

function showQsoToast(message) {

    const oldToast =
        document.getElementById(
            "qso-toast"
        );

    if (oldToast) {
        oldToast.remove();
    }


    const toast =
        document.createElement("div");

    toast.id =
        "qso-toast";

    toast.className =
        "qso-toast";

    toast.textContent =
        message;


    document.body.appendChild(
        toast
    );


    requestAnimationFrame(() => {

        toast.classList.add(
            "qso-toast-visible"
        );

    });


    setTimeout(() => {

        toast.classList.remove(
            "qso-toast-visible"
        );

        setTimeout(
            () => toast.remove(),
            200
        );

    }, 2200);

}


/*
    UTC formatting
*/

function formatQsoUtc(iso) {

    if (!iso) {
        return "--:--:-- UTC";
    }


    return (
        iso.substring(11, 19)
        +
        " UTC"
    );

}


/*
    HTML escaping
*/

function escapeQsoHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/*
    Public function
*/

window.openQsoDialog =
    openQsoDialog;
