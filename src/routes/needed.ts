import { Router } from "express";

import { neededNotifier } from "../services/needed/needed-notifier.service.js";
import { pskReporterService } from "../services/needed/pskreporter.service.js";


const router = Router();


/* GET /api/needed/recent - last needed alerts (newest first) */
router.get("/recent", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(neededNotifier.getRecent());

});


/* GET /api/needed/pskreporter - status of the PSK Reporter feed */
router.get("/pskreporter", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(pskReporterService.getStatus());

});


export default router;
