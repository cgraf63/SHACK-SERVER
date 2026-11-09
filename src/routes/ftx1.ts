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
 *
 *   GET  /api/ftx1/memories          channel list (read with control "memoryScan")
 *   POST /api/ftx1/memories/store    { channel, from: MAIN|SUB, name }
 *   POST /api/ftx1/memories/rename   { channel, name }
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


router.get("/memories", (_req, res) => {

    const radio = activeFtx1();

    if (!radio) return notActive(res);

    res.json({ scan: radio.getMemoryScan(), memories: radio.getMemories() });

});


router.post("/memories/store", async (req, res) => {

    const radio = activeFtx1();

    if (!radio) return notActive(res);

    const { channel, from, name } = req.body ?? {};
    const ch = Number(channel);

    if (!Number.isInteger(ch) || ch < 1 || ch > 99) {
        return res.status(400).json({ error: "Channel 1 - 99" });
    }

    try {
        const memory = await radio.storeMemory(ch, from === "SUB" ? "SUB" : "MAIN", String(name ?? ""));
        if (!memory) return res.status(502).json({ error: "Stored, but the channel could not be read back - check on the radio" });
        return res.json({ success: true, memory });
    }
    catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : String(error) });
    }

});


router.post("/memories/rename", async (req, res) => {

    const radio = activeFtx1();

    if (!radio) return notActive(res);

    const { channel, name } = req.body ?? {};
    const ch = Number(channel);

    if (!Number.isInteger(ch) || ch < 1 || ch > 99) {
        return res.status(400).json({ error: "Channel 1 - 99" });
    }

    try {
        await radio.renameMemory(ch, String(name ?? ""));
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : String(error) });
    }

});


export default router;
