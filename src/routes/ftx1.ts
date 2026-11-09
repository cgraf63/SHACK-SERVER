import { Router } from "express";

import { radioManager } from "../services/radio/radio-manager.js";
import { FTX1_BANDS, FTX1_CTCSS, FTX1_DCS, FTX1_MODES, Ftx1Service } from "../services/radio/ftx-1.service.js";


/*
 * Dedicated FTX-1 remote page (/ftx1).
 *
 * Like the FTDX10 page, it controls the ACTIVE transceiver (selected in
 * the dashboard). When the active transceiver is not an FTX-1, the API
 * answers 409 and the page shows a hint.
 *
 *   GET  /api/ftx1           complete state (MAIN, SUB, DSP, FM, meters)
 *   GET  /api/ftx1/tables    modes, bands, CTCSS / DCS tables
 *   POST /api/ftx1/control   { control, value }
 */

const router = Router();


function activeFtx1(): Ftx1Service | null {

    const radio = radioManager.getActiveRadio();

    return radio instanceof Ftx1Service ? radio : null;

}

function notActive(res: import("express").Response): void {

    const active = radioManager.getRadios().find(r => r.active);

    res.status(409).json({
        error: "The active transceiver is not an FTX-1. Select the FTX-1 in the dashboard.",
        activeRadio: active ? { id: active.id, name: active.name, protocol: active.protocol } : null
    });

}


router.get("/", (_req, res) => {

    const radio = activeFtx1();

    if (!radio) return notActive(res);

    const active = radioManager.getRadios().find(r => r.active);

    res.json({ name: active?.name ?? "FTX-1", ...radio.getState() });

});


router.get("/tables", (_req, res) => {

    res.json({
        modes: Object.keys(FTX1_MODES),
        bands: FTX1_BANDS.map(({ code, name }) => ({ code, name })),
        ctcss: FTX1_CTCSS.map(v => v / 10),
        dcs: FTX1_DCS
    });

});


router.post("/control", (req, res) => {

    const radio = activeFtx1();

    if (!radio) return notActive(res);

    const { control, value } = req.body ?? {};

    if (typeof control !== "string" || !control) {
        return res.status(400).json({ error: "control missing" });
    }

    try {
        radio.control(control, value);
        return res.json({ success: true, control, value });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = /not connected/i.test(message) ? 503 : 400;
        return res.status(status).json({ error: message });
    }

});


export default router;
