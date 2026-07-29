import express from "express";

import { fusionEngine }
from "../services/fusion/fusion-instance.js";


const router =
    express.Router();



router.get(
    "/",
    (req,res)=>{


        res.json(
            fusionEngine.getSpots()
        );


    }
);



export default router;
