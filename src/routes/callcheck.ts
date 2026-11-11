import { Router } from "express";

import { callCheckService } from "../services/callcheck/call-check.service.js";


const router = Router();


/*
 * GET /api/callcheck?q=SQ2&khz=14025.0
 *   suggestions while typing a callsign (Manual QSO): spots on the air
 *   (near the transceiver frequency first), own log, watch list, SCP.
 *   khz = frequency typed in the form, used when no transceiver is active.
 */
router.get("/", (req, res) => {

    const khz = Number(req.query.khz);

    try {
        res.set("Cache-Control", "no-store");
        res.json(callCheckService.check(String(req.query.q || ""), Number.isFinite(khz) ? khz : null));
    }
    catch (error) {
        console.error("Call check failed:", error);
        res.status(500).json({ error: "Call check failed" });
    }

});


/* POST /api/callcheck/scp/refresh - download the SCP database now */
router.post("/scp/refresh", async (_req, res) => {

    await callCheckService.refreshScp(true);

    res.json(callCheckService.check("").scp);

});


export default router;
