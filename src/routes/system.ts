import express from "express";

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


export default router;
