import { Router } from "express";

import {
    getSpots
} from "../services/spots/spots.service.js";

import {
    heardService
} from "../services/needed/heard.service.js";

import {
    dxccService
} from "../services/dxcc/dxcc.service.js";


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
            const entity = dxccService.resolve(spot.call);

            return {
                ...spot,
                ...(entity ? { dxccKey: entity.key, dxccName: entity.name } : {}),
                ...(heard.spotterCount ? { heard } : {})
            };

        })
    );

});


export default router;
