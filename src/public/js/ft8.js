console.log("FT8 JS LOADED");


let ft8Decodes = [];

function addFt8Decode(decode) {

    if (!decode.utc) {

        decode.utc =
            new Date()
                .toISOString()
                .substring(
                    11,
                    19
                );

    }


    ft8Decodes.unshift(
        decode
    );


    renderFt8Decodes();

}

/*
 * ADD FT8 DECODE
 */

function addFt8Decode(decode) {

    ft8Decodes.unshift(
        decode
    );


    renderFt8Decodes();

}


/*
 * CLEAR FT8 DECODES
 */

function clearFt8Decodes() {

    ft8Decodes = [];


    renderFt8Decodes();

}


/*
 * UPDATE STATUS
 */

function setFt8Status(text) {

    const status =
        document.getElementById(
            "ft8-status-text"
        );


    if (!status) {

        return;

    }


    status.textContent =
        text;

}


/*
 * RENDER TABLE
 */

function renderFt8Decodes() {

    const tbody =
        document.getElementById(
            "ft8-decodes-body"
        );


    const counter =
        document.getElementById(
            "ft8-decode-count"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML =
        "";


    if (
        ft8Decodes.length === 0
    ) {

        const row =
            document.createElement(
                "tr"
            );


        const cell =
            document.createElement(
                "td"
            );


        cell.colSpan =
            7;


        cell.textContent =
            "Waiting for FT8 decodes...";


        cell.style.textAlign =
            "center";


        cell.style.padding =
            "30px";


        cell.style.color =
            "#aaa";


        row.appendChild(
            cell
        );


        tbody.appendChild(
            row
        );

    }
    else {

        ft8Decodes.forEach(
            function (decode) {

                const row =
                    document.createElement(
                        "tr"
                    );


                /*
                 * FORMAT UTC
                 */

                let utc =
                    decode.utc || "";


                /*
                 * FORMAT DT
                 */

                let dt =
                    "";


                if (
                    decode.dt !== undefined &&
                    decode.dt !== null &&
                    decode.dt !== ""
                ) {

                    const dtNumber =
                        Number(
                            decode.dt
                        );


                    if (
                        !Number.isNaN(
                            dtNumber
                        )
                    ) {

                        dt =
                            dtNumber.toFixed(
                                2
                            );

                    }

                }


                const values = [

                    utc,

                    decode.call || "",

                    decode.grid || "",

                    decode.snr ?? "",

                    dt,

                    decode.audio ?? "",

                    decode.message || ""

                ];


                values.forEach(
                    function (value, index) {

                        const cell =
                            document.createElement(
                                "td"
                            );


                        cell.textContent =
                            value;


                        cell.style.padding =
                            "10px";


                        cell.style.borderBottom =
                            "1px solid #3a3f48";


                        /*
                         * SNR COLOR
                         */

                        if (
                            index === 3
                        ) {

                            const snr =
                                Number(
                                    value
                                );


                            if (
                                snr >= -5
                            ) {

                                cell.style.color =
                                    "#7ee787";

                            }
                            else if (
                                snr >= -15
                            ) {

                                cell.style.color =
                                    "#f2cc60";

                            }
                            else {

                                cell.style.color =
                                    "#ff7b72";

                            }

                        }


                        /*
                         * DT ALIGNMENT
                         */

                        if (
                            index === 4
                        ) {

                            cell.style.fontFamily =
                                "monospace";

                        }


                        row.appendChild(
                            cell
                        );

                    }
                );


                tbody.appendChild(
                    row
                );

            }
        );

    }


    if (counter) {

        counter.textContent =
            `${ft8Decodes.length} decodes`;

    }


    /*
     * UPDATE LIVE STATUS
     */

    if (
        ft8Decodes.length > 0
    ) {

        setFt8Status(
            `● LIVE — ${ft8Decodes.length} decodes`
        );

    }
    else {

        setFt8Status(
            "Waiting for FT8 decodes..."
        );

    }

}


        
        
               


       
                      
                      
                   
              


    

/*
 * CREATE FT8 POPUP
 */

function openFt8Popup() {

    const existing =
        document.getElementById(
            "ft8-test-popup"
        );


    if (existing) {

        existing.remove();

    }


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "ft8-test-popup";


    Object.assign(
        overlay.style,
        {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "2147483647"
        }
    );


    const dialog =
        document.createElement(
            "div"
        );


    Object.assign(
        dialog.style,
        {
            width: "1200px",
            maxWidth: "94vw",
            height: "80vh",
            background: "#0B151E",
            border: "1px solid #555",
            borderRadius: "14px",
            padding: "28px",
            boxSizing: "border-box",
            color: "#f0f0f0",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)"
        }
    );


    /*
     * HEADER
     */

    const header =
        document.createElement(
            "div"
        );


    Object.assign(
        header.style,
        {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "20px"
        }
    );


    const titleArea =
        document.createElement(
            "div"
        );


    const title =
        document.createElement(
            "h1"
        );


    title.textContent =
        "FT8 LIVE DECODES";


    title.style.margin =
        "0";


    title.style.fontSize =
        "30px";


    const status =
        document.createElement(
            "div"
        );


    status.id =
        "ft8-status-text";


    status.textContent =
        "Waiting for decoder...";


    Object.assign(
        status.style,
        {
            marginTop: "8px",
            color: "#aaa"
        }
    );


    titleArea.appendChild(
        title
    );


    titleArea.appendChild(
        status
    );


    const closeButton =
        document.createElement(
            "button"
        );


    closeButton.textContent =
        "×";


    Object.assign(
        closeButton.style,
        {
            border: "none",
            background: "transparent",
            color: "#ddd",
            fontSize: "34px",
            cursor: "pointer",
            lineHeight: "1"
        }
    );


    closeButton.addEventListener(
        "click",
        function () {

            overlay.remove();

        }
    );


    header.appendChild(
        titleArea
    );


    header.appendChild(
        closeButton
    );


    dialog.appendChild(
        header
    );


    /*
     * TABLE AREA
     */

    const tableContainer =
        document.createElement(
            "div"
        );


    Object.assign(
        tableContainer.style,
        {
            flex: "1",
            overflowY: "auto",
            borderTop: "1px solid #444"
        }
    );


    const table =
        document.createElement(
            "table"
        );


    Object.assign(
        table.style,
        {
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "12px"
        }
    );


    const thead =
        document.createElement(
            "thead"
        );


    const headerRow =
        document.createElement(
            "tr"
        );


    [
        "UTC",
        "CALL",
        "GRID",
        "SNR",
        "DT",
        "AUDIO",
        "MESSAGE"
    ]
        .forEach(
            function (text) {

                const th =
                    document.createElement(
                        "th"
                    );


                th.textContent =
                    text;


                th.style.textAlign =
                    "left";


                th.style.padding =
                    "10px";


                th.style.borderBottom =
                    "1px solid #555";


                th.style.position =
                    "sticky";


                th.style.top =
                    "0";


                th.style.background =
                    "#0B151E";


                headerRow.appendChild(
                    th
                );

            }
        );


    thead.appendChild(
        headerRow
    );


    const tbody =
        document.createElement(
            "tbody"
        );


    tbody.id =
        "ft8-decodes-body";


    table.appendChild(
        thead
    );


    table.appendChild(
        tbody
    );


    tableContainer.appendChild(
        table
    );


    dialog.appendChild(
        tableContainer
    );


    /*
     * FOOTER
     */

    const footer =
        document.createElement(
            "div"
        );


    Object.assign(
        footer.style,
        {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "18px"
        }
    );


    const counter =
        document.createElement(
            "div"
        );


    counter.id =
        "ft8-decode-count";


    counter.textContent =
        "0 decodes";


    const clearButton =
        document.createElement(
            "button"
        );


    clearButton.textContent =
        "Clear";


    Object.assign(
        clearButton.style,
        {
            padding: "8px 18px",
            cursor: "pointer"
        }
    );


    clearButton.addEventListener(
        "click",
        function () {

            clearFt8Decodes();

        }
    );


    footer.appendChild(
        counter
    );


    footer.appendChild(
        clearButton
    );


    dialog.appendChild(
        footer
    );


    overlay.appendChild(
        dialog
    );


    document.body.appendChild(
        overlay
    );


    renderFt8Decodes();

}


