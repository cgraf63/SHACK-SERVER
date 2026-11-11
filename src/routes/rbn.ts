import { Router } from "express";

import {
    rbnConnector
} from "../services/rbn/rbn-instance.js";


import {
    heardService
} from "../services/needed/heard.service.js";


const router = Router();


/*
 * GET /api/rbn/status - is the RBN feed alive? (feeds "heard near you")
 *   rbn:   connected, seconds since the last data, lines since the start
 *   heard: stations / reports of the last 15 minutes per source
 */
router.get("/status", (_req, res) => {

    const rbn = rbnConnector.getStatus();
    const heard = heardService.stats();

    res.json({
        rbn: {
            connected: rbn.connected,
            secondsSinceData: rbn.lastData ? Math.round((Date.now() - rbn.lastData) / 1000) : null,
            lines: rbn.lines
        },
        heard: {
            stations: heard.calls,
            reports15min: heard.reports,
            bySource: heard.bySource,
            secondsSinceNewest: heard.newest ? Math.round((Date.now() - heard.newest) / 1000) : null
        }
    });

});


router.get("/", (_req, res) => {

    res.json(
        rbnConnector.getSpots()
    );

});


export default router;
