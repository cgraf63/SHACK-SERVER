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


            frequencyB:

                typeof (activeRadio as any).getFrequencyB === "function"
                    ? (activeRadio as any).getFrequencyB()
                    : 0,


            mode:

                activeRadio
                    .getMode(),


            power:

                activeRadio
                    .getPower(),


            cwMemories:

                typeof (activeRadio as any).getCwMemories === "function"
                    ? (activeRadio as any).getCwMemories()
                    : [],


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


/*
    CW Memory
*/

router.post(
    "/radio/cw-memory",
    async (req, res) => {

        const {
            memory
        } = req.body;

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {

            return res.status(503).json({
                error: "No active radio"
            });

        }

        if (
            typeof memory !== "number" ||
            !Number.isInteger(memory) ||
            memory < 1 ||
            memory > 5
        ) {

            return res.status(400).json({
                error: "Invalid CW memory"
            });

        }

        if (
            !activeRadio.tune ||
            !activeRadio.playCwMemory
        ) {

            return res.status(400).json({
                error: "Active radio does not support CW memory tuning"
            });

        }

        console.log(
            "RADIO CW MEMORY:",
            radioManager.getActiveRadioId(),
            memory
        );

        try {

            activeRadio.setMode(
                "CW-L",
                activeRadio.getFrequency()
            );

            const tuned =
                await activeRadio.tune();

            if (!tuned) {

                return res.status(500).json({
                    error: "Tuning failed",
                    sent: false
                });

            }

            const sent =
                await activeRadio.playCwMemory(
                    memory
                );

            return res.json({

                success:
                    sent,

                memory:
                    memory,

                mode:
                    "CW-L",

                sent:
                    sent

            });

        }
        catch (error) {

            console.error(
                "CW memory failed:",
                error
            );

            return res.status(500).json({
                error: "CW memory failed",
                sent: false
            });

        }

    }
);


export default router;
