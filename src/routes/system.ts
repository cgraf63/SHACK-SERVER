import express from "express";

import { updateService } from "../services/system/update.service.js";

const router =
    express.Router();


router.post(
    "/shutdown",
    (_req, res) => {

        console.log(
            "Shutdown requested from web interface"
        );

        res.json({
            success: true,
            message:
                "SHACK-SERVER shutdown initiated"
        });


        setTimeout(
            () => {

                console.log(
                    "SHACK-SERVER shutting down..."
                );

                process.exit(0);

            },
            500
        );

    }
);


/*
    Software update (Settings -> Software update)
      GET  /api/system/update        installed version, new commits, last run
      POST /api/system/update/check  git fetch
      POST /api/system/update/run    scripts/install.sh --update (restarts)
*/
router.get(
    "/update",
    async (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json(await updateService.getStatus());
    }
);

router.post(
    "/update/check",
    async (_req, res) => {
        await updateService.check();
        res.json(await updateService.getStatus());
    }
);

router.post(
    "/update/run",
    (_req, res) => {
        const result = updateService.run();
        res.status(result.ok ? 202 : 409).json(result);
    }
);


export default router;
