import express from "express";

import {
    tx5drService
} from "../services/ft8/tx5dr.service.js";


const router =
    express.Router();


router.get(
    "/status",
    (
        req,
        res
    ) => {

        res.json(
            tx5drService.getStatus()
        );

    }
);


router.get(
    "/decodes",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            frames:
                tx5drService.getFrames()

        });

    }
);


export default router;

