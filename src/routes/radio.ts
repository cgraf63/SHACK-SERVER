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


            ritXitOffset:

                typeof (activeRadio as any).getRitXitOffset === "function"
                    ? (activeRadio as any).getRitXitOffset()
                    : 0,


            txState:

                typeof (activeRadio as any).getTxState === "function"
                    ? (activeRadio as any).getTxState()
                    : false,




            rxVfo:

                typeof (activeRadio as any).getRxVfo === "function"
                    ? (activeRadio as any).getRxVfo()
                    : 0,


            txVfo:

                typeof (activeRadio as any).getTxVfo === "function"
                    ? (activeRadio as any).getTxVfo()
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

            cwSpeed:
                typeof (activeRadio as any).getCwSpeed === "function"
                    ? (activeRadio as any).getCwSpeed()
                    : 20,

            micGain:
                typeof (activeRadio as any).getMicGain === "function"
                    ? (activeRadio as any).getMicGain()
                    : 50,

            breakIn:
                typeof (activeRadio as any).getBreakIn === "function"
                    ? (activeRadio as any).getBreakIn()
                    : false,

            micEq:
                typeof (activeRadio as any).getMicEq === "function"
                    ? (activeRadio as any).getMicEq()
                    : false,

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


            /*
             * RGO ONE
             */

            preamp:
                typeof (activeRadio as any).getPreamp === "function"
                    ? (activeRadio as any).getPreamp()
                    : false,

            rgoAttenuator:
                typeof (activeRadio as any).getAttenuator === "function"
                    ? (activeRadio as any).getAttenuator()
                    : false,

            rgoNoiseBlanker:
                typeof (activeRadio as any).getNoiseBlanker === "function"
                    ? (activeRadio as any).getNoiseBlanker()
                    : false,

            atuEnabled:
                typeof (activeRadio as any).getAtuEnabled === "function"
                    ? (activeRadio as any).getAtuEnabled()
                    : false,

            atuTuning:
                typeof (activeRadio as any).getAtuTuning === "function"
                    ? (activeRadio as any).getAtuTuning()
                    : false,

            meterFunction:
                typeof (activeRadio as any).getMeterFunction === "function"
                    ? (activeRadio as any).getMeterFunction()
                    : 0,

            meterValue:
                typeof (activeRadio as any).getMeterValue === "function"
                    ? (activeRadio as any).getMeterValue()
                    : 0,

            ritEnabled:
                typeof (activeRadio as any).getRitEnabled === "function"
                    ? (activeRadio as any).getRitEnabled()
                    : false,

            xitEnabled:
                typeof (activeRadio as any).getXitEnabled === "function"
                    ? (activeRadio as any).getXitEnabled()
                    : false,

            fineTuning:
                typeof (activeRadio as any).getFineTuning === "function"
                    ? (activeRadio as any).getFineTuning()
                    : false,

            breakInDelay:
                typeof (activeRadio as any).getBreakInDelay === "function"
                    ? (activeRadio as any).getBreakInDelay()
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

            split:

                typeof (activeRadio as any).getSplit === "function"
                    ? (activeRadio as any).getSplit()
                    : false,

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

                typeof (activeRadio as any).isConnected === "function"
                    ? (activeRadio as any).isConnected()
                    : false,

            poweredOn:

                typeof (activeRadio as any).getPowerState === "function"
                    ? (activeRadio as any).getPowerState()
                    : false,


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
    TUNE
*/

router.post(
    "/radio/tune-start",
    async (req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {

            return res.status(503).json({

                error:
                    "No active radio"

            });

        }

        if (
            typeof (activeRadio as any).tune !== "function"
        ) {

            return res.status(400).json({

                error:
                    "TUNE not supported by active radio"

            });

        }

        try {

            const tuned =
                await (activeRadio as any).tune();

            if (!tuned) {

                return res.status(500).json({

                    error:
                        "Tuning failed"

                });

            }

            res.json({

                success: true,
                tune: true

            });

        } catch (error) {

            console.error(
                "RADIO TUNE:",
                error
            );

            res.status(500).json({

                error:
                    "Tuning failed"

            });

        }

    }
);


