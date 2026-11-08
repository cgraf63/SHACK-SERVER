import { Router } from "express";

import { buildDxccTable, type ModeFilter } from "../services/dxcc/dxcc-table.js";


const router = Router();


/* GET /api/dxcc?mode=ALL|CW|PHONE|DIGI - DXCC entities x bands */
router.get("/", (req, res) => {

    const raw = String(req.query.mode || "ALL").toUpperCase();
    const mode: ModeFilter = raw === "CW" || raw === "PHONE" || raw === "DIGI" ? raw : "ALL";

    try {
        res.set("Cache-Control", "no-store");
        res.json(buildDxccTable(mode));
    }
    catch (error) {
        console.error("DXCC table failed:", error);
        res.status(500).json({ error: "DXCC table failed" });
    }

});


export default router;
