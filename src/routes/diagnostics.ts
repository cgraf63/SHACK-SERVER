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
