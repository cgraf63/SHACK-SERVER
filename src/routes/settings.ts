import { Router } from "express";
import { QRZService } from "../services/geo/qrz.service.js";
import { publicUploadSettings } from "../services/settings/upload-accounts.js";
import { publicBackup } from "../services/backup/backup-settings.js";
import { publicNotifications } from "../services/notifications/notification-settings.js";

import {
    ShackSettings
} from "../config/settings.config.js";

import {
settingsService
} from "../services/settings/settings.service.js";


import {
    fusionEngine
} from "../services/fusion/fusion-instance.js";


import {
    sourceManager
} from "../services/sources/source-manager-instance.js";

/*
 * Settings as sent to the browser: secrets (logbook API keys,
 * passwords) are removed, only "is set" flags are returned.
 */
function publicSettings(settings: ShackSettings): unknown {

    return {
        ...settings,
        uploads:
            publicUploadSettings(
                settings.uploads,
                settings.callsign
            ),
        backup:
            publicBackup(settings.backup),
        notifications:
            publicNotifications(settings.notifications),
        qrzLookup: {
            username: settings.qrzLookup?.username || "",
            password: "",
            passwordSet: Boolean(settings.qrzLookup?.password),
            fromEnv: !settings.qrzLookup?.username && Boolean(process.env.QRZ_USER && process.env.QRZ_PASSWORD)
        }
    };

}


const router = Router();



router.get(
    "/",
    (_req, res) => {

        res.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate"
        );

        res.set(
            "Pragma",
            "no-cache"
        );

        res.set(
            "Expires",
            "0"
        );


        res.json(
            publicSettings(
                settingsService.get()
            )
        );

    }
);



/* QRZ.com login test (setup assistant): typed or saved credentials */
router.post(
    "/qrz-test",
    async (req, res) => {

        const saved = settingsService.get().qrzLookup;
        const username = String(req.body?.username || saved?.username || process.env.QRZ_USER || "").trim();
        const password = String(req.body?.password || (username === saved?.username ? saved?.password : "") || (username === process.env.QRZ_USER ? process.env.QRZ_PASSWORD : "") || "");

        if (!username || !password) {
            return res.json({ ok: false, message: "Enter user name and password" });
        }

        res.json(await new QRZService().testLogin(username, password));

    }
);


router.put(
    "/",
    (req, res) => {

        try {

            const settings =
                req.body as ShackSettings;


            if (
                !settings ||
                typeof settings !== "object"
            ) {

                res.status(400).json({

                    error:
                        "Invalid settings"

                });

                return;

            }


            const updated =
    settingsService.update(
        settings
    );


fusionEngine.refreshShackLocation();


sourceManager.restart();



            res.set(
                "Cache-Control",
                "no-store"
            );


            res.json(
                publicSettings(
                    updated
                )
            );

        }
        catch (error) {

            console.error(
                "Settings update failed:",
                error
            );


            res.status(500).json({

                error:
                    "Failed to update settings"

            });

        }

    }
);



export default router;
