import { Router } from "express";
import { watchlistService } from "../services/watchlist/watchlist.service.js";

const router = Router();

/*
    Get watchlist
*/

router.get(
    "/",
    (req, res) => {

        try {

            const watchlist =
                watchlistService.getAll();

            return res.json(watchlist);

        } catch (error) {

            console.error(
                "Failed to load watchlist:",
                error
            );

            return res.status(500).json({
                error: "Failed to load watchlist"
            });

        }

    }
);


/*
    Add callsign
*/

router.post(
    "/",
    (req, res) => {

        try {

            const {
                callsign
            } = req.body;


            if (
                typeof callsign !== "string" ||
                !callsign.trim()
            ) {

                return res.status(400).json({
                    error: "Invalid callsign"
                });

            }


            const entry =
                watchlistService.add(
                    callsign
                );


            if (!entry) {

                return res.status(400).json({
                    error: "Invalid callsign"
                });

            }


            return res.status(201).json(entry);

        } catch (error) {

            console.error(
                "Failed to add watchlist entry:",
                error
            );

            return res.status(500).json({
                error: "Failed to add watchlist entry"
            });

        }

    }
);


/*
    Remove callsign
*/

router.delete(
    "/:callsign",
    (req, res) => {

        try {

            const {
                callsign
            } = req.params;


            if (
                typeof callsign !== "string" ||
                !callsign.trim()
            ) {

                return res.status(400).json({
                    error: "Invalid callsign"
                });

            }


            const removed =
                watchlistService.remove(
                    callsign
                );


            return res.json({
                success: removed
            });

        } catch (error) {

            console.error(
                "Failed to remove watchlist entry:",
                error
            );

            return res.status(500).json({
                error: "Failed to remove watchlist entry"
            });

        }

    }
);


export default router;
