import { Router } from "express";

import { settingsService } from "../services/settings/settings.service.js";
import { uploadQueue } from "../services/upload/upload-queue.service.js";
import { deleteCertificate, getCertInfo, importP12 } from "../services/lotw/lotw-cert.js";
import { lotwDownload } from "../services/lotw/lotw-download.service.js";
import { qsoService } from "../services/qso/qso-instance.js";


/*
 * /api/lotw - ARRL Logbook of the World
 *
 *   GET    /status                       certificates, confirmation state, counts
 *   POST   /certificate                  { accountId, p12 (base64), password }
 *   DELETE /certificate/:accountId
 *   POST   /download                     { accountId, full? }  fetch confirmations now
 *   POST   /upload-existing              { accountId }  queue the existing log
 *
 * The account (callsign) must be saved in Settings → Log Uploads first.
 */

const router = Router();


function account(id: unknown) {

    return settingsService.get().uploads.accounts.find(a => a.id === id) ?? null;

}


router.get("/status", (_req, res) => {

    const state = lotwDownload.getState();

    res.set("Cache-Control", "no-store");
    res.json({
        confirmed: qsoService.countLotwConfirmed(),
        accounts: settingsService.get().uploads.accounts.map(a => ({
            id: a.id,
            callsign: a.callsign,
            certificate: getCertInfo(a.id),
            download: state[a.id] ?? null
        }))
    });

});


router.post("/certificate", async (req, res) => {

    const target = account(req.body?.accountId);

    if (!target) {
        return res.status(400).json({ error: "Save the logbook account (callsign) first, then add the certificate" });
    }

    const data = String(req.body?.p12 ?? "").replace(/^data:[^,]*,/, "");

    if (!data) {
        return res.status(400).json({ error: "No certificate file" });
    }

    try {

        const info = await importP12(target.id, Buffer.from(data, "base64"), String(req.body?.password ?? ""));

        const own = target.callsign.split("/")[0];
        const warning = info.callsign !== target.callsign && !target.aliases.includes(info.callsign) && info.callsign.split("/")[0] !== own
            ? `Note: the certificate is for ${info.callsign}, the account is ${target.callsign}`
            : "";

        return res.json({ success: true, certificate: info, warning });

    }
    catch (error) {

        return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });

    }

});


router.delete("/certificate/:accountId", (req, res) => {

    const target = account(req.params.accountId);

    if (!target) return res.status(404).json({ error: "Unknown account" });

    deleteCertificate(target.id);

    res.json({ success: true });

});


router.post("/download", async (req, res) => {

    const target = account(req.body?.accountId);

    if (!target) return res.status(404).json({ error: "Unknown account" });

    try {
        const result = await lotwDownload.run(target.id, req.body?.full === true);
        res.json({ success: result.ok, ...result });
    }
    catch (error) {
        res.status(409).json({ error: error instanceof Error ? error.message : String(error) });
    }

});


router.post("/upload-existing", (req, res) => {

    const target = account(req.body?.accountId);

    if (!target) return res.status(404).json({ error: "Unknown account" });

    const cert = getCertInfo(target.id);

    if (!cert) return res.status(400).json({ error: "No certificate for this account" });

    if (!target.lotw.enabled) return res.status(400).json({ error: "Enable LoTW upload for this account first (and save)" });

    const date = (value: string) => {
        const d = String(value || "").replace(/\D/g, "");
        return d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : "";
    };

    const queued = uploadQueue.enqueueExisting("lotw", target.id, qso => {
        const d = date(qso.qso_date);
        return Boolean(d) && (!cert.qsoFirstDate || d >= cert.qsoFirstDate) && (!cert.qsoEndDate || d <= cert.qsoEndDate);
    });

    res.json({ success: true, queued });

});


export default router;
