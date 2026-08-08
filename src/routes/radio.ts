import { Router } from "express";
import { catService } from "../services/radio/cat-instance.js";


const router =
    Router();



router.get(
    "/radio",
    (req, res) => {


        res.json({

            radio:
                "RGO ONE",


            frequency:
                catService.getFrequency(),


            mode:
                catService.getMode(),


            power:
                catService.getPower(),


            connected:
                true

        });


    }
);



export default router;
