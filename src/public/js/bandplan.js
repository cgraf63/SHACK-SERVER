(() => {
    let modal = null;
    let activeBand = "20m";

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function createModal() {
        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "bandplan-modal";
        modal.className = "bandplan-modal";
        modal.innerHTML = `
            <div class="bandplan-dialog">
                <div class="bandplan-header">
                    <h2>Bandplan</h2>
                    <button type="button" class="bandplan-close" aria-label="Close">×</button>
                </div>

                <div class="bandplan-band-buttons"></div>

                <div class="bandplan-content">
                    <div class="bandplan-title"></div>
                    <div class="bandplan-scale"></div>
                    <div class="bandplan-bar"></div>
                    <div class="bandplan-markers"></div>
                </div>

                <div class="bandplan-footer">
                    HB9 / IARU Region 1 Bandplan
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".bandplan-close").addEventListener("click", closeModal);

        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal();
            }
        });

        return modal;
    }

    function render() {
        if (!modal || !Array.isArray(BANDPLAN_DATA)) return;

        const data = BANDPLAN_DATA;
        const band = data.find(item => item.band === activeBand) || data[0];

        if (!band) return;

        const buttons = modal.querySelector(".bandplan-band-buttons");
        buttons.innerHTML = data.map(item => `
            <button
                type="button"
                class="bandplan-band-btn ${item.band === band.band ? "active" : ""}"
                data-band="${escapeHtml(item.band)}">
                ${escapeHtml(item.band)}
            </button>
        `).join("");

        buttons.querySelectorAll(".bandplan-band-btn").forEach(button => {
            button.addEventListener("click", () => {
                activeBand = button.dataset.band;
                render();
            });
        });

        modal.querySelector(".bandplan-title").textContent =
            `${band.band}   ${band.min.toFixed(3)} – ${band.max.toFixed(3)} MHz`;

        const range = band.max - band.min;

        const scale = modal.querySelector(".bandplan-scale");
        scale.innerHTML = `
            <span>${band.min.toFixed(3)}</span>
            <span>${((band.min + band.max) / 2).toFixed(3)}</span>
            <span>${band.max.toFixed(3)}</span>
        `;

        const bar = modal.querySelector(".bandplan-bar");

        const boundaryMarkers = band.segments
            .slice(0, -1)
            .map(segment => {
                const left = ((segment.end - band.min) / range) * 100;

                return `
                    <div
                        class="bandplan-boundary"
                        style="left:${left}%">
                        <div class="bandplan-boundary-tick"></div>
                        <div class="bandplan-boundary-label">
                            ${escapeHtml(segment.end.toFixed(3))}
                        </div>
                    </div>
                `;
            })
            .join("");

        bar.innerHTML = band.segments.map(segment => {
            const left = ((segment.start - band.min) / range) * 100;
            const width = ((segment.end - segment.start) / range) * 100;

            return `
                <div
                    class="bandplan-segment"
                    style="left:${left}%;width:${width}%"
                    title="${escapeHtml(segment.start.toFixed(3))} – ${escapeHtml(segment.end.toFixed(3))} MHz">
                    <span>${escapeHtml(segment.mode)}</span>
                </div>
            `;
        }).join("") + boundaryMarkers;

        const markers = modal.querySelector(".bandplan-markers");

        markers.innerHTML = (band.markers || []).map(marker => {
            const left = ((marker.frequency - band.min) / range) * 100;

            return `
                <div
                    class="bandplan-marker"
                    style="left:${left}%">
                    <div class="bandplan-marker-line"></div>
                    <div class="bandplan-marker-label">
                        ${escapeHtml(marker.frequency.toFixed(3))}
                        <span>${escapeHtml(marker.label)}</span>
                    </div>
                </div>
            `;
        }).join("");
    }

    function openModal() {
        createModal();
        render();
        modal.classList.add("visible");
    }

    function closeModal() {
        if (modal) {
            modal.classList.remove("visible");
        }
    }


document.addEventListener("click", event => {
    const button = event.target.closest("#bandplan-btn");

    if (!button) return;

    event.preventDefault();
    openModal();
}, true);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
})();
