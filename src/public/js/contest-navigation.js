document.addEventListener("DOMContentLoaded", () => {

    const tabs = document.querySelectorAll(".contest-tab");
    const views = document.querySelectorAll(".contest-view");

    if (!tabs.length || !views.length) {
        return;
    }

    tabs.forEach(tab => {

        tab.addEventListener("click", () => {

            const target = tab.dataset.contestView;

            tabs.forEach(t => {
                t.classList.toggle("active", t === tab);
            });

            views.forEach(view => {
                view.hidden = view.id !== `contest-view-${target}`;
            });

            if (
                target === "qsos" &&
                typeof window.loadContestQsos === "function"
            ) {
                window.loadContestQsos();
            }

            if (
                target === "qso-history" &&
                typeof window.loadContestQsoHistory === "function"
            ) {
                window.loadContestQsoHistory();
            }

            if (
                target === "sessions" &&
                typeof window.loadContestSessions === "function"
            ) {
                window.loadContestSessions();
            }

        });

    });

});
