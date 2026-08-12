import { Router } from "express";

import {
    ShackSettings
} from "../config/settings.config.js";

import {
settingsService
} from "../services/settings/settings.service.js";


import {
    fusionEngine
} from "../services/fusion/fusion-instance.js";



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
            settingsService.get()
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

            res.set(
                "Cache-Control",
                "no-store"
            );


            res.json(
                updated
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
