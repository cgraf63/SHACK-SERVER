let activeQsoSpot = null;
let activeQsoStation = null;


/*
    Open QSO dialog
*/
async function openQsoDialog(
    spot,
    station
) {



    const now =
        new Date();


    activeQsoSpot = {
        ...spot,

        qsoTimeUtc:
            now.toISOString()
    };


    /*
        THIS IS OUR OWN STATION.

        Never use this object for
        DX name / country / grid.
    */

    activeQsoStation =
        station || {};


const qrzCall =
    (
        activeQsoSpot.call ||
        activeQsoStation.callsign ||
        activeQsoStation.call ||
        ""
    )
    .trim()
    .toUpperCase();

if (qrzCall) {

    try {

        const response =
            await fetch(
                `/api/qso/qrz/${encodeURIComponent(qrzCall)}`
            );

        if (response.ok) {

            const result =
                await response.json();

            if (
                result.success &&
                result.qrz
            ) {

                activeQsoStation = {
                    ...activeQsoStation,
                    ...result.qrz
                };

            }

        }

    }
    catch (error) {

        console.warn(
            "QRZ lookup failed:",
            error
        );

    }

}


    /*
        Our station
    */

    const stationCall =
        activeQsoStation.callsign ||
        activeQsoStation.call ||
        "";


    /*
        QRZ DX data

        These fields belong exclusively
        to the station being worked.
    */

    let dxName = "";
    let dxCountry = "";
    let dxGrid = "";
    let dxItu = "";
    let dxCq = "";


    const dxCall =
        String(
            spot.call || ""
        )
        .trim()
        .toUpperCase();


    if (dxCall) {

        try {

            console.log(
                "QRZ lookup:",
                dxCall
            );


            const response =
                await fetch(
                    `/api/qso/qrz/${encodeURIComponent(dxCall)}`
                );


            if (response.ok) {

                const result =
                    await response.json();


                const qrz =
                    result?.qrz;


                if (qrz) {

                    dxName =
                        qrz.name || "";


                    dxCountry =
                        qrz.country || "";


                    dxGrid =
                        qrz.locator || "";


console.log(
    "QRZ DX DATA:",
    qrz
);

console.log(
    "QRZ ZONES:",
    qrz.ituZone,
    qrz.cqZone
);


                    dxItu =
                        qrz.ituZone ??
                        "";


                    dxCq =
                        qrz.cqZone ??
                        "";


                    console.log(
                        "QRZ DX DATA:",
                        qrz
                    );
                }

            }
            else {

                console.log(
                    "QRZ lookup returned:",
                    response.status
                );
            }


        }
        catch (error) {

            console.error(
                "QRZ lookup failed:",
                error
            );
        }
    }


    /*
        IMPORTANT:

        There is deliberately NO fallback
        from DX data to activeQsoStation.

        Therefore JN36FL can never appear
        in DX GRID.
    */


    const existing =
        document.getElementById(
            "qso-dialog"
        );


    if (existing) {
        existing.remove();
    }


    /*
        Date / time
    */

    const startDate =
        now.toISOString()
            .substring(0, 10);


    const startTime =
        now.toISOString()
            .substring(11, 19);


    const endTime =
        startTime; 
   

    /*
        Create dialog
    */

    const dialog =
        document.createElement("div");

    dialog.id =
        "qso-dialog";

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
                        ${escapeQsoHtml(
                            stationCall ||
                            spot.call ||
                            "--"
                        )}
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


                <!-- CALL -->

                <div class="qso-call-section">

                    <div class="qso-label">
                        DX CALL
                    </div>

                    <input
                        id="qso-call"
                        class="qso-call-input"
                        type="text"
                        value="${escapeQsoHtml(
                            spot.call || ""
                        )}"
                        autocomplete="off">

                </div>


                <!-- BASIC QSO DATA -->

                <div class="qso-form-grid">


                    <div class="qso-field">

                        <label>
                            DATE UTC
                        </label>

                        <input
                            id="qso-date"
                            type="date"
                            value="${startDate}">

                    </div>


                    <div class="qso-field">

                        <label>
                            START UTC
                        </label>

                        <input
                            id="qso-time-on"
                            type="time"
                            step="1"
                            value="${startTime}">

                    </div>


                    <div class="qso-field">

                        <label>
                            END UTC
                        </label>

                        <input
                            id="qso-time-off"
                            type="time"
                            step="1"
                            value="${endTime}">

                    </div>


                    <div class="qso-field">

                        <label>
                            END
                        </label>

                        <button
                            type="button"
                            class="qso-btn-secondary"
                            id="qso-end-now">

                            END NOW

                        </button>

                    </div>


                    <div class="qso-field">

                        <label>
                            FREQUENCY kHz
                        </label>

                        <input
                            id="qso-frequency"
                            type="number"
                            step="0.001"
                            value="${
                                Number.isFinite(
                                    Number(
                                        spot.frequency
                                    )
                                )
                                ?
                                Number(
                                    spot.frequency
                                ).toFixed(3)
                                :
                                ""
                            }">

                    </div>


                    <div class="qso-field">

                        <label>
                            BAND
                        </label>

                        <input
                            id="qso-band"
                            type="text"
                            value="${escapeQsoHtml(
                                spot.band || ""
                            )}">

                    </div>


                    <div class="qso-field">

                        <label>
                            MODE
                        </label>

                        <input
                            id="qso-mode"
                            type="text"
                            value="${escapeQsoHtml(
                                spot.mode || ""
                            )}">

                    </div>


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


                </div>


                <!-- DX INFORMATION -->

                <div class="qso-section-title">
                    DX INFORMATION
                </div>


                <div class="qso-form-grid">


                    <div class="qso-field">

                        <label>
                            NAME
                        </label>

                        <input
                            id="qso-name"
                            type="text"
                            value="${escapeQsoHtml(
                                dxName
                            )}"
                            autocomplete="off">

                    </div>


                    <div class="qso-field">

                        <label>
                            COUNTRY
                        </label>

                        <input
                            id="qso-country"
                            type="text"
                            value="${escapeQsoHtml(
                                dxCountry
                            )}"
                            autocomplete="off">

                    </div>


                    <div class="qso-field">

                        <label>
                            DX GRID
                        </label>

                        <input
                            id="qso-dx-grid"
                            type="text"
                            value="${escapeQsoHtml(
                                dxGrid
                            )}"
                            maxlength="8"
                            autocomplete="off">

                    </div>


                    <div class="qso-field">

                        <label>
                            ITU
                        </label>

                        <input
                            id="qso-itu"
                            type="number"
                            value="${escapeQsoHtml(
                                dxItu
                            )}">

                    </div>


                    <div class="qso-field">

                        <label>
                            CQ
                        </label>

                        <input
                            id="qso-cq"
                            type="number"
                            value="${escapeQsoHtml(
                                dxCq
                            )}">

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


                <!-- MY STATION -->

                <div class="qso-section-title">
                    MY STATION
                </div>


                <div class="qso-form-grid">


                    <div class="qso-field">

                        <label>
                            MY CALLSIGN
                        </label>

                        <input
                            id="qso-my-callsign"
                            type="text"
                            value="${escapeQsoHtml(
                                activeQsoStation.callsign ||
                                activeQsoStation.my_callsign ||
                                ""
                            )}">

                    </div>


                    <div class="qso-field">

                        <label>
                            MY GRID
                        </label>

                        <input
                            id="qso-my-grid"
                            type="text"
                            value="${escapeQsoHtml(
                                activeQsoStation.my_grid ||
                                ""
                            )}">

                    </div>


                    <div class="qso-field">

                        <label>
                            OPERATOR
                        </label>

                        <input
                            id="qso-operator"
                            type="text"
                            value="${escapeQsoHtml(
                                activeQsoStation.name ||
                                activeQsoStation.operator_name ||
                                ""
                            )}">

                    </div>


                </div>


                <!-- SOURCE -->

                <div class="qso-source">

                    <span>
                        SPOT SOURCE
                    </span>

                    <strong>
                        ${escapeQsoHtml(
                            spot.source || "--"
                        )}
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


    document.body.appendChild(
        dialog
    );


    requestAnimationFrame(
        () => {

            dialog.classList.add(
                "qso-visible"
            );

        }
    );


    /*
        Close
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
        END NOW
    */

    document
        .getElementById("qso-end-now")
        ?.addEventListener(
            "click",
            setQsoEndNow
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
        Escape
    */

    document.addEventListener(
        "keydown",
        qsoEscapeHandler
    );


    /*
        Focus call
    */

    setTimeout(
        () => {

            document
                .getElementById(
                    "qso-call"
                )
                ?.focus();

        },
        50
    );

}


