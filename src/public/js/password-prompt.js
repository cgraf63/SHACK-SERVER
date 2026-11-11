/*
 * askPassword(label) - like window.prompt(), but the input is masked
 * (•••) - e.g. for screen recordings. Resolves to the text, or null on
 * Cancel / Escape.
 */
(function () {

    function askPassword(label, options = {}) {

        return new Promise(resolve => {

            const overlay = document.createElement("div");
            overlay.setAttribute("role", "dialog");
            overlay.setAttribute("aria-modal", "true");
            overlay.style.cssText =
                "position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;" +
                "background:rgba(0,0,0,.55);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

            const box = document.createElement("form");
            box.style.cssText =
                "width:min(380px,calc(100vw - 32px));background:#121c24;color:#e6edf3;border:1px solid #2b3c4a;" +
                "border-radius:12px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.6)";

            const title = document.createElement("div");
            title.textContent = label;
            title.style.cssText = "font-size:15px;font-weight:600;margin-bottom:12px";

            const input = document.createElement("input");
            input.type = "password";
            input.autocomplete = options.autocomplete || "off";
            input.spellcheck = false;
            input.style.cssText =
                "width:100%;box-sizing:border-box;padding:10px 12px;font-size:16px;border-radius:8px;" +
                "border:1.5px solid #3b82f6;background:#0b1118;color:#e6edf3;outline:none;letter-spacing:2px";

            const row = document.createElement("div");
            row.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:16px";

            const button = (text, primary) => {
                const element = document.createElement("button");
                element.type = primary ? "submit" : "button";
                element.textContent = text;
                element.style.cssText =
                    "padding:8px 20px;border-radius:18px;font-size:14px;font-weight:600;cursor:pointer;border:0;" +
                    (primary ? "background:#7fb6ff;color:#0b1118" : "background:#1f3a52;color:#d7e7f5");
                return element;
            };

            const ok = button("OK", true);
            const cancel = button("Cancel", false);

            const finish = value => {
                document.removeEventListener("keydown", onKey, true);
                overlay.remove();
                resolve(value);
            };

            const onKey = event => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    finish(null);
                }
            };

            box.addEventListener("submit", event => {
                event.preventDefault();
                finish(input.value);
            });
            cancel.addEventListener("click", () => finish(null));
            overlay.addEventListener("mousedown", event => {
                if (event.target === overlay) finish(null);
            });
            document.addEventListener("keydown", onKey, true);

            row.append(cancel, ok);
            box.append(title, input, row);
            overlay.append(box);
            document.body.append(overlay);

            setTimeout(() => input.focus(), 0);

        });

    }

    window.askPassword = askPassword;

})();
