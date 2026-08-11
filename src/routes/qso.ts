import { Router } from "express";
import { qsoService } from "../services/qso/qso-instance.js";
import { QRZService } from "../services/geo/qrz.service.js";

const router = Router();

const qrzService =
    new QRZService();
/*
    Create QSO
*/

router.post(
    "/",
    (req, res) => {

        try {

            const {
                qso_date,
                time_on_utc,
                time_off_utc,

                call,

                frequency,
                band,
                mode,

                rst_sent,
                rst_rcvd,

                my_callsign,
                my_grid,
                operator_name,

                name,
                country,
                country_code,
                dx_grid,

                itu_zone,
                cq_zone,

                notes,

                spot_source,
                spot_id

            } = req.body;


            if (
                typeof qso_date !== "string" ||
                !qso_date
            ) {

                return res.status(400).json({
                    error: "Invalid QSO date"
                });

            }


            if (
                typeof time_on_utc !== "string" ||
                !time_on_utc
            ) {

                return res.status(400).json({
                    error: "Invalid start time"
                });

            }


            if (
                typeof call !== "string" ||
                !call.trim()
            ) {

                return res.status(400).json({
                    error: "Invalid callsign"
                });

            }


            if (
                typeof frequency !== "number" ||
                !Number.isFinite(frequency)
            ) {

                return res.status(400).json({
                    error: "Invalid frequency"
                });

            }


            if (
                typeof band !== "string" ||
                !band
            ) {

                return res.status(400).json({
                    error: "Invalid band"
                });

            }


            if (
                typeof mode !== "string" ||
                !mode
            ) {

                return res.status(400).json({
                    error: "Invalid mode"
                });

            }


            if (
                typeof my_callsign !== "string" ||
                !my_callsign
            ) {

                return res.status(400).json({
                    error: "Invalid station callsign"
                });

            }


            if (
                typeof my_grid !== "string" ||
                !my_grid
            ) {

                return res.status(400).json({
                    error: "Invalid station grid"
                });

            }


            if (
                typeof operator_name !== "string" ||
                !operator_name
            ) {

                return res.status(400).json({
                    error: "Invalid operator name"
                });

            }


            const qso =
                qsoService.createQso({

                    qso_date,

                    time_on_utc,

                    time_off_utc:
                        typeof time_off_utc === "string"
                            ? time_off_utc
                            : null,


                    call:
                        call
                            .trim()
                            .toUpperCase(),


                    frequency,


                    band:
                        band
                            .trim(),


                    mode:
                        mode
                            .trim()
                            .toUpperCase(),


                    rst_sent:
                        typeof rst_sent === "string"
                            ? rst_sent.trim()
                            : "59",


                    rst_rcvd:
                        typeof rst_rcvd === "string"
                            ? rst_rcvd.trim()
                            : "59",


                    my_callsign:
                        my_callsign
                            .trim()
                            .toUpperCase(),


                    my_grid:
                        my_grid
                            .trim()
                            .toUpperCase(),


                    operator_name:
                        operator_name
                            .trim(),


                    name:
                        typeof name === "string"
                            ? name.trim()
                            : null,


                    country:
                        typeof country === "string"
                            ? country.trim()
                            : null,


country_code:
    typeof country_code === "string"
        ? country_code.trim().toLowerCase()
        : null,


                    dx_grid:
                        typeof dx_grid === "string"
                            ? dx_grid
                                .trim()
                                .toUpperCase()
                            : null,


                    itu_zone:
                        Number.isInteger(itu_zone)
                            ? itu_zone
                            : null,


                    cq_zone:
                        Number.isInteger(cq_zone)
                            ? cq_zone
                            : null,


                    notes:
                        typeof notes === "string"
                            ? notes.trim()
                            : null,


                    spot_source:
                        typeof spot_source === "string"
                            ? spot_source
                            : null,


                    spot_id:
                        typeof spot_id === "string"
                            ? spot_id
                            : null

                });


            return res.status(201).json({
                success: true,
                qso
            });

        }

        catch (error) {

            console.error(
                "QSO create failed:",
                error
            );

            return res.status(500).json({
                error: "Failed to create QSO"
            });

        }

    }
);


/*
    Get all QSOs
*/

router.get(
    "/",
    (_req, res) => {

        try {

            const qsos =
                qsoService.getAllQso();


            return res.json({

                success: true,

                count:
                    qsos.length,

                qsos

            });

        }

        catch (error) {

            console.error(
                "QSO list failed:",
                error
            );

            return res.status(500).json({
                error: "Failed to load QSOs"
            });

        }

    }
);

/*
    QRZ lookup for QSO dialog
*/

router.get(
    "/qrz/:call",
    async (req, res) => {

        const call =
            String(
                req.params.call || ""
            )
            .trim()
            .toUpperCase();


        if (!call) {

            return res.status(400).json({
                error:
                    "Invalid callsign"
            });

        }


        try {

            const result =
                await qrzService.lookup(
                    call
                );


            if (!result) {

                return res.status(404).json({
                    error:
                        "QRZ callsign not found"
                });

            }


            return res.json({
                success: true,
                qrz: result
            });


        }
        catch (error) {

            console.error(
                "QRZ lookup route failed:",
                error
            );


            return res.status(500).json({
                error:
                    "QRZ lookup failed"
            });
        }
    }
);



