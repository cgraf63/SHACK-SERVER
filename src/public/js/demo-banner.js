/*
    SHACK-SERVER - demo version banner

    Shown only when the server runs with SHACK_DEMO=1 (Docker demo
    image). Adds a fixed DEMO bar and hides settings that cannot be
    used in the demo. The limits themselves are enforced by the server.
*/

(function () {

    if (window.__shackDemoBanner) {
        return;
    }

    window.__shackDemoBanner = true;

    const GITHUB = "https://github.com/cgraf63/SHACK-SERVER";

    function addStyles() {

        const style = document.createElement("style");

        style.textContent = `
            .demo-bar {
                position: fixed;
                left: 50%;
                bottom: 12px;
                transform: translateX(-50%);
                z-index: 9000;
                display: flex;
                align-items: center;
                gap: 12px;
                max-width: calc(100vw - 32px);
                padding: 8px 14px;
                border: 1px solid rgba(255, 196, 0, 0.55);
                border-radius: 8px;
                background: rgba(20, 16, 4, 0.92);
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
                color: #ffe08a;
                font-family: inherit;
                font-size: 13px;
                line-height: 1.35;
            }
            .demo-bar strong {
                color: #ffc400;
                letter-spacing: 0.08em;
            }
            .demo-bar a {
                color: #00e5ff;
                white-space: nowrap;
            }
            .demo-bar button {
                margin-left: 4px;
                border: 0;
                background: transparent;
                color: #ffe08a;
                font-size: 16px;
                cursor: pointer;
            }
            body.demo-mode [data-demo-hide],
            body.demo-mode #radio-add,
            body.demo-mode .system-card {
                display: none !important;
            }
            @media (max-width: 700px) {
                .demo-bar { font-size: 12px; flex-wrap: wrap; }
            }
        `;

        document.head.appendChild(style);

    }

    function show(info) {

        document.body.classList.add("demo-mode");

        if (document.querySelector(".demo-bar")) {
            return;
        }

        const used =
            info.counts && info.limits
                ? ` · Log ${info.counts.qsos}/${info.limits.qsos} QSOs`
                : "";

        const bar = document.createElement("div");

        bar.className = "demo-bar";
        bar.innerHTML =
            `<span><strong>DEMO</strong> · simulated transceiver, ` +
            `no remote / transmit, no uploads${used}</span>` +
            `<a href="${GITHUB}" target="_blank" rel="noopener">Full version</a>` +
            `<button type="button" title="Hide">×</button>`;

        bar.querySelector("button").addEventListener("click", () => {
            bar.remove();
        });

        document.body.appendChild(bar);

    }

    async function check() {

        try {

            const response =
                await fetch("/api/demo", { cache: "no-store" });

            if (!response.ok) {
                return;
            }

            const info = await response.json();

            if (info.demo) {
                addStyles();
                show(info);
            }

        }
        catch (error) {
            // not important - no banner
        }

    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", check);
    }
    else {
        check();
    }

})();