/*
    Set QSO end time
*/
function setQsoEndNow() {

    const now =
        new Date();

    const time =
        now.toISOString()
            .substring(11, 19);


    const field =
        document.getElementById(
            "qso-time-off"
        );

    if (field) {

        field.value =
            time;

    }

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


    setTimeout(
        () => {

            dialog.remove();

        },
        180
    );


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

        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";

    }


    /*
        Read editable fields
    */

    const call =
        document
            .getElementById(
                "qso-call"
            )
            ?.value
            .trim()
            .toUpperCase() || "";


    const qsoDate =
        document
            .getElementById(
                "qso-date"
            )
            ?.value || "";


    const timeOn =
        document
            .getElementById(
                "qso-time-on"
            )
            ?.value || "";


    const timeOff =
        document
            .getElementById(
                "qso-time-off"
            )
            ?.value || "";


    const frequencyKHz =
        Number(
            document
                .getElementById(
                    "qso-frequency"
                )
                ?.value
        );


    const qso = {

        qso_date:
            qsoDate,

        time_on_utc:
            timeOn,

        time_off_utc:
            timeOff || null,

        call:
            call,

        frequency:
            Math.round(
                frequencyKHz * 1000
            ),

        band:
            document
                .getElementById(
                    "qso-band"
                )
                ?.value
                .trim() || "",

        mode:
            document
                .getElementById(
                    "qso-mode"
                )
                ?.value
                .trim()
                .toUpperCase() || "",

        rst_sent:
            document
                .getElementById(
                    "qso-rst-sent"
                )
                ?.value
                .trim() || "59",

        rst_rcvd:
            document
                .getElementById(
                    "qso-rst-rcvd"
                )
                ?.value
                .trim() || "59",


        my_callsign:
            document
                .getElementById(
                    "qso-my-callsign"
                )
                ?.value
                .trim()
                .toUpperCase() || "",

        my_grid:
            document
                .getElementById(
                    "qso-my-grid"
                )
                ?.value
                .trim()
                .toUpperCase() || "",

        operator_name:
            document
                .getElementById(
                    "qso-operator"
                )
                ?.value
                .trim() || "",


        name:
            document
                .getElementById(
                    "qso-name"
                )
                ?.value
                .trim() || "",

        country:
            document
                .getElementById(
                    "qso-country"
                )
                ?.value
                .trim() || "",

        dx_grid:
            document
                .getElementById(
                    "qso-dx-grid"
                )
                ?.value
                .trim()
                .toUpperCase() || "",

        itu_zone:
            getOptionalNumber(
                "qso-itu"
            ),

        cq_zone:
            getOptionalNumber(
                "qso-cq"
            ),


        notes:
            document
                .getElementById(
                    "qso-notes"
                )
                ?.value
                .trim() || "",


        spot_source:
            activeQsoSpot.source || "",

        spot_id:
            activeQsoSpot.id || null

    };


    /*
        Basic validation
    */

    if (!qso.qso_date) {

        alert(
            "Please enter a QSO date."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.time_on_utc) {

        alert(
            "Please enter the QSO start time."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.call) {

        alert(
            "Please enter a callsign."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (
        !Number.isFinite(
            qso.frequency
        )
    ) {

        alert(
            "Please enter a valid frequency."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.band) {

        alert(
            "Please enter a band."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.mode) {

        alert(
            "Please enter a mode."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.my_callsign) {

        alert(
            "Please enter your callsign."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.my_grid) {

        alert(
            "Please enter your grid."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    if (!qso.operator_name) {

        alert(
            "Please enter the operator name."
        );

        restoreSaveButton(
            saveButton
        );

        return;

    }


    console.log(
        "Saving QSO:",
        qso
    );


    try {

        const response =
            await fetch(
                "/api/qso",
                {

                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            qso
                        )

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


        showQsoToast(
            "QSO saved ✓"
        );


    }
    catch (error) {

        console.error(
            "QSO save failed:",
            error
        );


        restoreSaveButton(
            saveButton
        );


        alert(
            `QSO could not be saved.\n\n${
                error instanceof Error
                    ? error.message
                    : String(error)
            }`
        );

    }

}


/*
    Optional number
*/
function getOptionalNumber(id) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        return null;
    }


    const value =
        element.value.trim();


    if (!value) {
        return null;
    }


    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : null;

}


/*
    Restore save button
*/
function restoreSaveButton(
    button
) {

    if (!button) {
        return;
    }

    button.disabled =
        false;

    button.textContent =
        "SAVE QSO";

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
        document.createElement(
            "div"
        );

    toast.id =
        "qso-toast";

    toast.className =
        "qso-toast";

    toast.textContent =
        message;


    document.body.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "qso-toast-visible"
            );

        }
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "qso-toast-visible"
            );

            setTimeout(
                () => toast.remove(),
                200
            );

        },
        2200
    );

}


/*
    HTML escaping
*/
function escapeQsoHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/*
    Public function
*/
window.openQsoDialog =
    openQsoDialog;
