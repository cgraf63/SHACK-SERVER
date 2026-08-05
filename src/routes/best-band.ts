import { Router } from "express";

import {
    fusionEngine
} from "../services/fusion/fusion-instance.js";


const router = Router();


router.get("/", (_req, res) => {


    const bands =
        fusionEngine.getBandActivity();


    let bestBand = null;
    let bestCount = 0;


    for (const band in bands) {

        if (
                (bands[band] ?? 0) >

            bestCount
        ) {

            bestBand = band;
            bestCount =
    bands[band] ?? 0;

        }

    }


    res.json({

        band:
            bestBand,

        count:
            bestCount

    });


});


export default router;
