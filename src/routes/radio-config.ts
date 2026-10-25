import { Router, Response } from "express";

import { radioManager } from "../services/radio/radio-manager.js";

import {
    ApiResult,
    createRadio,
    deleteRadio,
    listDrivers,
    listHamlibModels,
    listRadios,
    listSerialPorts,
    testRadio,
    updateRadio,
} from "../services/radio/radio-config.api.js";

/*
 * Transceiver configuration (Settings → Transceivers)
 *
 *   GET    /api/radios            configured transceivers + live status
 *   GET    /api/radios/drivers    available CAT drivers
 *   GET    /api/radios/ports      detected serial ports
 *   GET    /api/radios/hamlib-models   Hamlib model list (?refresh=1)
 *   POST   /api/radios            add a transceiver
 *   PUT    /api/radios/:id        change a transceiver
 *   DELETE /api/radios/:id        remove a transceiver
 *   POST   /api/radios/test       connection test (not saved)
 *
 * The logic lives in services/radio/radio-config.api.ts.
 */

const router = Router();

function send(res: Response, result: ApiResult): void {

    res.set("Cache-Control", "no-store");
    res.status(result.status).json(result.body);

}

router.get("/", (_req, res) => {
    send(res, listRadios(radioManager));
});

router.get("/drivers", (_req, res) => {
    send(res, listDrivers());
});

router.get("/ports", (_req, res) => {
    send(res, listSerialPorts(radioManager));
});

router.get("/hamlib-models", async (req, res) => {
    send(res, await listHamlibModels({ refresh: req.query.refresh === "1" }));
});

router.post("/test", async (req, res) => {
    send(res, await testRadio(radioManager, req.body));
});

router.post("/", (req, res) => {
    send(res, createRadio(radioManager, req.body));
});

router.put("/:id", (req, res) => {
    send(res, updateRadio(radioManager, String(req.params.id), req.body));
});

router.delete("/:id", (req, res) => {
    send(res, deleteRadio(radioManager, String(req.params.id)));
});

export default router;
