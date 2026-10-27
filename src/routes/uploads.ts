import { Router } from "express";

import { uploadQueue, type UploadSource } from "../services/upload/upload-queue.service.js";
import { settingsService } from "../services/settings/settings.service.js";


/*
 * /api/uploads - online logbook uploads (QRZ.com, later Club Log, LoTW)
 */

const router = Router();


/* Status per QSO: { [recordId]: { qrz: { status, message, uploaded_at } } } */
router.get("/status", (req, res) => {

    const source: UploadSource =
        req.query.source === "contest" ? "contest" : "qso";

    res.set("Cache-Control", "no-store");
    res.json({
        services: (() => {
            const enabled = uploadQueue.enabledServices();
            return uploadQueue.getUploaders().map(uploader => ({
                id: uploader.id,
                label: uploader.label,
                enabled: enabled.includes(uploader.id)
            }));
        })(),
        status: uploadQueue.getStatusMap(source)
    });

});


/* Counts per service (Settings). */
router.get("/summary", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(uploadQueue.getSummary());

});


/* Retry failed uploads (all or one service). */
router.post("/retry", (req, res) => {

    const service = typeof req.body?.service === "string" ? req.body.service : undefined;

    if (service && !uploadQueue.getUploader(service)) {
        return res.status(400).json({ error: "Unknown service" });
    }

    res.json({ retried: uploadQueue.retryFailed(service as any) });

});


/*
 * Check credentials (Settings → Test).
 * Body: { accountId?, callsign?, apiKey? } - typed key or the saved
 * key of the account.
 */
router.post("/test/:service", async (req, res) => {

    const uploader = uploadQueue.getUploader(String(req.params.service));

    if (!uploader) {
        return res.status(404).json({ ok: false, message: "Unknown service" });
    }

    const credentials: Record<string, string> = {};

    for (const [key, value] of Object.entries(req.body ?? {})) {
        if (typeof value === "string") {
            credentials[key] = value;
        }
    }

    const account =
        settingsService.get().uploads.accounts
            .find(item => item.id === credentials.accountId) ?? null;

    res.json(await uploader.test(account, credentials));

});


/* Queue all QSOs of a contest session (QSO History → UPLOAD SESSION). */
router.post("/contest-session/:id", (req, res) => {

    const sessionId = Number(req.params.id);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({ error: "Invalid session ID" });
    }

    const result = uploadQueue.enqueueContestSession(sessionId);

    if (!result.account) {
        return res.status(409).json({
            error:
                `No logbook account for ${result.callsign || "this session"}. ` +
                "Add it in Settings → Log Uploads."
        });
    }

    if (!result.services.length) {
        return res.status(409).json({
            error: `No online logbook enabled for ${result.account}.`
        });
    }

    res.json(result);

});


export default router;
