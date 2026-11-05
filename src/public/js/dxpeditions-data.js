/*
    SHACK-SERVER - DXpeditions (NG3K ADXO), shared by the DXpeditions
    page and the live spots.

    window.shackDxpeditions.load()        -> list from /api/dxpeditions
    window.shackDxpeditions.match(call)   -> DXpedition that is QRV now, or null
*/

(function () {

    if (window.shackDxpeditions) {
        return;
    }

    const RELOAD_MS = 15 * 60 * 1000;

    let list = { entries: [] };
    let loadedAt = 0;
    let loading = null;

    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    function isActive(entry) {
        const day = today();
        return entry.start <= day && entry.end >= day;
    }

    /* "NY9K/VP2V" and "VP2V/NY9K" are the same station */
    function key(call) {
        return String(call || "")
            .toUpperCase()
            .trim()
            .split("/")
            .filter(Boolean)
            .sort()
            .join("/");
    }

    function matches(entry, call) {

        const spotted = String(call || "").toUpperCase().trim();

        if (!spotted) return false;

        const spottedKey = key(spotted);

        if ((entry.calls || []).some(c => key(c) === spottedKey)) {
            return true;
        }

        /* only a prefix announced (e.g. "3B9"): 3B9/M0CFW, M0CFW/3B9 */
        if (entry.prefix) {
            return spotted.split("/").includes(entry.prefix);
        }

        /* H44MS/P, H44MS/MM ... */
        return spotted.split("/")[0] === entry.call;

    }

    async function load(refresh = false) {

        if (!refresh && loadedAt && Date.now() - loadedAt < RELOAD_MS) {
            return list;
        }

        if (loading) return loading;

        loading = (async () => {

            try {
                const response = await fetch(
                    `/api/dxpeditions${refresh ? "?refresh=1" : ""}`,
                    { cache: "no-store" }
                );
                if (response.ok) {
                    list = await response.json();
                    loadedAt = Date.now();
                    window.dispatchEvent(new CustomEvent("dxpeditionsLoaded"));
                }
            }
            catch (error) {
                console.error("DXpeditions load failed:", error);
            }
            finally {
                loading = null;
            }

            return list;

        })();

        return loading;

    }

    function match(call) {

        return (list.entries || []).find(entry => isActive(entry) && matches(entry, call)) || null;

    }

    window.shackDxpeditions = {
        load,
        match,
        matches,
        isActive,
        get list() { return list; }
    };

    load();
    setInterval(() => load(), RELOAD_MS);

})();
