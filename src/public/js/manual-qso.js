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


    window.checkManualQsoWatch =
        function(spots) {

            if (
                !watchCheckbox ||
                !watchCheckbox.checked
            ) {
                return;
            }


            const wantedCall =
                callInput.value
                    .trim()
                    .toUpperCase();


            if (!wantedCall) {
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
                    spotCall !== wantedCall
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
                frequencyMHz * 1000

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
