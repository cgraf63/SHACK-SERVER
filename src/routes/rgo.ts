import { Router } from "express";

import { radioManager } from "../services/radio/radio-manager.js";
import { RgoOneService } from "../services/radio/rgo-one.service.js";


/*
 * RGO ONE remote page (rgo-remote.html): controls of the active
 * transceiver. The state comes from GET /api/radio.
 *
 *   POST /api/rgo/control   { control, value }
 *        power 0-50 · rfGain 0-100 · micGain 0-10 · preamp · att · nb
 *        agc OFF|FAST|SLOW · breakIn 0-1200 ms · cwSpeed 5-45
 *        meter PWR|ALC|SWR|COMP · tune on|off · atu on|off · fine
 *        frequency (Hz, active VFO) · split
 */

const router = Router();

router.post("/control", (req, res) => {

    const radio = radioManager.getActiveRadio();

    if (!(radio instanceof RgoOneService)) {
        return res.status(409).json({ error: "The active transceiver is not the RGO ONE. Select it in the dashboard." });
    }

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
        return res.status(/not connected/i.test(message) ? 503 : 400).json({ error: message });
    }

});

export default router;
