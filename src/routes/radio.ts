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


        console.log("API GAIN:", (activeRadio as any).getRfGain(), (activeRadio as any).getAfGain());

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


            rfGain:
                typeof (activeRadio as any).getRfGain === "function"
                    ? (activeRadio as any).getRfGain()
                    : 0,

            afGain:
                typeof (activeRadio as any).getAfGain === "function"
                    ? (activeRadio as any).getAfGain()
                    : 0,

            filterWidth:
                typeof (activeRadio as any).getFilterWidth === "function"
                    ? (activeRadio as any).getFilterWidth()
                    : 0,

            filterShift:
                typeof (activeRadio as any).getFilterShift === "function"
                    ? (activeRadio as any).getFilterShift()
                    : 0,

            notch:
                typeof (activeRadio as any).getNotch === "function"
                    ? (activeRadio as any).getNotch()
                    : false,

            notchFrequency:
                typeof (activeRadio as any).getNotchFrequency === "function"
                    ? (activeRadio as any).getNotchFrequency()
                    : 0,

            contour:
                typeof (activeRadio as any).getContour === "function"
                    ? (activeRadio as any).getContour()
                    : false,

            contourFrequency:
                typeof (activeRadio as any).getContourFrequency === "function"
                    ? (activeRadio as any).getContourFrequency()
                    : 0,

            dnr:
                typeof (activeRadio as any).getDnr === "function"
                    ? (activeRadio as any).getDnr()
                    : false,

            dnrLevel:
                typeof (activeRadio as any).getDnrLevel === "function"
                    ? (activeRadio as any).getDnrLevel()
                    : 1,

            nb:
                typeof (activeRadio as any).getNb === "function"
                    ? (activeRadio as any).getNb()
                    : false,

            nbLevel:
                typeof (activeRadio as any).getNbLevel === "function"
                    ? (activeRadio as any).getNbLevel()
                    : 0,


            meterS:

                typeof (activeRadio as any).getSMeter === "function"
                    ? (activeRadio as any).getSMeter()
                    : 0,


            meterAlc:

                typeof (activeRadio as any).getMeterAlc === "function"
                    ? (activeRadio as any).getMeterAlc()
                    : 0,


            meterPower:

                typeof (activeRadio as any).getMeterPower === "function"
                    ? (activeRadio as any).getMeterPower()
                    : 0,


            meterSwr:

                typeof (activeRadio as any).getMeterSwr === "function"
                    ? (activeRadio as any).getMeterSwr()
                    : 0,


            activeVfo:

                typeof (activeRadio as any).getActiveVfo === "function"
                    ? (activeRadio as any).getActiveVfo()
                    : "A",

            modeB:

                typeof (activeRadio as any).getModeB === "function"
                    ? (activeRadio as any).getModeB()
                    : "UNKNOWN",


            attenuator:

                typeof (activeRadio as any).getAttenuator === "function"
                    ? (activeRadio as any).getAttenuator()
                    : "---",


            ipo:

                typeof (activeRadio as any).getIpo === "function"
                    ? (activeRadio as any).getIpo()
                    : "---",


            roofingFilter:

                typeof (activeRadio as any).getRoofingFilter === "function"
                    ? (activeRadio as any).getRoofingFilter()
                    : "---",


            agc:

                typeof (activeRadio as any).getAgc === "function"
                    ? (activeRadio as any).getAgc()
                    : "---",


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
    PTT
*/

router.post(
    "/radio/ptt",
    (req, res) => {

        const {
            enabled
        } = req.body;

        if (
            typeof enabled !== "boolean"
        ) {

            return res.status(400).json({

                error:
                    "Invalid PTT state"

            });

        }

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {

            return res.status(503).json({

                error:
                    "No active radio"

            });

        }

        if (
            typeof (activeRadio as any).setPtt !== "function"
        ) {

            return res.status(400).json({

                error:
                    "PTT not supported by active radio"

            });

        }

        (activeRadio as any).setPtt(
            enabled
        );

        res.json({

            success: true,
            ptt: enabled

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
    Select active VFO
*/

router.post(
    "/radio/vfo",
    (req, res) => {

        const { vfo } = req.body;

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        if (vfo !== "A" && vfo !== "B") {
            return res.status(400).json({
                error: "Invalid VFO"
            });
        }

        if (
            typeof (activeRadio as any).setActiveVfo !== "function"
        ) {
            return res.status(501).json({
                error: "VFO selection not supported"
            });
        }

        (activeRadio as any).setActiveVfo(vfo);

        console.log(
            "ACTIVE VFO:",
            vfo
        );

        return res.json({
            success: true,
            activeVfo: vfo
        });
    }
);



/*
    Tune active radio
*/

/*
    Set frequency of active VFO
*/
router.post(
    "/radio/frequency",
    (req, res) => {

        const { frequency } = req.body;

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        if (
            typeof frequency !== "number" ||
            !Number.isFinite(frequency)
        ) {
            return res.status(400).json({
                error: "Invalid frequency"
            });
        }

        const activeVfo =
            typeof (activeRadio as any).getActiveVfo === "function"
                ? (activeRadio as any).getActiveVfo()
                : "A";

        if (activeVfo === "A") {

            if (
                typeof (activeRadio as any).setFrequencyA !== "function"
            ) {
                return res.status(501).json({
                    error: "VFO A frequency control not supported"
                });
            }

            (activeRadio as any).setFrequencyA(frequency);

        } else {

            if (
                typeof (activeRadio as any).setFrequencyB !== "function"
            ) {
                return res.status(501).json({
                    error: "VFO B frequency control not supported"
                });
            }

            (activeRadio as any).setFrequencyB(frequency);
        }

        console.log(
            "RADIO FREQUENCY:",
            activeVfo,
            frequency
        );

        return res.json({
            success: true,
            activeVfo,
            frequency
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
            "CW-L",
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
