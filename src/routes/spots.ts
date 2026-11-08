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

import {
    splitFromComments
} from "../services/fusion/split-parser.js";


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

            // "UP 2", "QSX 14025" ... in the comments: TX frequency for split
            const split = splitFromComments(spot.comments ?? (spot.comment ? [spot.comment] : []), Number(spot.frequency), String(spot.mode ?? ""));

            return {
                ...spot,
                ...(entity ? { dxccKey: entity.key, dxccName: entity.name } : {}),
                ...(split ? { split } : {}),
                ...(heard.spotterCount ? { heard } : {})
            };

        })
    );

});


export default router;
