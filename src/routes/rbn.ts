import { Router } from "express";

import {
    rbnConnector
} from "../services/rbn/rbn-instance.js";


const router = Router();


router.get("/", (_req, res) => {

    res.json(
        rbnConnector.getSpots()
    );

});


export default router;
