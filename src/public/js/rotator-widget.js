/*
    SHACK-SERVER - rotator in the dashboard

    Shown in the "Station" area when a rotator is configured
    (Settings → Rotator): compass with the antenna direction, target,
    STOP button. Other scripts turn the antenna with
    window.shackRotator.turn(azimuth).
*/

(function () {

    if (window.shackRotator) {
        return;
    }

    const state = {
        enabled: false,
        connected: false,
        azimuth: null,
        target: null,
        error: ""
    };

    let widget = null;

    function addStyles() {

        if (document.getElementById("rotator-widget-styles")) return;

        const style = document.createElement("style");

        style.id = "rotator-widget-styles";
        style.textContent = `
            .station-title.has-rotator { display: flex; align-items: center; gap: 12px; }
            .rotator-widget {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                height: 20px;
                padding: 0 2px 0 6px;
                border: 1px solid var(--panel-border, #1d3442);
                border-radius: 10px;
                font-size: 12px;
                font-weight: 600;
                color: #8fa3b2;
                white-space: nowrap;
            }
            .rotator-widget.disconnected { opacity: 0.7; }
            .rotator-widget svg { flex: 0 0 auto; }
            .rotator-widget .rot-az { font-weight: 800; color: var(--cyan, #00e5ff); }
            .rotator-widget .rot-target { color: #ffc400; }
            .rotator-widget .rot-err { color: #ff6b6b; max-width: 260px; overflow: hidden; text-overflow: ellipsis; }
            .rotator-widget button {
                height: 16px;
                padding: 0 7px;
                border: 1px solid #7d2632;
                border-radius: 8px;
                background: #401b22;
                color: #ff8b96;
                font-weight: 700;
                font-size: 10px;
                line-height: 14px;
                cursor: pointer;
            }
            .rotator-widget button:hover { background: #5a202a; color: #fff; }
            .rot-popup-btn {
                margin-left: 6px;
                padding: 4px 9px;
                border: 1px solid #1d5f73;
                border-radius: 6px;
                background: #0f2a35;
                color: #7fe9ff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
            }
            .rot-popup-btn:hover { background: #164050; color: #fff; }
            .rot-turn-link { cursor: pointer; text-decoration: underline dotted; }
            .rot-turn-link:hover { color: var(--cyan, #00e5ff); }
        `;

        document.head.appendChild(style);

    }

    function compass(azimuth, target) {

        const needle = (angle, color, length) => {
            if (angle === null || angle === undefined) return "";
            const rad = (angle - 90) * Math.PI / 180;
            const x = 22 + Math.cos(rad) * length;
            const y = 22 + Math.sin(rad) * length;
            return `<line x1="22" y1="22" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
        };

        return `
            <svg width="18" height="18" viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="22" cy="22" r="19" fill="none" stroke="#3a5566" stroke-width="4"/>
                
                ${needle(target, "rgba(255,196,0,0.8)", 15)}
                ${needle(azimuth, "#00e5ff", 17)}
                <circle cx="22" cy="22" r="2.5" fill="#00e5ff"/>
            </svg>`;

    }

    function render() {

        /* next to the "Station" heading: the dashboard bar has a fixed height */
        const title = document.querySelector(".station-inline .station-title");

        if (!state.enabled || !title) {
            title?.classList.remove("has-rotator");
            widget?.remove();
            widget = null;
            return;
        }

        if (!widget) {
            widget = document.createElement("span");
            widget.className = "rotator-widget";
        }

        if (widget.parentElement !== title) {
            title.classList.add("has-rotator");
            title.appendChild(widget);
        }

        widget.classList.toggle("disconnected", !state.connected);
        widget.title = state.connected
            ? "Antenna rotator" + (state.target !== null ? ` - turning to ${state.target}°` : "")
            : (state.error || "Rotator not connected");

        const az = state.azimuth === null ? "--" : `${state.azimuth}°`;

        const extra = !state.connected
            ? `<span class="rot-err">${escapeText(state.error || "not connected")}</span>`
            : state.target !== null
                ? `<span class="rot-target">→ ${state.target}°</span>`
                : "";

        widget.innerHTML =
            compass(state.azimuth, state.target) +
            `<span class="rot-az">${az}</span>${extra}` +
            `<button type="button" title="Stop the rotator">STOP</button>`;

        widget.querySelector("button").addEventListener("click", stop);

    }

    function escapeText(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    }

    function apply(status) {

        state.enabled = Boolean(status?.enabled);
        state.connected = Boolean(status?.connected);
        state.azimuth = status?.azimuth ?? null;
        state.target = status?.target ?? null;
        state.error = status?.error || "";

        render();

    }

    async function refresh() {

        try {

            const response = await fetch("/api/rotator/status", { cache: "no-store" });

            if (response.ok) {
                apply(await response.json());
            }

        }
        catch (error) {
            // server not reachable: keep the last state
        }

    }

    async function post(path, body) {

        const response = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body || {})
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        apply(data);

        return data;

    }

    async function turn(azimuth) {

        try {
            return await post("/api/rotator/turn", { azimuth });
        }
        catch (error) {
            alert(`Rotator: ${error.message}`);
            return null;
        }

    }

    async function stop() {

        try {
            await post("/api/rotator/stop");
        }
        catch (error) {
            alert(`Rotator: ${error.message}`);
        }

    }

    window.shackRotator = {
        isEnabled: () => state.enabled && state.connected,
        turn,
        stop
    };

    /* Buttons with data-rotator-az (spot details: TURN / LP) */
    document.addEventListener("click", event => {

        const button = event.target.closest?.("[data-rotator-az]");

        if (button) {
            event.preventDefault();
            turn(Number(button.dataset.rotatorAz));
        }

    });

    addStyles();
    refresh();
    setInterval(refresh, 2000);

    window.addEventListener("componentsLoaded", () => setTimeout(render, 500));

})();
