import express, { Router } from "express";

import { voiceKeyer } from "../services/audio/voice-keyer.service.js";


/*
 * Voice keyer
 *
 *   GET    /api/voice                    messages + state
 *   POST   /api/voice/play   { slot, repeat }   transmit (repeat = seconds, 0 = once)
 *   POST   /api/voice/stop
 *   PUT    /api/voice/:slot?rate=48000&label=CQ   body: PCM S16_LE mono
 *   PATCH  /api/voice/:slot  { label }
 *   DELETE /api/voice/:slot
 *   GET    /api/voice/:slot/audio        WAV
 */

const router = Router();

const fail = (res: express.Response, error: unknown, status = 400) =>
    res.status(status).json({ error: error instanceof Error ? error.message : String(error) });

router.get("/", (_req, res) => {
    res.json(voiceKeyer.state());
});

router.post("/play", (req, res) => {
    try {
        voiceKeyer.play(Number(req.body?.slot), Number(req.body?.repeat) || 0);
        res.json(voiceKeyer.state());
    }
    catch (error) {
        fail(res, error, 409);
    }
});

router.post("/stop", (_req, res) => {
    voiceKeyer.stop();
    res.json(voiceKeyer.state());
});

router.put(
    "/:slot",
    express.raw({ type: "application/octet-stream", limit: "8mb" }),
    (req, res) => {
        try {
            if (!Buffer.isBuffer(req.body)) throw new Error("Send the audio as application/octet-stream");
            const label = typeof req.query.label === "string" ? req.query.label : undefined;
            voiceKeyer.store(Number(req.params.slot), req.body, Number(req.query.rate), label);
            res.json(voiceKeyer.state());
        }
        catch (error) {
            fail(res, error);
        }
    }
);

router.patch("/:slot", (req, res) => {
    try {
        voiceKeyer.setLabel(Number(req.params.slot), String(req.body?.label ?? ""));
        res.json(voiceKeyer.state());
    }
    catch (error) {
        fail(res, error);
    }
});

router.delete("/:slot", (req, res) => {
    try {
        voiceKeyer.remove(Number(req.params.slot));
        res.json(voiceKeyer.state());
    }
    catch (error) {
        fail(res, error);
    }
});

router.get("/:slot/audio", (req, res) => {
    try {
        const wav = voiceKeyer.wav(Number(req.params.slot));
        if (!wav) return res.status(404).json({ error: "Not recorded" });
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Cache-Control", "no-store");
        res.send(wav);
    }
    catch (error) {
        fail(res, error);
    }
});

export default router;
