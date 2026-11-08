import { Router } from "express";
import { watchlistService } from "../services/watchlist/watchlist.service.js";
import { watchNotifier } from "../services/notifications/watch-notifier.service.js";
import { normalizeNotifications } from "../services/notifications/notification-settings.js";
import { settingsService } from "../services/settings/settings.service.js";

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
                callsign,
                push
            } = req.body ?? {};


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
                    callsign,
                    push !== false
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
    Push notifications: status (last push, recent detections) and test
    with the values of the settings form (token: saved one if empty)
*/

router.get(
    "/notifications/status",
    (_req, res) => {

        res.set("Cache-Control", "no-store");
        res.json(watchNotifier.getStatus());

    }
);

router.post(
    "/notifications/test",
    async (req, res) => {

        const settings =
            normalizeNotifications(
                req.body?.notifications ?? {},
                settingsService.get().notifications
            );

        res.json(await watchNotifier.test(settings));

    }
);


/*
    Push on / off for one callsign: PATCH /:callsign {push: true|false}
*/

router.patch(
    "/:callsign",
    (req, res) => {

        if (typeof req.body?.push !== "boolean") {
            return res.status(400).json({ error: "push must be true or false" });
        }

        const entry =
            watchlistService.setPush(
                String(req.params.callsign),
                req.body.push
            );

        if (!entry) {
            return res.status(404).json({ error: "Callsign not in the watch list" });
        }

        return res.json(entry);

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
