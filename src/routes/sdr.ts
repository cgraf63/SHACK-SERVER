import { Router } from "express";

import { sdrStatus } from "../services/sdr/sdr-ws.service.js";


const router = Router();


/*
 * GET /api/sdr/status - is the RSP1B running, who uses it?
 *   running, pid, clients (open pages), wantedBy (pages that want it),
 *   sweep (FULL SCAN), autoStopInSeconds (idle stop pending)
 */
router.get("/status", (_req, res) => {

    res.json(sdrStatus());

});


export default router;
