import { Router } from "express";

import { neededNotifier } from "../services/needed/needed-notifier.service.js";


const router = Router();


/* GET /api/needed/recent - last needed alerts (newest first) */
router.get("/recent", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(neededNotifier.getRecent());

});


export default router;
