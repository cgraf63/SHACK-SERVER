import { Router } from "express";
import { qsoService } from "../services/qso/qso-instance.js";

const router = Router();


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
                qth,
                dx_grid,
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
                        call.trim().toUpperCase(),

                    frequency,

                    band,

                    mode:
                        mode.trim().toUpperCase(),

                    rst_sent:
                        typeof rst_sent === "string"
                            ? rst_sent
                            : "59",

                    rst_rcvd:
                        typeof rst_rcvd === "string"
                            ? rst_rcvd
                            : "59",

                    my_callsign:
                        my_callsign.trim().toUpperCase(),

                    my_grid:
                        my_grid.trim().toUpperCase(),

                    operator_name:
                        operator_name.trim(),

                    name:
                        typeof name === "string"
                            ? name.trim()
                            : null,

                    qth:
                        typeof qth === "string"
                            ? qth.trim()
                            : null,

                    dx_grid:
                        typeof dx_grid === "string"
                            ? dx_grid.trim().toUpperCase()
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

        } catch (error) {

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
                count: qsos.length,
                qsos
            });

        } catch (error) {

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

        } catch (error) {

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

        } catch (error) {

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