/*
    ADIF Import
*/

router.post(
    "/import-adif",
    (req, res) => {

        try {

            const adif =
                req.body?.adif;


            if (
                typeof adif !== "string" ||
                !adif.trim()
            ) {

                return res.status(400).json({
                    error: "Invalid ADIF data"
                });

            }


            const records:
                Record<string, string>[] = [];


            const recordMatches =
                adif.split(
                    /<EOR\s*>/i
                );


            for (const rawRecord of recordMatches) {

                const record =
                    rawRecord.trim();


                if (!record) {
                    continue;
                }


                const fields:
                    Record<string, string> = {};


                const regex =
                    /<([^:>]+):(\d+)(?::[^>]*)?>([\s\S]*?)/gi;


                let match:
                    RegExpExecArray | null;


                while (
                    (match = regex.exec(record)) !== null
                ) {

                    const field =
                        match[1]?.trim()
                            .toUpperCase() || "";


                    const length =
                        Number(match[2] || 0);


                    const value =
                        (match[3] || "")
                            .substring(0, length)
                            .trim();


                    fields[field] =
                        value;

                }


                if (
                    Object.keys(fields).length
                ) {

                    records.push(fields);

                }

            }


            const existing =
                qsoService.getAllQso();


            const existingKeys =
                new Set(
                    existing.map(
                        qso =>
                            [
                                qso.qso_date,
                                qso.time_on_utc,
                                qso.call
                                    .trim()
                                    .toUpperCase(),
                                String(qso.frequency),
                                qso.mode
                                    .trim()
                                    .toUpperCase()
                            ].join("|")
                    )
                );


            let imported = 0;
            let duplicates = 0;
            let skipped = 0;


            for (const fields of records) {

                const qsoDate =
                    fields.QSO_DATE || "";


                const timeOn =
                    fields.TIME_ON || "";


                const timeOff =
                    fields.TIME_OFF || null;


                const call =
                    (
                        fields.CALL || ""
                    )
                    .trim()
                    .toUpperCase();


                const freqMHz =
                    Number(
                        fields.FREQ || ""
                    );


                const frequency =
                    Number.isFinite(freqMHz)
                        ? Math.round(
                            freqMHz * 1000000
                        )
                        : NaN;


                const band =
                    (
                        fields.BAND || ""
                    ).trim();


                const mode =
                    (
                        fields.MODE || ""
                    )
                    .trim()
                    .toUpperCase();


                if (
                    !qsoDate ||
                    !timeOn ||
                    !call ||
                    !Number.isFinite(frequency) ||
                    !band ||
                    !mode
                ) {

                    skipped++;
                    continue;

                }


                const myCallsign =
                    (
                        fields.STATION_CALLSIGN ||
                        fields.MY_CALLSIGN ||
                        ""
                    )
                    .trim()
                    .toUpperCase();


                const myGrid =
                    (
                        fields.MY_GRIDSQUARE ||
                        ""
                    )
                    .trim()
                    .toUpperCase();


                const operatorName =
                    (
                        fields.OPERATOR ||
                        myCallsign ||
                        ""
                    )
                    .trim();


                if (
                    !myCallsign ||
                    !myGrid ||
                    !operatorName
                ) {

                    skipped++;
                    continue;

                }


                const rstSent =
                    (
                        fields.RST_SENT ||
                        "59"
                    ).trim();


                const rstRcvd =
                    (
                        fields.RST_RCVD ||
                        "59"
                    ).trim();


                const name =
                    fields.NAME?.trim() ||
                    null;


                const country =
                    fields.COUNTRY?.trim() ||
                    null;


                const dxGrid =
                    fields.GRIDSQUARE
                        ?.trim()
                        .toUpperCase() ||
                    null;


                const ituZone =
                    fields.ITUZ
                        ? Number(fields.ITUZ)
                        : null;


                const cqZone =
                    fields.CQZ
                        ? Number(fields.CQZ)
                        : null;


                const notes =
                    fields.COMMENT?.trim() ||
                    null;


                const key =
                    [
                        qsoDate,
                        timeOn,
                        call,
                        String(frequency),
                        mode
                    ].join("|");


                if (
                    existingKeys.has(key)
                ) {

                    duplicates++;
                    continue;

                }


                qsoService.createQso({

                    qso_date:
                        qsoDate,

                    time_on_utc:
                        timeOn,

                    time_off_utc:
                        timeOff,

                    call,

                    frequency,

                    band,

                    mode,

                    rst_sent:
                        rstSent,

                    rst_rcvd:
                        rstRcvd,

                    my_callsign:
                        myCallsign,

                    my_grid:
                        myGrid,

                    operator_name:
                        operatorName,

                    name,

                    country,

                    country_code:
                        null,

                    dx_grid:
                        dxGrid,

                    itu_zone:
                        Number.isInteger(
                            ituZone
                        )
                            ? ituZone
                            : null,

                    cq_zone:
                        Number.isInteger(
                            cqZone
                        )
                            ? cqZone
                            : null,

                    notes,

                    spot_source:
                        "ADIF",

                    spot_id:
                        null

                });


                existingKeys.add(key);

                imported++;

            }


            return res.json({

                success: true,

                read:
                    records.length,

                imported,

                duplicates,

                skipped

            });

        }
        catch (error) {

            console.error(
                "ADIF import failed:",
                error
            );


            return res.status(500).json({
                error: "Failed to import ADIF"
            });

        }

    }
);