/*
    MONITOR
*/

router.post(
    "/radio/monitor",
    (req, res) => {

        const {
            level
        } = req.body;

        if (
            typeof level !== "number" ||
            !Number.isFinite(level)
        ) {

            return res.status(400).json({

                error:
                    "Invalid MONI level"

            });

        }

        const monitorLevel =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(level)
                )
            );

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {

            return res.status(503).json({

                error:
                    "No active radio"

            });

        }

        if (
            typeof (activeRadio as any).monitor !== "function"
        ) {

            return res.status(400).json({

                error:
                    "MONI not supported by active radio"

            });

        }

        (activeRadio as any).monitor(
            monitorLevel
        );

        res.json({

            success: true,
            monitor: monitorLevel

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
    BAND SELECT
*/

router.post(
    "/radio/band",
    (req, res) => {

        const { band, vfo } = req.body;

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        if (
            typeof (activeRadio as any).setBand !==
            "function"
        ) {
            return res.status(501).json({
                error: "BAND control not supported"
            });
        }

        const allowedBands = [
            "00", // 160 m
            "01", // 80 m
            "02", // 60 m
            "03", // 40 m
            "04", // 30 m
            "05", // 20 m
            "06", // 17 m
            "07", // 15 m
            "08", // 12 m
            "09", // 10 m
            "10", // 6 m
            "11", // GEN
            "12"  // MW
        ];

        if (
            typeof band !== "string" ||
            !allowedBands.includes(band)
        ) {
            return res.status(400).json({
                error: "Invalid band"
            });
        }

        if (vfo !== "A" && vfo !== "B") {
            return res.status(400).json({
                error: "Invalid VFO"
            });
        }

        try {

            (activeRadio as any).setBand(band, vfo);

            console.log(
                "RADIO BAND:",
                radioManager.getActiveRadioId(),
                band
            );

            return res.json({
                success: true,
                band
            });

        } catch (error) {

            console.error(
                "RADIO BAND error:",
                error
            );

            return res.status(500).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "BAND selection failed"
            });
        }
    }
);


/*
    VFO receiver controls
    ATT / IPO / Roofing Filter / AGC
*/

router.post(
    "/radio/dsp-control",
    (req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        const { control, value } = req.body;

        try {

            switch (control) {

                case "notch":

                    if (
                        typeof (activeRadio as any).setNotch !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "NOTCH control not supported"
                        });
                    }

                    (activeRadio as any).setNotch(
                        Boolean(value),
                        (activeRadio as any).getNotchFrequency()
                    );

                    break;


                case "notchFrequency":

                    if (
                        typeof (activeRadio as any).setNotchFrequency !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "NOTCH frequency control not supported"
                        });
                    }

                    (activeRadio as any).setNotchFrequency(
                        Number(value)
                    );

                    break;


                case "contour":

                    if (
                        typeof (activeRadio as any).setContour !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "CONTOUR control not supported"
                        });
                    }

                    (activeRadio as any).setContour(
                        Boolean(value),
                        (activeRadio as any).getContourFrequency()
                    );

                    break;


                case "contourFrequency":

                    if (
                        typeof (activeRadio as any).setContourFrequency !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "CONTOUR frequency control not supported"
                        });
                    }

                    (activeRadio as any).setContourFrequency(
                        Number(value)
                    );

                    break;


                case "dnr":

                    if (
                        typeof (activeRadio as any).setDnr !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "DNR control not supported"
                        });
                    }

                    (activeRadio as any).setDnr(
                        Boolean(value)
                    );

                    break;


                case "dnrLevel":

                    if (
                        typeof (activeRadio as any).setDnrLevel !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "DNR level control not supported"
                        });
                    }

                    if (
                        !Number.isInteger(Number(value)) ||
                        Number(value) < 1 ||
                        Number(value) > 15
                    ) {
                        return res.status(400).json({
                            error: "Invalid DNR level"
                        });
                    }

                    (activeRadio as any).setDnrLevel(
                        Number(value)
                    );

                    break;


                case "nb":

                    if (
                        typeof (activeRadio as any).setNb !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "NB control not supported"
                        });
                    }

                    (activeRadio as any).setNb(
                        Boolean(value)
                    );

                    break;


                case "nbLevel":

                    if (
                        typeof (activeRadio as any).setNbLevel !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "NB level control not supported"
                        });
                    }

                    if (
                        !Number.isInteger(Number(value)) ||
                        Number(value) < 0 ||
                        Number(value) > 10
                    ) {
                        return res.status(400).json({
                            error: "Invalid NB level"
                        });
                    }

                    (activeRadio as any).setNbLevel(
                        Number(value)
                    );

                    break;


                default:

                    return res.status(400).json({
                        error: "Unknown DSP control"
                    });
            }

            return res.json({
                success: true,
                control,
                value
            });

        } catch (error) {

            console.error(
                "RADIO DSP error:",
                error
            );

            return res.status(500).json({
                error: "DSP control failed"
            });
        }
    }
);


