import { Router } from "express";

import { cwService } from "../services/cw/cw.service.js";


/*
 * CW line of the dashboard
 *
 *   GET  /api/cw?since=n       decoder state (+ text decoded after n)
 *   POST /api/cw/clear         clear the decoded text
 *   POST /api/cw/decoder       { running }  START / STOP of the decoder
 *   POST /api/cw/send          { text }   text -> CW (active transceiver)
 *   POST /api/cw/stop          stop sending
 */

const router = Router();

router.get("/", (req, res) => {
    const since = req.query.since !== undefined ? Number(req.query.since) : undefined;
    res.set("Cache-Control", "no-store");
    res.json(cwService.state(since));
});

router.post("/decoder", (req, res) => {
    cwService.setRunning(req.body?.running !== false);
    res.json(cwService.state());
});

router.post("/clear", (_req, res) => {
    cwService.clear();
    res.json({ success: true });
});

router.post("/send", async (req, res) => {
    try {
        const result = await cwService.send(String(req.body?.text ?? ""));
        res.json({ success: true, ...result });
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

router.post("/stop", async (_req, res) => {
    try {
        await cwService.stop();
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
