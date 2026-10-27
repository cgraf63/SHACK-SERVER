import { Router } from "express";
import { publicUploadSettings } from "../services/settings/upload-accounts.js";

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
            )
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
