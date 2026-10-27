import { Router } from "express";

import { wsjtxService } from "../services/wsjtx/wsjtx.service.js";


/*
 * /api/wsjtx - WSJT-X / JTDX UDP interface status
 */

const router = Router();

router.get("/status", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(wsjtxService.getStatus());

});

export default router;
