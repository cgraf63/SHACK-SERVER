import { Router } from "express";

import {
    getSpots
} from "../services/spots/spots.service.js";


const router = Router();


router.get("/", async (_req, res) => {

    const spots = await getSpots();

    res.json(spots);

});


export default router;
