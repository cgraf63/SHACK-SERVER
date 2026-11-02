import { Router } from "express";

import { rotatorService, testRotator } from "../services/rotator/rotator.service.js";
import { getRotatorModels } from "../services/rotator/rotator-models.js";
import { normalizeRotator, settingsService } from "../services/settings/settings.service.js";


/*
 * /api/rotator - antenna rotator (Hamlib rotctld)
 */

const router = Router();


router.get("/status", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(rotatorService.getStatus());

});


router.get("/models", async (req, res) => {

    res.json(await getRotatorModels({ refresh: req.query.refresh === "1" }));

});


/* Body: { azimuth } */
router.post("/turn", async (req, res) => {

    const azimuth = Number(req.body?.azimuth);

    if (!Number.isFinite(azimuth)) {
        return res.status(400).json({ error: "Invalid azimuth" });
    }

    try {
        res.json(await rotatorService.turn(azimuth));
    }
    catch (error) {
        res.status(409).json({ error: error instanceof Error ? error.message : String(error) });
    }

});


router.post("/stop", async (_req, res) => {

    try {
        res.json(await rotatorService.stop());
    }
    catch (error) {
        res.status(409).json({ error: error instanceof Error ? error.message : String(error) });
    }

});


/* Settings → Rotator → Test, body: the rotator settings to test */
router.post("/test", async (req, res) => {

    const config = normalizeRotator({ ...(req.body ?? {}), enabled: true });
    const active = settingsService.get().rotator;
    const status = rotatorService.getStatus();

    /*
     * The same controller is already in use by SHACK-SERVER (a serial
     * port can only be opened once): report the running connection.
     */
    const sameController =
        active.enabled &&
        active.connection === config.connection &&
        (config.connection === "network"
            ? active.host === config.host && active.port === config.port
            : active.device === config.device);

    if (sameController && status.connected) {
        return res.json({
            ok: true,
            message: `Connected - antenna at ${status.azimuth ?? "?"}°`
        });
    }

    if (config.connection === "serial" && (!config.model || !config.device)) {
        return res.json({ ok: false, message: "Choose the rotator model and the serial port." });
    }

    res.json(await testRotator(config));

});


export default router;
