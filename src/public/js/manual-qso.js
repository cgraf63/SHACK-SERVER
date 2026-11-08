(() => {

    const callInput =
        document.getElementById(
            "manual-qso-call"
        );

const viewButton =
    document.getElementById(
        "manual-qso-view"
    );
	const qsoButton =
    	    document.getElementById(
            "manual-qso-open"
    );

    if (
        !callInput ||
        !viewButton ||
 	!qsoButton
    ) {
        return;
    }

    callInput.addEventListener(
        "input",
        () => {

            callInput.value =
                callInput.value.toUpperCase();

        }
    );

    async function lookupCall() {

        const call =
            callInput.value
                .trim()
                .toUpperCase();

        if (!call) {
            return;
        }


        try {

            const response =
                await fetch(
                    `/api/qso/qrz/${encodeURIComponent(call)}`
                );


            if (!response.ok) {

                console.warn(
                    "QRZ lookup returned:",
                    response.status
                );

                return;
            }


            const result =
                await response.json();


            const qrz =
                result?.qrz;


            if (!qrz) {
                return;
            }


            console.log(
                "MANUAL QSO QRZ:",
                qrz
            );


            const nameInput =
                document.getElementById(
                    "manual-qso-name"
                );

            if (nameInput) {
                nameInput.value =
                    qrz.name || "";
            }


            const countryInput =
                document.getElementById(
                    "manual-qso-country"
                );

            if (countryInput) {
                countryInput.value =
                    qrz.country || "";
            }


            const ituInput =
                document.getElementById(
                    "manual-qso-itu"
                );

            if (ituInput) {
                ituInput.value =
                    qrz.ituZone ?? "";
            }


            const cqInput =
                document.getElementById(
                    "manual-qso-cq"
                );

            if (cqInput) {
                cqInput.value =
                    qrz.cqZone ?? "";
            }


            const flag =
                document.getElementById(
                    "manual-qso-flag"
                );

            if (flag) {

                flag.src = "";
                flag.alt = "";
                flag.title = "";

                if (qrz.countryCode) {

                    flag.src =
                        `/assets/flags/${qrz.countryCode}.svg`;

                    flag.alt =
                        qrz.country || "";

                    flag.title =
                        qrz.country || "";

                }

            }

	return qrz;
        }

        catch (error) {

            console.error(
                "Manual QSO QRZ lookup failed:",
                error
            );

        }

    }

    callInput.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();

            lookupCall();

        }
    );
    /*View callsign */

    viewButton.addEventListener(
        "click",
        async () => {

            const qrz =
                await lookupCall();

            if (!qrz) {
                return;
            }

            if (
                typeof window.showSpotDetails !==
                "function"
            ) {

                console.error(
                    "showSpotDetails() is not available."
                );

                return;
            }

            const spot = {

                call:
                    qrz.call ||
                    callInput.value
                        .trim()
                        .toUpperCase(),

                name:
                    qrz.name || "",

                country:
                    qrz.country || "",

                countryCode:
                    qrz.countryCode || "",

                image:
                    qrz.image || "",

                locator:
                    qrz.locator || "",

                ituZone:
                    qrz.ituZone,

                cqZone:
                    qrz.cqZone,

                dxcc:
                    qrz.dxcc,

                latitude:
                    qrz.latitude,

                longitude:
                    qrz.longitude

            };

            window.showSpotDetails(
                spot
            );

        }
    );

    /*
        Manual QSO Watch
    */

    const watchCheckbox =
        document.getElementById(
            "manual-qso-watch"
        );

    const watchAlert =
        document.getElementById(
            "manual-qso-watch-alert"
        );

    const watchAddButton =
        document.getElementById(
            "manual-qso-add-watch"
        );

    const watchListElement =
        document.getElementById(
            "manual-qso-watch-list-items"
        );

    /*
        The watch list lives on the server (/api/watchlist): the same
        list on all devices, and the server sends push notifications
        when a callsign is spotted (Settings -> Watch list notifications).
        Entries of the old browser list (localStorage) are moved to the
        server once.
    */
    let watchList = [];
    let watchPush = new Map();

    let watchDetectedCalls = new Set();
    let watchDetectedTimers = new Map();

    let watchBaselinePending = true;
    let watchSeenSpots = new Set();
    let watchTimer = null;


    function getWatchSpotKey(spot) {

        return [
            spot.callsign || spot.call || "",
            spot.frequency || "",
            spot.mode || "",
            spot.time || ""
        ]
            .join("|")
            .toUpperCase();

    }


    function clearWatchAlert() {

        if (watchTimer !== null) {

            clearTimeout(watchTimer);
            watchTimer = null;

        }


        callInput.classList.remove(
            "manual-qso-call-detected"
        );

        callInput.classList.remove(
            "manual-qso-call-detected-blink"
        );


        if (watchAlert) {

            watchAlert.classList.remove(
                "active"
            );

            watchAlert.innerHTML = "";

        }

    }


    function showWatchDetection(spot) {

        const callsign =
            (
                spot.callsign ||
                spot.call ||
                ""
            )
                .toUpperCase();


        const frequency =
            Number(spot.frequency);


        const frequencyMHz =
            Number.isFinite(frequency)
                ? (frequency / 1000).toFixed(3)
                : "";


        const mode =
            spot.mode || "";


        callInput.classList.add(
            "manual-qso-call-detected"
        );

        callInput.classList.add(
            "manual-qso-call-detected-blink"
        );


        if (watchAlert) {

            watchAlert.innerHTML = `
                <div class="manual-qso-watch-detected">
                    ${callsign} DETECTED!
                </div>
                <div class="manual-qso-watch-info">
                    ${frequencyMHz} MHz&nbsp;&nbsp; ${mode}
                </div>
            `;

            watchAlert.classList.add(
                "active"
            );

        }


        if (watchTimer !== null) {

            clearTimeout(watchTimer);

        }


        watchTimer =
            setTimeout(
                () => {

                    clearWatchAlert();

                },
                30000
            );

    }


    function applyServerWatchList(entries) {

        const list =
            (Array.isArray(entries) ? entries : [])
                .map(entry => ({
                    callsign: String(entry.callsign || "").toUpperCase(),
                    push: entry.push !== 0 && entry.push !== false
                }))
                .filter(entry => entry.callsign);

        const changed =
            JSON.stringify(list) !==
            JSON.stringify(watchList.map(call => ({ callsign: call, push: watchPush.get(call) !== false })));

        watchList = list.map(entry => entry.callsign);
        watchPush = new Map(list.map(entry => [entry.callsign, entry.push]));

        if (changed) {
            renderWatchList();
            window.dispatchEvent(new CustomEvent("watchlistChanged"));
        }

    }

    async function loadWatchList() {

        try {
            const response = await fetch("/api/watchlist", { cache: "no-store" });
            if (response.ok) {
                applyServerWatchList(await response.json());
            }
        }
        catch {
            // server not reachable: keep the current list
        }

    }

    /* Old browser list -> server, once */
    async function migrateLocalWatchList() {

        let local = [];

        try {
            local = JSON.parse(localStorage.getItem("shack-server-watch-list") || "[]");
        }
        catch {
            local = [];
        }

        if (!Array.isArray(local) || !local.length) {
            return;
        }

        let allOk = true;

        for (const callsign of local) {
            try {
                const response = await fetch("/api/watchlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ callsign })
                });
                if (!response.ok && response.status !== 400) allOk = false;
            }
            catch {
                allOk = false;
            }
        }

        if (allOk) {
            try { localStorage.removeItem("shack-server-watch-list"); } catch { /* ignore */ }
        }

    }

    async function addToWatchList(callsign) {

        const response = await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callsign })
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        await loadWatchList();

    }

    async function removeFromWatchList(callsign) {

        await fetch(`/api/watchlist/${encodeURIComponent(callsign)}`, { method: "DELETE" });

        await loadWatchList();

    }

    async function setWatchPush(callsign, push) {

        await fetch(`/api/watchlist/${encodeURIComponent(callsign)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ push })
        });

        await loadWatchList();

    }

    /* used by the settings (push on / off per callsign) */
    window.shackWatchList = {
        reload: loadWatchList,
        setPush: setWatchPush
    };


    function renderWatchList() {

        if (!watchListElement) {
            return;
        }

        watchListElement.innerHTML = "";

        for (const callsign of watchList) {

            const row =
                document.createElement("div");

            row.className =
                "manual-qso-watch-item";

            const detected =
                watchDetectedCalls.has(callsign);

            const push =
                watchPush.get(callsign) !== false;

            row.innerHTML = `
                <span class="manual-qso-watch-item-call">
                    ${callsign}
                </span>

                <span class="manual-qso-watch-item-status">
                    ${
                        detected
                            ? '<span class="manual-qso-watch-detected-button">DETECTED!</span>'
                            : ""
                    }
                </span>

                <button
                    type="button"
                    class="manual-qso-watch-push ${push ? "on" : "off"}"
                    data-callsign="${callsign}"
                    title="${push ? "Push notification to the phone: on (click to switch off)" : "Push notification to the phone: off (click to switch on)"}"
                >${push ? "🔔" : "🔕"}</button>

                <button
                    type="button"
                    class="manual-qso-watch-remove"
                    data-callsign="${callsign}"
                    title="Remove from watch list"
                >×</button>
            `;

            watchListElement.appendChild(row);

        }

    }


    function markWatchDetected(callsign) {

        watchDetectedCalls.add(
            callsign
        );

        if (
            watchDetectedTimers.has(callsign)
        ) {
            clearTimeout(
                watchDetectedTimers.get(callsign)
            );
        }

        watchDetectedTimers.set(
            callsign,
            setTimeout(
                () => {

                    watchDetectedCalls.delete(
                        callsign
                    );

                    watchDetectedTimers.delete(
                        callsign
                    );

                    renderWatchList();

                },
                30000
            )
        );

        renderWatchList();

    }


    if (watchAddButton) {

        watchAddButton.addEventListener(
            "click",
            () => {

                const callsign =
                    callInput.value
                        .trim()
                        .toUpperCase();

                if (
                    !callsign ||
                    watchList.includes(callsign)
                ) {
                    return;
                }

                watchList.push(callsign);
                watchPush.set(callsign, true);
                renderWatchList();

                addToWatchList(callsign).catch(error => {
                    alert(`Watch list: ${error.message}`);
                    void loadWatchList();
                });

                watchCheckbox.checked = true;

                clearWatchAlert();

                watchSeenSpots =
                    new Set();

                watchBaselinePending = true;

            }
        );

    }


    if (watchListElement) {

        watchListElement.addEventListener(
            "click",
            (event) => {

                const pushButton =
                    event.target.closest(
                        ".manual-qso-watch-push"
                    );

                if (pushButton) {
                    const call = pushButton.dataset.callsign;
                    void setWatchPush(call, watchPush.get(call) === false);
                    return;
                }

                const button =
                    event.target.closest(
                        ".manual-qso-watch-remove"
                    );

                if (!button) {
                    return;
                }

                const callsign =
                    button.dataset.callsign;

                watchList =
                    watchList.filter(
                        call => call !== callsign
                    );

                renderWatchList();

                void removeFromWatchList(callsign);

                clearWatchAlert();

            }
        );

    }


    renderWatchList();

    (async () => {
        await migrateLocalWatchList();
        await loadWatchList();
    })();

    /* other devices / the settings may change the list */
    setInterval(loadWatchList, 60000);


    window.checkManualQsoWatch =
        function(spots) {

            if (
                !watchCheckbox ||
                !watchCheckbox.checked
            ) {
                return;
            }


            if (!watchList.length) {
                return;
            }


            if (!Array.isArray(spots)) {
                return;
            }


            /*
                First update after WATCH is enabled:
                establish a baseline.

                Existing spots must NOT trigger
                a detection.
            */

            if (watchBaselinePending) {

                watchSeenSpots =
                    new Set(
                        spots.map(
                            getWatchSpotKey
                        )
                    );

                watchBaselinePending =
                    false;

                return;

            }


            for (const spot of spots) {

                const spotCall =
                    (
                        spot.callsign ||
                        spot.call ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                if (
                    !watchList.includes(spotCall)
                ) {
                    continue;
                }


                const key =
                    getWatchSpotKey(spot);


                if (
                    watchSeenSpots.has(key)
                ) {
                    continue;
                }


                watchSeenSpots.add(key);

                showWatchDetection(
                    spot
                );

                if (
                    watchList.includes(
                        spotCall
                    )
                ) {
                    markWatchDetected(
                        spotCall
                    );
                }

                break;

            }

        };


    if (watchCheckbox) {

        watchCheckbox.addEventListener(
            "change",
            () => {

                clearWatchAlert();

                watchSeenSpots =
                    new Set();

                watchBaselinePending =
                    watchCheckbox.checked;

            }
        );

    }

qsoButton.addEventListener(
    "click",
    () => {

        const call =
            document.getElementById(
                "manual-qso-call"
            )?.value
                .trim()
                .toUpperCase() || "";

        if (!call) {
            return;
        }


        const name =
            document.getElementById(
                "manual-qso-name"
            )?.value
                .trim() || "";


        const country =
            document.getElementById(
                "manual-qso-country"
            )?.value
                .trim() || "";


        const band =
            document.getElementById(
                "manual-qso-band"
            )?.value || "";


        const mode =
            document.getElementById(
                "manual-qso-mode"
            )?.value || "";


        const ituZone =
            Number(
                document.getElementById(
                    "manual-qso-itu"
                )?.value
            ) || undefined;


        const cqZone =
            Number(
                document.getElementById(
                    "manual-qso-cq"
                )?.value
            ) || undefined;


        const frequencyMHz =
            Number(
                document.getElementById(
                    "manual-qso-frequency"
                )?.value
            );


        const spot = {

            call,

            name,

            country,

            band,

            mode,

            ituZone,

            cqZone,

            frequency:
                frequencyMHz

        };


        if (
            typeof window.openQsoDialog !==
            "function"
        ) {

            console.error(
                "openQsoDialog() is not available."
            );

            return;
        }


        window.openQsoDialog(
            spot,
            {}
        );

    }
);

})();
