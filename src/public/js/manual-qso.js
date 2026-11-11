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
        Call check while typing: GET /api/callcheck
          - prefix -> country, zones and flag at once
          - suggestions: spotted on the air (near the transceiver
            frequency first), own log, watch list, SCP database
          - "?" = unknown character, a misheard character is found too
        Arrow keys + Enter or click take a suggestion.
    */
    (() => {

        const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

        const box = document.createElement("div");
        box.className = "callcheck-box";
        box.hidden = true;
        document.body.appendChild(box);

        let items = [];
        let highlighted = -1;
        let timer = null;
        let requestId = 0;
        let lastQuery = null;

        const field = id => document.getElementById(id);

        function frequencyKhz() {
            const value = Number(String(field("manual-qso-frequency")?.value || "").replace(",", "."));
            if (!Number.isFinite(value) || value <= 0) return "";
            return value < 1000 ? value * 1000 : value;
        }

        function position() {

            const rect = callInput.getBoundingClientRect();
            const width = Math.min(420, window.innerWidth - 16);
            const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

            box.style.width = `${width}px`;
            box.style.left = `${left}px`;

            const below = window.innerHeight - rect.bottom - 8;
            const above = rect.top - 8;

            if (below >= 240 || below >= above) {
                box.style.top = `${rect.bottom + 4}px`;
                box.style.bottom = "";
                box.style.maxHeight = `${Math.max(160, below - 4)}px`;
            }
            else {
                box.style.top = "";
                box.style.bottom = `${window.innerHeight - rect.top + 4}px`;
                box.style.maxHeight = `${Math.max(160, above - 4)}px`;
            }

        }

        function close() {
            box.hidden = true;
            items = [];
            highlighted = -1;
        }

        function ageText(seconds) {
            if (seconds < 60) return `${seconds}s`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
            return `${Math.floor(seconds / 3600)}h`;
        }

        function markCall(call, query, kind) {
            if (!query || kind !== "partial" && kind !== "exact") return escapeHtml(call);
            const pattern = new RegExp(query.replace(/[^A-Z0-9/?]/g, "").replace(/\//g, "\\/").replace(/\?/g, "."));
            const match = pattern.exec(call);
            if (!match) return escapeHtml(call);
            return escapeHtml(call.slice(0, match.index)) +
                `<b>${escapeHtml(match[0])}</b>` +
                escapeHtml(call.slice(match.index + match[0].length));
        }

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

        function render(result) {

            items = result.matches || [];
            highlighted = -1;

            const query = result.query || "";
            const entity = result.entity;

            if (!items.length && !entity) {
                close();
                return;
            }

            let head = "";

            if (query) {
                head = entity
                    ? `<div class="callcheck-entity">
                           ${entity.flag ? `<img src="/assets/flags/${escapeHtml(entity.flag)}.svg" alt="">` : ""}
                           <span class="callcheck-entity-name">${escapeHtml(entity.name)}</span>
                           <span class="callcheck-entity-zones">${escapeHtml(entity.continent)} · CQ ${entity.cqZone} · ITU ${entity.ituZone}</span>
                       </div>`
                    : `<div class="callcheck-entity callcheck-entity-unknown">Unknown prefix</div>`;
            }
            else if (result.radio) {
                head = `<div class="callcheck-entity">On the air near ${(result.radio.frequency / 1000).toFixed(3)} MHz</div>`;
            }

            const rows = items.map((match, index) => {

                const badges = [];

                if (match.onAir) {
                    const near = match.onAir.offsetKhz !== null && Math.abs(match.onAir.offsetKhz) <= 3;
                    badges.push(`<span class="callcheck-badge ${near ? "here" : "air"}" title="Spotted ${escapeHtml(match.onAir.sources.join(", "))}">${near ? "◉ HERE " : ""}${(match.onAir.frequency / 1000).toFixed(3)} ${escapeHtml(match.onAir.mode)} · ${ageText(match.onAir.ageSeconds)}</span>`);
                }
                if (match.log) {
                    badges.push(`<span class="callcheck-badge log" title="In the log, last QSO ${escapeHtml(match.log.last)}">LOG ${match.log.count}×</span>`);
                }
                if (match.watch) {
                    badges.push(`<span class="callcheck-badge watch">WATCH</span>`);
                }
                if (match.kind === "n1") {
                    badges.push(`<span class="callcheck-badge n1" title="One character different - misheard?">≈</span>`);
                }
                if (match.scp && !match.onAir && !match.log) {
                    badges.push(`<span class="callcheck-badge scp" title="Super Check Partial: active callsign">SCP</span>`);
                }

                return `<div class="callcheck-item" data-index="${index}">
                    <span class="callcheck-flag">${match.flag ? `<img src="/assets/flags/${escapeHtml(match.flag)}.svg" alt="">` : ""}</span>
                    <span class="callcheck-call">${markCall(match.call, query, match.kind)}</span>
                    <span class="callcheck-badges">${badges.join("")}</span>
                    <span class="callcheck-country">${escapeHtml(match.entity)}</span>
                </div>`;

            }).join("");

            const foot = result.scp?.calls
                ? `<div class="callcheck-foot">↑↓ Enter · "?" = unknown character · SCP ${result.scp.calls.toLocaleString("en")} calls</div>`
                : `<div class="callcheck-foot">↑↓ Enter · "?" = unknown character · SCP database not loaded yet</div>`;

            box.innerHTML = head + (rows || `<div class="callcheck-none">No suggestions</div>`) + foot;
            box.hidden = false;
            position();

        }

        function setHighlight(index) {
            const nodes = box.querySelectorAll(".callcheck-item");
            if (!nodes.length) return;
            highlighted = (index + nodes.length) % nodes.length;
            nodes.forEach((node, i) => node.classList.toggle("active", i === highlighted));
            nodes[highlighted]?.scrollIntoView({ block: "nearest" });
        }

        function pick(index) {

            const match = items[index];
            if (!match) return false;

            callInput.value = match.call;

            if (match.onAir) {
                const band = field("manual-qso-band");
                if (band && [...band.options].some(o => o.value === match.onAir.band)) band.value = match.onAir.band;
                const mode = field("manual-qso-mode");
                const modeValue = String(match.onAir.mode || "").toUpperCase();
                if (mode && [...mode.options].some(o => o.value === modeValue)) mode.value = modeValue;
                const frequency = field("manual-qso-frequency");
                if (frequency) frequency.value = String(match.onAir.frequency);
            }

            close();
            lastQuery = match.call;
            lookupCall();
            return true;

        }

        async function query(text) {

            const id = ++requestId;
            const params = new URLSearchParams({ q: text });
            const khz = frequencyKhz();
            if (khz) params.set("khz", String(khz));

            try {
                const response = await fetch(`/api/callcheck?${params}`, { cache: "no-store" });
                if (!response.ok || id !== requestId) return;
                const result = await response.json();
                if (id !== requestId || document.activeElement !== callInput) return;
                if (text) fillFromPrefix(result.entity);
                render(result);
            }
            catch {
                // server not reachable - no suggestions
            }

        }

        function schedule() {

            const text = callInput.value.trim().toUpperCase();
            if (text === lastQuery && !box.hidden) return;
            lastQuery = text;

            if (!text) fillFromPrefix(null);

            clearTimeout(timer);
            timer = setTimeout(() => query(text), text ? 120 : 0);

        }

        callInput.addEventListener("input", () => {
            // the name from QRZ belongs to the previous call
            const name = field("manual-qso-name");
            if (name && name.dataset.fromPrefix === "1") {
                name.value = "";
                name.dataset.fromPrefix = "";
            }
            schedule();
        });

        callInput.addEventListener("focus", () => {
            lastQuery = null;
            schedule();
        });

        callInput.addEventListener("blur", () => setTimeout(close, 150));

        callInput.addEventListener("keydown", event => {
            if (box.hidden) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setHighlight(highlighted + 1); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight(highlighted - 1); }
            else if (event.key === "Escape") { event.preventDefault(); close(); }
        });

        // mousedown: before the input loses the focus
        box.addEventListener("mousedown", event => {
            const item = event.target.closest(".callcheck-item");
            event.preventDefault();
            if (item) pick(Number(item.dataset.index));
        });

        window.addEventListener("resize", () => { if (!box.hidden) position(); });
        window.addEventListener("scroll", () => { if (!box.hidden) position(); }, true);

        window.shackCallCheck = {
            close,
            pickHighlighted: () => !box.hidden && highlighted >= 0 && pick(highlighted)
        };

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
