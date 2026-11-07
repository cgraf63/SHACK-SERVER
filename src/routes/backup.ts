import { Router } from "express";

import { backupService } from "../services/backup/backup.service.js";
import { normalizeBackup } from "../services/backup/backup-settings.js";
import { settingsService } from "../services/settings/settings.service.js";


const router = Router();


/* GET /api/backup/status */
router.get("/status", (_req, res) => {

    res.set("Cache-Control", "no-store");
    res.json(backupService.getStatus());

});


/* POST /api/backup/run - backup now (waits until it is done) */
router.post("/run", async (_req, res) => {

    res.json(await backupService.runBackup());

});


/*
 * POST /api/backup/test {target: "rclone" | "smb", backup: {...form}}
 * Uses the values of the form; an empty password = the saved one.
 */
router.post("/test", async (req, res) => {

    const target = req.body?.target === "smb" ? "smb" : "rclone";
    const settings = normalizeBackup(req.body?.backup ?? {}, settingsService.get().backup);

    res.json(await backupService.test(settings, target));

});


export default router;
