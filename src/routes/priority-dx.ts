import { Router } from "express";

import {
    getPriorityDX
} from "../services/priority/priority-dx.service.js";


const router = Router();


router.get("/", (_req, res) => {

    const spots =
        getPriorityDX();

    res.json(spots);

});


export default router;