router.post(
    "/radio/filter-gain",
    (req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        const { control, value } = req.body;

        try {

            switch (control) {

                case "rfGain":

                    if (
                        typeof (activeRadio as any).setRfGain !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "RF GAIN control not supported"
                        });
                    }

                    (activeRadio as any).setRfGain(
                        Number(value)
                    );

                    break;


                case "afGain":

                    if (
                        typeof (activeRadio as any).setAfGain !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "AF GAIN control not supported"
                        });
                    }

                    (activeRadio as any).setAfGain(
                        Number(value)
                    );

                    break;


                case "cwSpeed":

                    if (
                        typeof (activeRadio as any).setCwSpeed !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "CW SPEED control not supported"
                        });
                    }

                    (activeRadio as any).setCwSpeed(
                        Number(value)
                    );

                    break;


                case "micGain":

                    if (
                        typeof (activeRadio as any).setMicGain !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "MIC GAIN control not supported"
                        });
                    }

                    (activeRadio as any).setMicGain(
                        Number(value)
                    );

                    break;


                case "breakIn":

                    if (
                        typeof (activeRadio as any).setBreakIn !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "BK-IN control not supported"
                        });
                    }

                    (activeRadio as any).setBreakIn(
                        Boolean(value)
                    );

                    break;


                case "micEq":

                    if (
                        typeof (activeRadio as any).setMicEq !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "MIC EQ control not supported"
                        });
                    }

                    (activeRadio as any).setMicEq(
                        Boolean(value)
                    );

                    break;


                case "filterWidth":

                    if (
                        typeof (activeRadio as any).setFilterWidth !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "FILTER WIDTH control not supported"
                        });
                    }

                    if (
                        !Number.isInteger(Number(value)) ||
                        Number(value) < 0 ||
                        Number(value) > 23
                    ) {
                        return res.status(400).json({
                            error: "Invalid filter width"
                        });
                    }

                    (activeRadio as any).setFilterWidth(
                        Number(value)
                    );

                    break;


                case "filterShift": {

                    if (
                        typeof (activeRadio as any).setFilterShift !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "FILTER SHIFT control not supported"
                        });
                    }

                    const shift = Number(value);

                    if (
                        !Number.isFinite(shift) ||
                        shift < -1200 ||
                        shift > 1200
                    ) {
                        return res.status(400).json({
                            error: "Invalid filter shift"
                        });
                    }

                    (activeRadio as any).setFilterShift(
                        shift
                    );

                    break;
                }


                default:

                    return res.status(400).json({
                        error: "Unknown filter/gain control"
                    });
            }

            return res.json({
                success: true,
                control,
                value
            });

        } catch (error) {

            console.error(
                "RADIO FILTER/GAIN error:",
                error
            );

            return res.status(500).json({
                error: "Filter/gain control failed"
            });
        }
    }
);


