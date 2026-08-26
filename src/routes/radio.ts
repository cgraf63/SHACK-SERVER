import { Router } from "express";

import {
    radioManager
} from "../services/radio/radio-manager.js";


const router =
    Router();


router.get(
    "/radio",
    (req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();


        const activeRadioId =
            radioManager.getActiveRadioId();


        if (!activeRadio) {

            return res.status(503).json({

                error:
                    "No active radio"

            });

        }


        const radios =
            radioManager.getRadios();


        const activeConfig =
            radios.find(
                radio =>
                    radio.id ===
                    activeRadioId
            );


        res.json({

            radio:
                activeConfig?.name
                ?? "Unknown",

            activeRadioId:

                activeRadioId,


            frequency:

                activeRadio
                    .getFrequency(),


            mode:

                activeRadio
                    .getMode(),


            power:

                activeRadio
                    .getPower(),


            connected:

                true,


            radios:

                radios

        });

    }
);


/*
    Select active radio
*/

router.post(
    "/radio/active",
    (req, res) => {

        const {
            radioId
        } = req.body;


        if (
            typeof radioId !== "string"
        ) {

            return res.status(400).json({

                error:
                    "Invalid radio ID"

            });

        }


        const success =
            radioManager.setActiveRadio(
                radioId
            );


        if (!success) {

            return res.status(404).json({

                error:
                    "Radio not found"

            });

        }


        console.log(
            "ACTIVE RADIO:",
            radioId
        );


        return res.json({

            success:
                true,

            activeRadioId:
                radioId

        });

    }
);


/*
    Tune active radio
*/

router.post(
    "/radio/tune",
    (req, res) => {

        const {
            frequency,
            mode
        } = req.body;


        const activeRadio =
            radioManager.getActiveRadio();


        if (!activeRadio) {

            return res.status(503).json({

                error:
                    "No active radio"

            });

        }


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
            "SSB",
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
            radioManager.getActiveRadioId(),
            frequency,
            normalizedMode
        );


        activeRadio.setFrequency(
    frequency
);


activeRadio.setMode(
    normalizedMode,
    frequency
);


        return res.json({

            success:
                true,

            radioId:
                radioManager
                    .getActiveRadioId(),

            frequency:
                frequency,

            mode:
                normalizedMode

        });

    }
);


export default router;
