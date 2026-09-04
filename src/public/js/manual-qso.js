(() => {

    const callInput =
        document.getElementById(
            "manual-qso-call"
        );

    const qrzButton =
        document.getElementById(
            "manual-qso-qrz"
        );
	const qsoButton =
    	    document.getElementById(
            "manual-qso-open"
    );

    if (
        !callInput ||
        !qrzButton ||
 	!qsoButton
    ) {
        return;
    }


    qrzButton.addEventListener(
        "click",
        async () => {

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

            }
            catch (error) {

                console.error(
                    "Manual QSO QRZ lookup failed:",
                    error
                );

            }

        }
    );


    callInput.addEventListener(
        "keydown",
        event => {

            if (event.key !== "Enter") {
                return;
            }

            event.preventDefault();

            qrzButton.click();

        }
    );

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
