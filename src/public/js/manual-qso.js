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

            // QRZ values may be replaced when another call is typed
            for (const id of ["manual-qso-name", "manual-qso-country", "manual-qso-itu", "manual-qso-cq", "manual-qso-flag"]) {
                const element = document.getElementById(id);
                if (element) element.dataset.fromPrefix = "1";
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

            // a suggestion is highlighted: take it
            if (window.shackCallCheck?.pickHighlighted()) {
                return;
            }

            window.shackCallCheck?.close();

            lookupCall();

        }
    );

    /*
        Band, mode and frequency follow the transceiver (CAT) while the
        fields are not changed by hand. An own entry or a picked
        suggestion holds the field until the callsign is cleared.
    */
    const radioFollow = (() => {

        const ids = ["manual-qso-band", "manual-qso-mode", "manual-qso-frequency"];
        const unit = document.querySelector(".manual-qso-frequency-unit");

        const FT8 = [1840, 3573, 7074, 10136, 14074, 18100, 21074, 24915, 28074, 50313];
        const FT4 = [3575.5, 7047.5, 10140, 14080, 18104, 21140, 24919, 28180, 50318];

        const near = (list, khz) => list.some(value => Math.abs(value - khz) <= 3);

        function bandFromKhz(khz) {
            if (typeof qsoBandFromKHz === "function") return qsoBandFromKHz(khz);
            return "";
        }

        function logMode(radioMode, khz) {
            const mode = String(radioMode || "").toUpperCase();
            if (mode.startsWith("CW")) return "CW";
            if (mode === "USB" || mode === "LSB" || mode === "AM" || mode === "FM") return mode;
            if (mode.startsWith("RTTY")) return "RTTY";
            if (/DATA|PKT|-D$|DIG/.test(mode)) {
                if (near(FT8, khz)) return "FT8";
                if (near(FT4, khz)) return "FT4";
            }
            return "";
        }

        function setOption(input, value) {
            if (!input || !value) return;
            if (![...input.options].some(option => option.value === value)) return;
            input.value = value;
        }

        function hold(id) {
            const input = document.getElementById(id);
            if (input) input.dataset.manual = "1";
        }

        function release() {
            for (const id of ids) {
                const input = document.getElementById(id);
                if (input) input.dataset.manual = "";
            }
        }

        /* band and frequency belong together: changing one holds both */
        const holdGroup = id => id === "manual-qso-mode" ? [id] : ["manual-qso-band", "manual-qso-frequency"];

        for (const id of ids) {
            const input = document.getElementById(id);
            const onEdit = event => {
                if (!event.isTrusted) return;
                holdGroup(id).forEach(hold);
                // a typed frequency sets its band
                if (id === "manual-qso-frequency") {
                    const value = Number(String(input.value).replace(",", "."));
                    const khz = value > 0 && value < 1000 ? value * 1000 : value;
                    setOption(document.getElementById("manual-qso-band"), bandFromKhz(khz));
                }
            };
            input?.addEventListener("input", onEdit);
            input?.addEventListener("change", onEdit);
        }

        // a new QSO: clearing the callsign follows the radio again
        callInput.addEventListener("input", () => {
            if (!callInput.value.trim()) release();
        });

        async function poll() {

            if (document.hidden) return;

            let following = false;

            try {
                const response = await fetch("/api/radio", { cache: "no-store" });
                if (response.ok) {
                    const data = await response.json();
                    const hz = Number(data.frequency);
                    if (data.connected && hz > 0) {
                        following = true;
                        const khz = hz / 1000;
                        const band = document.getElementById("manual-qso-band");
                        const mode = document.getElementById("manual-qso-mode");
                        const frequency = document.getElementById("manual-qso-frequency");
                        if (band && band.dataset.manual !== "1") setOption(band, bandFromKhz(khz));
                        if (mode && mode.dataset.manual !== "1") setOption(mode, logMode(data.mode, khz));
                        if (frequency && frequency.dataset.manual !== "1" && document.activeElement !== frequency) {
                            frequency.value = khz.toFixed(khz % 1 ? 3 : 1).replace(/0+$/, "").replace(/\.$/, ".0");
                        }
                    }
                }
            }
            catch {
                // no server / no radio - leave the fields alone
            }

            if (unit) {
                const held = document.getElementById("manual-qso-frequency")?.dataset.manual === "1";
                unit.classList.toggle("following", following && !held);
                unit.title = following && !held ? "Follows the transceiver (CAT)" : "";
            }

        }

        poll();
        setInterval(poll, 2000);

        return { hold, release };

    })();

    /*
        Call check while typing (js/callcheck.js): country / zones from
        the prefix at once, suggestions from spots, log, watch list, SCP.
    */
    (() => {

        const field = id => document.getElementById(id);

        /* country, zones and flag from the prefix while typing - only into
           fields that are empty or were filled this way before */
        function fillFromPrefix(entity) {

            const set = (id, value) => {
                const input = field(id);
                if (!input) return;
                if (input.value && input.dataset.fromPrefix !== "1") return;
                input.value = value ?? "";
                input.dataset.fromPrefix = value ? "1" : "";
            };

            set("manual-qso-country", entity?.name || "");
            set("manual-qso-cq", entity?.cqZone || "");
            set("manual-qso-itu", entity?.ituZone || "");

            const flag = field("manual-qso-flag");
            if (flag && (!flag.getAttribute("src") || flag.dataset.fromPrefix === "1")) {
                if (entity?.flag) {
                    flag.src = `/assets/flags/${entity.flag}.svg`;
                    flag.alt = flag.title = entity.name;
                    flag.dataset.fromPrefix = "1";
                }
                else {
                    flag.removeAttribute("src");
                    flag.alt = flag.title = "";
                    flag.dataset.fromPrefix = "";
                }
            }

        }

        /* own edits of these fields win */
        for (const id of ["manual-qso-name", "manual-qso-country", "manual-qso-cq", "manual-qso-itu"]) {
            field(id)?.addEventListener("input", event => { event.target.dataset.fromPrefix = ""; });
        }

        // the name from QRZ belongs to the previous call
        callInput.addEventListener("input", () => {
            const name = field("manual-qso-name");
            if (name && name.dataset.fromPrefix === "1") {
                name.value = "";
                name.dataset.fromPrefix = "";
            }
        });

        if (typeof window.attachCallCheck !== "function") return;

        window.shackCallCheck = window.attachCallCheck(callInput, {

            frequencyKhz() {
                const value = Number(String(field("manual-qso-frequency")?.value || "").replace(",", "."));
                if (!Number.isFinite(value) || value <= 0) return "";
                return value < 1000 ? value * 1000 : value;
            },

            onEntity: fillFromPrefix,

            onPick(match) {
                if (match.onAir) {
                    ["manual-qso-band", "manual-qso-mode", "manual-qso-frequency"].forEach(radioFollow.hold);
                    const band = field("manual-qso-band");
                    if (band && [...band.options].some(o => o.value === match.onAir.band)) band.value = match.onAir.band;
                    const mode = field("manual-qso-mode");
                    const modeValue = String(match.onAir.mode || "").toUpperCase();
                    if (mode && [...mode.options].some(o => o.value === modeValue)) mode.value = modeValue;
                    const frequency = field("manual-qso-frequency");
                    if (frequency) frequency.value = String(match.onAir.frequency);
                }
                lookupCall();
            }

        });

    })();

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
