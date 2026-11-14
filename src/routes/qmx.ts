import { Router } from "express";

import { radioManager } from "../services/radio/radio-manager.js";
import { QMX_BANDS, QMX_MODES, QMX_STEPS, QmxService } from "../services/radio/qmx.service.js";


/*
 * Dedicated QMX / QMX+ remote page (/qmx).
 *
 * Like the other remote pages it controls the ACTIVE transceiver
 * (selected in the dashboard). Not a QMX: 409 + hint.
 *
 *   GET  /api/qmx           state (frequency, mode, meters, LCD, CW decoder)
 *   GET  /api/qmx/tables    modes, bands, tune steps
 *   POST /api/qmx/control   { control, value }
 *   POST /api/qmx/bands     { version: auto | 80-20 | 60-15 | 20-10 | plus }
 *                           band version, saved in the transceiver config
 */

const router = Router();

function activeQmx(): QmxService | null {
    const radio = radioManager.getActiveRadio();
    return radio instanceof QmxService ? radio : null;
}

function notActive(res: import("express").Response): void {
    const active = radioManager.getRadios().find(r => r.active);
    res.status(409).json({
        error: "The active transceiver is not a QMX. Select the QMX in the dashboard.",
        activeRadio: active ? { id: active.id, name: active.name, protocol: active.protocol } : null
    });
}

router.get("/", (_req, res) => {
    const radio = activeQmx();
    if (!radio) return notActive(res);
    const active = radioManager.getRadios().find(r => r.active);
    res.set("Cache-Control", "no-store");
    res.json({ name: active?.name ?? "QMX", ...radio.getState() });
});

router.get("/tables", (_req, res) => {
    res.json({
        modes: Object.keys(QMX_MODES),
        bands: QMX_BANDS.map(({ name, start }) => ({ name, start })),
        steps: QMX_STEPS
    });
});

router.post("/control", (req, res) => {

    const radio = activeQmx();
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

router.post("/bands", (req, res) => {

    const radio = activeQmx();
    if (!radio) return notActive(res);

    const version = String(req.body?.version ?? "");
    if (!["auto", "80-20", "60-15", "20-10", "plus"].includes(version)) {
        return res.status(400).json({ error: "Unknown band version" });
    }

    const config = radioManager.store.get(radioManager.store.getActiveRadioId());
    if (!config) return notActive(res);

    try {
        // saved without restarting the connection
        radioManager.store.update(config.id, { ...config, qmxBands: version });
        radio.setBandVersion(version as Parameters<QmxService["setBandVersion"]>[0]);
        return res.json({ success: true, version });
    }
    catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }

});

export default router;
