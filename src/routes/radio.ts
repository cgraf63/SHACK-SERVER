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


router.post(
    "/radio/tune",
    (req, res) => {

        const {
            frequency,
            mode
        } = req.body;


        if (
            typeof frequency !== "number" ||
            !Number.isFinite(frequency)
        ) {

            return res.status(400).json({

                error:
                    "Invalid frequency"

            });

        }


        if (
            typeof mode !== "string"
        ) {

            return res.status(400).json({

                error:
                    "Invalid mode"

            });

        }


        const allowedModes = [
            "LSB",
            "USB",
            "CW",
            "CW-R",
            "AM",
            "FM"
        ];


        const normalizedMode =
            mode.toUpperCase();


        if (
            !allowedModes.includes(
                normalizedMode
            )
        ) {

            return res.status(400).json({

                error:
                    "Unsupported mode"

            });

        }


        console.log(
            "RADIO TUNE:",
            frequency,
            normalizedMode
        );


        catService.setFrequency(
            frequency
        );


        catService.setMode(
            normalizedMode
        );


        return res.json({

            success:
                true,

            frequency:
                frequency,

            mode:
                normalizedMode

        });

    }
);


export default router;
