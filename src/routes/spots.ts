import { Router } from "express";

import {
    getSpots
} from "../services/spots/spots.service.js";

import {
    heardService
} from "../services/needed/heard.service.js";


const router = Router();


/*
 * Spots with "heard near you" information:
 *   heard: { nearby, nearbyCount, spotterCount, bestSnr, continents, rbn }
 */
router.get("/", async (_req, res) => {

    const spots = await getSpots();

    res.json(
        (Array.isArray(spots) ? spots : []).map((spot: any) => {

            if (!spot?.call) return spot;

            const heard = heardService.evaluate(spot.call, spot.band ?? "");

            return heard.spotterCount ? { ...spot, heard } : spot;

        })
    );

});


export default router;
