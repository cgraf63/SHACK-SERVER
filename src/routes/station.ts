import { Router } from "express";

import {
    operator
} from "../config/operator.config.js";

import {
    shackLocation
} from "../config/location.config.js";


const router = Router();


router.get("/", (_req, res) => {

    res.json({

        station: shackLocation.name,

        callsign: operator.callsign,

        name: operator.name,

        club: operator.club,

        locator: shackLocation.locator

    });

});


export default router;
