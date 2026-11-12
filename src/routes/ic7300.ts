import { Router } from "express";

import { radioManager } from "../services/radio/radio-manager.js";
import { IC7300_BANDS, IC7300_MODES, IC7300_SPANS, Ic7300Service } from "../services/radio/ic7300.service.js";


/*
 * Dedicated IC-7300 remote page (/ic7300).
 *
 * Like the other remote pages it controls the ACTIVE transceiver
 * (selected in the dashboard). Not an IC-7300: 409 + hint.
 *
 *   GET  /api/ic7300           state (frequency, mode, levels, meters, scope)
 *   GET  /api/ic7300/tables    modes, bands, scope spans
 *   POST /api/ic7300/control   { control, value }
 *   WebSocket /ic7300-scope    spectrum lines of the radio (binary)
 */

const router = Router();

function activeIc7300(): Ic7300Service | null {
    const radio = radioManager.getActiveRadio();
    return radio instanceof Ic7300Service ? radio : null;
}

function notActive(res: import("express").Response): void {
    const active = radioManager.getRadios().find(r => r.active);
    res.status(409).json({
        error: "The active transceiver is not an IC-7300. Select the IC-7300 in the dashboard.",
        activeRadio: active ? { id: active.id, name: active.name, protocol: active.protocol } : null
    });
}

router.get("/", (_req, res) => {
    const radio = activeIc7300();
    if (!radio) return notActive(res);
    const active = radioManager.getRadios().find(r => r.active);
    res.set("Cache-Control", "no-store");
    res.json({ name: active?.name ?? "IC-7300", ...radio.getState() });
});

router.get("/tables", (_req, res) => {
    res.json({
        modes: Object.keys(IC7300_MODES),
        bands: IC7300_BANDS.map(({ name, start }) => ({ name, start })),
        spans: IC7300_SPANS
    });
});

router.post("/control", (req, res) => {

    const radio = activeIc7300();
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
