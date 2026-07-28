import { Router } from "express";

import {
    getPropagation
} from "../services/propagation/propagation.service.js";


const router = Router();


router.get("/", async (_req,res)=>{

    const data = await getPropagation();

    res.json(data);

});


export default router;
