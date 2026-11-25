import { Router } from "express";

import { beaconService } from "../services/beacon/beacon.service.js";


/*
 * Beacon monitor (NCDXF / IARU beacons, beacons.html)
 *
 *   GET  /api/beacons?hours=6     state, live trace, results
 *   POST /api/beacons/start       { mode: "band" | "rotate", band: 0-4 }
 *   POST /api/beacons/stop        frequency and mode back
 *   POST /api/beacons/clear       delete the history
 */

const router = Router();

router.get("/", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(beaconService.state(Number(req.query.hours) || 6));
});

router.post("/start", (req, res) => {
    try {
        beaconService.start(req.body?.mode === "band" ? "band" : "rotate", Number(req.body?.band) || 0);
        res.json(beaconService.state());
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

router.post("/stop", (_req, res) => {
    beaconService.stop();
    res.json(beaconService.state());
});

router.post("/clear", (_req, res) => {
    beaconService.clearHistory();
    res.json({ success: true });
});

export default router;
