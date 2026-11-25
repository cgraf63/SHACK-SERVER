import { Router } from "express";

import { openingsService } from "../services/propagation/openings.service.js";


/*
 * "When can I work it?"
 *
 *   GET /api/when?q=<entity prefix | name | callsign>   prediction
 *   GET /api/when/soon                                  needed entities, next 3 hours
 *   GET /api/when/entities                              list for the search field
 */

const router = Router();

router.get("/", (req, res) => {
    const result = openingsService.predict(String(req.query.q ?? ""));
    if (!result) return res.status(404).json({ error: "Unknown entity or callsign" });
    res.json(result);
});

router.get("/soon", (req, res) => {
    const hours = Math.min(12, Math.max(1, Number(req.query.hours) || 3));
    res.json(openingsService.soon(hours));
});

router.get("/entities", (_req, res) => {
    res.json(openingsService.entities());
});

export default router;
