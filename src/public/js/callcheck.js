/*
 * Call check while typing a callsign - GET /api/callcheck
 *
 *   - prefix -> country, zones and flag at once
 *   - suggestions: spotted on the air (near the transceiver frequency
 *     first), own log, watch list, SCP database
 *   - "?" = unknown character, a misheard character is found too
 *   Arrow keys + Enter or click take a suggestion.
 *
 * Used by Manual QSO (dashboard) and the contest console:
 *
 *   const check = attachCallCheck(input, {
 *       frequencyKhz: () => 14025.0 | "",      // when no transceiver is active
 *       onEntity: entity => {},                // prefix result while typing
 *       onPick: match => {},                   // a suggestion was taken
 *       badges: match => [{ cls, text, title }]// extra badges (e.g. DUPE)
 *   });
 *   check.pickHighlighted()  -> true when a highlighted suggestion was taken
 *   check.isOpen(), check.close()
 */
(function () {

    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

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

    function attachCallCheck(callInput, options = {}) {

        const box = document.createElement("div");
        box.className = "callcheck-box";
        box.hidden = true;
        document.body.appendChild(box);

        let items = [];
        let highlighted = -1;
        let timer = null;
        let requestId = 0;
        let lastQuery = null;

        function position() {

            const rect = callInput.getBoundingClientRect();
            const width = Math.min(440, window.innerWidth - 16);
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

                for (const extra of options.badges?.(match) || []) {
                    badges.push(`<span class="callcheck-badge ${escapeHtml(extra.cls || "")}" title="${escapeHtml(extra.title || "")}">${escapeHtml(extra.text)}</span>`);
                }
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
            close();
            lastQuery = match.call;
            options.onPick?.(match);
            return true;

        }

        async function query(text) {

            const id = ++requestId;
            const params = new URLSearchParams({ q: text });
            const khz = options.frequencyKhz?.() || "";
            if (khz) params.set("khz", String(khz));

            try {
                const response = await fetch(`/api/callcheck?${params}`, { cache: "no-store" });
                if (!response.ok || id !== requestId) return;
                const result = await response.json();
                if (id !== requestId || document.activeElement !== callInput) return;
                if (text) options.onEntity?.(result.entity);
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

            if (!text) options.onEntity?.(null);

            clearTimeout(timer);
            timer = setTimeout(() => query(text), text ? 120 : 0);

        }

        callInput.addEventListener("input", schedule);

        callInput.addEventListener("focus", () => {
            lastQuery = null;
            schedule();
        });

        callInput.addEventListener("blur", () => setTimeout(close, 150));

        callInput.addEventListener("keydown", event => {
            if (box.hidden) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setHighlight(highlighted + 1); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setHighlight(highlighted - 1); }
            else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
        });

        // mousedown: before the input loses the focus
        box.addEventListener("mousedown", event => {
            const item = event.target.closest(".callcheck-item");
            event.preventDefault();
            if (item) pick(Number(item.dataset.index));
        });

        window.addEventListener("resize", () => { if (!box.hidden) position(); });
        window.addEventListener("scroll", () => { if (!box.hidden) position(); }, true);

        return {
            close,
            isOpen: () => !box.hidden,
            hasHighlight: () => !box.hidden && highlighted >= 0,
            pickHighlighted: () => !box.hidden && highlighted >= 0 && pick(highlighted),
            refresh: () => { lastQuery = null; schedule(); }
        };

    }

    window.attachCallCheck = attachCallCheck;

})();