/*
 * CLICK HANDLER
 */

document.addEventListener(
    "click",
    function (event) {

        const ft8Button =
            event.target.closest(
                "#ft8-btn"
            );


        if (ft8Button) {

            event.preventDefault();


            console.log(
                "FT8 BUTTON CLICKED"
            );


            openFt8Popup();


            return;

        }

    }
);



/*
 * LOAD FT8 DECODES
 */

async function loadFt8Decodes() {

    try {

        const response =
            await fetch(
                "/api/ft8/decodes"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(
                data.frames
            )
        ) {

            console.warn(
                "Invalid FT8 response:",
                data
            );

            return;

        }


        ft8Decodes =
            data.frames.map(
                function (frame) {

                    return {

                        utc:
                            frame.utc ||
                            "",

                        call:
                            frame.call ||
                            extractFt8Call(
                                frame.message
                            ),

                        grid:
                            frame.grid ||
                            extractFt8Grid(
                                frame.message
                            ),

                        snr:
                            frame.snr,

                        dt:
                            frame.dt,

                        audio:
                            frame.freq,

                        message:
                            frame.message

                    };

                }
            );


        renderFt8Decodes();


        setFt8Status(
            `${ft8Decodes.length} decodes`
        );


    } catch (error) {

        console.error(
            "FT8 load error:",
            error
        );


        setFt8Status(
            "FT8 connection error"
        );

    }

}


/*
 * EXTRACT CALLSIGN FROM FT8 MESSAGE
 */

function extractFt8Call(
    message
) {

    if (
        !message
    ) {

        return "";

    }


    const parts =
        message.trim().split(
            /\s+/
        );


    for (
        const part of parts
    ) {

        if (
            /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{1,4}$/i.test(
                part
            )
        ) {

            return part;

        }

    }


    return "";

}


/*
 * EXTRACT GRID FROM FT8 MESSAGE
 */

function extractFt8Grid(
    message
) {

    if (
        !message
    ) {

        return "";

    }


    const match =
        message.match(
            /\b[A-R]{2}[0-9]{2}\b/i
        );


    return (
        match
            ? match[0].toUpperCase()
            : ""
    );

}


/*
 * FT8 POLLING
 */

window.addEventListener(
    "load",
    function () {

        loadFt8Decodes();


        setInterval(
            loadFt8Decodes,
            2000
        );

    }
);

console.log(
    "FT8 MODULE READY"
);
