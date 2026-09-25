import { Router } from "express";

import {
    fusionEngine
} from "../services/fusion/fusion-instance.js";

import {
    sourceStatus
} from "../services/sources/source-manager-instance.js";

import {
    systemLog
} from "../services/diagnostics/system-log.service.js";


const router = Router();


router.get(
    "/",
    async (_req, res) => {

        try {

            const spots =
                fusionEngine.getSpots();


            const now =
                Date.now();


            const under10min =
                spots.filter(
                    spot =>
                        now - spot.lastSeen
                        <
                        10 * 60 * 1000
                );


            const under30min =
                spots.filter(
                    spot =>
                        now - spot.lastSeen
                        <
                        30 * 60 * 1000
                );


            const uniqueCalls =
                new Set(
                    spots.map(
                        spot =>
                            spot.call
                    )
                );


            const sources =
                new Set<string>();


            for (
                const spot of spots
            ) {

                for (
                    const source of spot.sources
                ) {

                    sources.add(
                        source
                    );

                }

            }


            const geo =
                fusionEngine.getGeoDiagnostics();


            

      
                
            res.json({

                sources:
                    sourceStatus.getStatus(),


                fusion: {

                    total:
                        spots.length,

                    under10min:
                        under10min.length,

                    under30min:
                        under30min.length,

                    uniqueCalls:
                        uniqueCalls.size,

                    sources:
                        sources.size

                },


                geo: {

                    failed:
                        geo.failed,

                    calls:
                        geo.calls

                },


                logs:
                    systemLog.getLast(20)

            });


        }
        catch (error) {

            console.error(
                "Diagnostics API error:",
                error
            );


            res.status(500).json({

                error:
                    "Diagnostics unavailable"

            });

        }

    }
);


export default router;


/*
 * System diagnosis: runs diagnose.sh --quiet
 * and returns its output lines plus issue count.
 */

import { execFile } from "child_process";

router.get(
    "/system",
    async (_req, res) => {

        execFile(
            "/bin/bash",
            ["/home/admin/SHACK-SERVER/diagnose.sh", "--quiet"],
            { timeout: 30000, maxBuffer: 1024 * 1024 },
            (error, stdout, stderr) => {

                if (error && !stdout) {

                    console.error("diagnose.sh failed:", String(error.message));

                    return res.status(500).json({
                        error: "diagnose.sh failed",
                        detail: String(error.message)
                    });

                }

                const lines =
                    String(stdout || "")
                        .split("\n")
                        .map(line => line.replace(/\x1b\[[0-9;]*m/g, "").trimEnd())
                        .filter(line => line.length > 0);

                const issues =
                    lines.filter(line =>
                        line.includes("WARN") || line.includes("FAIL")
                    ).length;

                res.json({
                    issues,
                    lines,
                    at: new Date().toISOString()
                });

            }
        );

    }
);


router.get(
    "/system",
    async (_req, res) => {

        execFile(
            "/bin/bash",
            ["/home/admin/SHACK-SERVER/diagnose.sh", "--quiet"],
            { timeout: 30000, maxBuffer: 1024 * 1024 },
            (error, stdout) => {

                if (error && !stdout) {

                    return res.status(500).json({
                        error: "diagnose.sh failed",
                        detail: String(error.message)
                    });

                }

                const lines =
                    String(stdout || "")
                        .split("\n")
                        .map(line => line.replace(/\x1b\[[0-9;]*m/g, "").trimEnd())
                        .filter(line => line.length > 0);

                const issues =
                    lines.filter(line =>
                        line.includes("WARN") || line.includes("FAIL")
                    ).length;

                res.json({
                    issues,
                    lines,
                    at: new Date().toISOString()
                });

            }
        );

    }
);
