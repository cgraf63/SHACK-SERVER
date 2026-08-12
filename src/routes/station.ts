import { Router } from "express";

import {
    SettingsService
} from "../services/settings/settings.service.js";


const router = Router();


const settingsService =
    new SettingsService();


router.get(
    "/",
    (_req, res) => {

        const settings =
            settingsService.get();


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


        res.json({

            station:
                settings.club || "SHACK-SERVER",

            callsign:
                settings.callsign,

            name:
                settings.operatorName,

            club:
                settings.club,

            locator:
                settings.locator

        });

    }
);


export default router;