router.post(
    "/radio/vfo-control",
    (req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        const { control, value } = req.body;

        try {

            switch (control) {

                case "ritXit": {

                    if (
                        typeof (activeRadio as any).setRit !==
                        "function" ||
                        typeof (activeRadio as any).setXit !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "RIT/XIT control not supported"
                        });
                    }

                    const mode =
                        Number(value);

                    if (
                        !Number.isInteger(mode) ||
                        mode < 0 ||
                        mode > 3
                    ) {
                        return res.status(400).json({
                            error: "Invalid RIT/XIT mode"
                        });
                    }

                    /*
                     * 0 = OFF
                     * 1 = RIT
                     * 2 = XIT
                     * 3 = RIT + XIT
                     */

                    (activeRadio as any).setRit(
                        mode === 1 ||
                        mode === 3
                    );

                    (activeRadio as any).setXit(
                        mode === 2 ||
                        mode === 3
                    );

                    break;
                }


                case "bandUp": {

            if (
                typeof (activeRadio as any).bandUp !==
                "function"
            ) {
                return res.status(501).json({
                    error: "Band Up control not supported"
                });
            }

            (activeRadio as any).bandUp();

            break;
        }


        case "bandDown": {

            if (
                typeof (activeRadio as any).bandDown !==
                "function"
            ) {
                return res.status(501).json({
                    error: "Band Down control not supported"
                });
            }

            (activeRadio as any).bandDown();

            break;
        }


        case "ritXitOffset": {

                    if (
                        typeof (activeRadio as any).setRitXitOffset !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "RIT/XIT offset control not supported"
                        });
                    }

                    const offset =
                        Number(value);

                    if (
                        !Number.isFinite(offset) ||
                        offset < -5000 ||
                        offset > 5000
                    ) {
                        return res.status(400).json({
                            error: "Invalid RIT/XIT offset"
                        });
                    }

                    (activeRadio as any).setRitXitOffset(
                        offset
                    );

                    break;
                }


                case "att":

                    if (
                        typeof (activeRadio as any).setAttenuator !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "ATT control not supported"
                        });
                    }

                    if (![0, 1, 2, 3].includes(Number(value))) {
                        return res.status(400).json({
                            error: "Invalid ATT value"
                        });
                    }

                    (activeRadio as any).setAttenuator(
                        Number(value)
                    );

                    break;


                case "ipo":

                    if (
                        typeof (activeRadio as any).setIpo !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "IPO control not supported"
                        });
                    }

                    if (![0, 1, 2].includes(Number(value))) {
                        return res.status(400).json({
                            error: "Invalid IPO value"
                        });
                    }

                    (activeRadio as any).setIpo(
                        Number(value)
                    );

                    break;


                case "roofingFilter":

                    if (
                        typeof (activeRadio as any).setRoofingFilter !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "R.FIL control not supported"
                        });
                    }

                    if (
                        !["9", "7", "6"].includes(
                            String(value)
                        )
                    ) {
                        return res.status(400).json({
                            error: "Invalid roofing filter value"
                        });
                    }

                    (activeRadio as any).setRoofingFilter(
                        String(value)
                    );

                    break;


                case "agc":

                    if (
                        typeof (activeRadio as any).setAgc !==
                        "function"
                    ) {
                        return res.status(501).json({
                            error: "AGC control not supported"
                        });
                    }

                    if (
                        !Number.isInteger(Number(value)) ||
                        Number(value) < 0 ||
                        Number(value) > 6
                    ) {
                        return res.status(400).json({
                            error: "Invalid AGC value"
                        });
                    }

                    (activeRadio as any).setAgc(
                        Number(value)
                    );

                    break;


                default:

                    return res.status(400).json({
                        error: "Unknown VFO control"
                    });
            }

            return res.json({
                success: true,
                control,
                value
            });

        } catch (error) {

            console.error(
                "VFO control error:",
                error
            );

            return res.status(500).json({
                error: "VFO control failed"
            });
        }
    }
);


/*
    Set SPLIT
*/