/*
    Get worked status
*/

router.get(
    "/worked",
    (_req, res) => {

        try {

            const worked =
                qsoService.getWorkedStatus();

            return res.json(
                worked
            );

        }
        catch (error) {

            console.error(
                "Worked status failed:",
                error
            );

            return res.status(500).json({
                error: "Failed to get worked status"
            });

        }

    }
);
/*
    Get QSO by ID
*/

router.get(
    "/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({
                error: "Invalid QSO ID"
            });

        }


        try {

            const qso =
                qsoService.getQso(id);


            if (!qso) {

                return res.status(404).json({
                    error: "QSO not found"
                });

            }


            return res.json({

                success: true,

                qso

            });

        }

        catch (error) {

            console.error(
                "QSO load failed:",
                error
            );

            return res.status(500).json({
                error: "Failed to load QSO"
            });

        }

    }
);


/*
    Update QSO
*/

router.put(
    "/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({
                error: "Invalid QSO ID"
            });

        }

        try {

            const existing =
                qsoService.getQso(id);

            if (!existing) {

                return res.status(404).json({
                    error: "QSO not found"
                });

            }

            const {
                qso_date,
                time_on_utc,
                time_off_utc,
                call,
                frequency,
                band,
                mode,
                rst_sent,
                rst_rcvd,
                my_callsign,
                my_grid,
                operator_name,
                name,
                country,
                country_code,
                dx_grid,
                itu_zone,
                cq_zone,
                notes,
                spot_source,
                spot_id
            } = req.body;

            const updated =
                qsoService.updateQso(
                    id,
                    {
                        qso_date,
                        time_on_utc,
                        time_off_utc:
                            typeof time_off_utc === "string"
                                ? time_off_utc
                                : null,

                        call:
                            String(call || "")
                                .trim()
                                .toUpperCase(),

                        frequency,

                        band:
                            String(band || "")
                                .trim(),

                        mode:
                            String(mode || "")
                                .trim()
                                .toUpperCase(),

                        rst_sent:
                            typeof rst_sent === "string"
                                ? rst_sent.trim()
                                : "59",

                        rst_rcvd:
                            typeof rst_rcvd === "string"
                                ? rst_rcvd.trim()
                                : "59",

                        my_callsign:
                            String(my_callsign || "")
                                .trim()
                                .toUpperCase(),

                        my_grid:
                            String(my_grid || "")
                                .trim()
                                .toUpperCase(),

                        operator_name:
                            String(operator_name || "")
                                .trim(),

                        name:
                            typeof name === "string"
                                ? name.trim()
                                : null,

                        country:
                            typeof country === "string"
                                ? country.trim()
                                : null,

country_code:
    typeof country_code === "string"
        ? country_code.trim().toLowerCase()
        : null,



                        dx_grid:
                            typeof dx_grid === "string"
                                ? dx_grid.trim().toUpperCase()
                                : null,

                        itu_zone:
                            Number.isInteger(itu_zone)
                                ? itu_zone
                                : null,

                        cq_zone:
                            Number.isInteger(cq_zone)
                                ? cq_zone
                                : null,

                        notes:
                            typeof notes === "string"
                                ? notes.trim()
                                : null,

                        spot_source:
                            typeof spot_source === "string"
                                ? spot_source
                                : null,

                        spot_id:
                            typeof spot_id === "string"
                                ? spot_id
                                : null
                    }
                );

            if (!updated) {

                return res.status(404).json({
                    error: "QSO not found"
                });

            }

            return res.json({
                success: true,
                qso:
                    qsoService.getQso(id)
            });

        }
        catch (error) {

            console.error(
                "QSO update failed:",
                error
            );

            return res.status(500).json({
                error: "Failed to update QSO"
            });

        }

    }
);

/*
    Delete QSO
*/

router.delete(
    "/:id",
    (req, res) => {

        const id =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({
                error: "Invalid QSO ID"
            });

        }


        try {

            const deleted =
                qsoService.deleteQso(id);


            if (!deleted) {

                return res.status(404).json({
                    error: "QSO not found"
                });

            }


            return res.json({
                success: true
            });

        }

        catch (error) {

            console.error(
                "QSO delete failed:",
                error
            );

            return res.status(500).json({
                error: "Failed to delete QSO"
            });

        }

    }
);


export default router;
