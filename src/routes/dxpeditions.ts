import { Router } from "express";

import { dxpeditionService } from "../services/dxpeditions/dxpedition.service.js";


const router = Router();


/* GET /api/dxpeditions[?refresh=1] - current and upcoming DXpeditions (NG3K ADXO) */
router.get("/", async (req, res) => {

    if (req.query.refresh === "1") {
        await dxpeditionService.refreshIfAllowed();
    }

    res.set("Cache-Control", "no-store");
    res.json(dxpeditionService.get());

});


export default router;