router.post(
    "/radio/split",
    (req, res) => {

        const { enabled } = req.body;

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        if (typeof enabled !== "boolean") {
            return res.status(400).json({
                error: "Invalid split state"
            });
        }

        if (
            typeof (activeRadio as any).setSplit !== "function"
        ) {
            return res.status(501).json({
                error: "SPLIT control not supported"
            });
        }

        if (enabled) {

            if (
                typeof (activeRadio as any).getFrequency !== "function" ||
                typeof (activeRadio as any).setFrequencyB !== "function" ||
                typeof (activeRadio as any).getMode !== "function" ||
                typeof (activeRadio as any).setMode !== "function"
            ) {
                return res.status(501).json({
                    error: "VFO A/B frequency or mode control not supported"
                });
            }

            const frequencyA =
                (activeRadio as any).getFrequency();

            const modeA =
                (activeRadio as any).getMode();

            if (
                typeof frequencyA !== "number" ||
                !Number.isFinite(frequencyA)
            ) {
                return res.status(500).json({
                    error: "Invalid VFO A frequency"
                });
            }

            if (
                typeof modeA !== "string" ||
                !modeA
            ) {
                return res.status(500).json({
                    error: "Invalid VFO A mode"
                });
            }

            const frequencyB =
                frequencyA + 5000;

            try {

                (activeRadio as any).setFrequencyB(
                    frequencyB
                );

                (activeRadio as any).setMode(
                    modeA,
                    frequencyB
                );

            } catch (error) {

                return res.status(400).json({
                    error:
                        error instanceof Error
                            ? error.message
                            : "Could not prepare VFO B for SPLIT"
                });
            }

            console.log(
                "SPLIT PREPARE:",
                "VFO A", frequencyA,
                modeA,
                "VFO B", frequencyB,
                modeA
            );
        }

        (activeRadio as any).setSplit(enabled);

        console.log(
            "RADIO SPLIT:",
            enabled
        );

        return res.json({
            success: true,
            split: enabled
        });
    }
);


/*
    Set SPLIT TX frequency (VFO B)
*/

router.post(
    "/radio/split-frequency",
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

        if (
            typeof (activeRadio as any).setFrequencyB !== "function"
        ) {
            return res.status(501).json({
                error: "VFO B frequency control not supported"
            });
        }

        try {

            (activeRadio as any).setFrequencyB(
                frequency
            );

        } catch (error) {

            return res.status(400).json({
                error:
                    error instanceof Error
                        ? error.message
                        : "Invalid frequency"
            });
        }

        console.log(
            "SPLIT TX FREQUENCY:",
            frequency
        );

        return res.json({
            success: true,
            frequencyB: frequency
        });
    }
);


/*
    POWER SWITCH
*/

router.post(
    "/radio/power",
    (req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        if (
            typeof (activeRadio as any).setPowerState !== "function"
        ) {
            return res.status(501).json({
                error: "Radio power control not supported"
            });
        }

        const { enabled } = req.body;

        if (typeof enabled !== "boolean") {
            return res.status(400).json({
                error: "Invalid power state"
            });
        }

        (activeRadio as any).setPowerState(enabled);

        return res.json({
            ok: true,
            poweredOn: enabled
        });
    }
);


/*
    SPLIT UP +5 kHz
*/

/*
    SPLIT UP +5 kHz
*/

router.post(
    "/radio/split-up5",
    (_req, res) => {

        const activeRadio =
            radioManager.getActiveRadio();

        if (!activeRadio) {
            return res.status(503).json({
                error: "No active radio"
            });
        }

        if (
            typeof (activeRadio as any).getFrequencyB !== "function" ||
            typeof (activeRadio as any).setFrequencyB !== "function"
        ) {
            return res.status(501).json({
                error: "VFO B frequency control not supported"
            });
        }

        const currentFrequency =
            (activeRadio as any).getFrequencyB();

        if (
            typeof currentFrequency !== "number" ||
            !Number.isFinite(currentFrequency)
        ) {
            return res.status(500).json({
                error: "Invalid VFO B frequency"
            });
        }

        const newFrequency =
            currentFrequency + 5000;

        (activeRadio as any).setFrequencyB(
            newFrequency
        );

        console.log(
            "SPLIT UP +5:",
            currentFrequency,
            "->",
            newFrequency
        );

        return res.json({
            success: true,
            frequencyB: newFrequency
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
