import { Router, Request, Response } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
    contestService,
    ContestDefinition
} from "../services/contest/contest.service.js";


const router = Router();

/* Contest-only read access to the local CTY database. */
router.get("/cty.dat", async (_req, res) => {
    try {
        const file = path.resolve(process.cwd(), "data", "cty.dat");
        const content = await readFile(file, "utf8");
        res.type("text/plain; charset=utf-8").send(content);
    } catch (error) {
        console.error("Contest CTY data unavailable:", error);
        res.status(500).json({ error: "Contest CTY data unavailable" });
    }
});


function parseId(
    value: unknown
): number | null {

    if (typeof value !== "string") {

        return null;

    }


    const id =
        Number.parseInt(
            value,
            10
        );


    if (!Number.isInteger(id) || id <= 0) {

        return null;

    }


    return id;

}


function validateContestControlKey(
    req: Request
): boolean {

    const configuredKey =
        process.env.CONTEST_CONTROL_KEY;

    if (!configuredKey) {
        return false;
    }

    const providedKey =
        req.body?.control_key;

    return (
        typeof providedKey === "string" &&
        providedKey === configuredKey
    );

}


function validateDefinition(
    body: any
): string | null {

    if (
        !body ||
        typeof body.name !== "string" ||
        !body.name.trim()
    ) {

        return "name is required";

    }


    if (
        typeof body.short_name !== "string" ||
        !body.short_name.trim()
    ) {

        return "short_name is required";

    }


    if (
        body.version !== undefined &&
        typeof body.version !== "string"
    ) {

        return "version must be a string";

    }


    if (
        body.description !== undefined &&
        body.description !== null &&
        typeof body.description !== "string"
    ) {

        return "description must be a string";

    }


    if (
        body.rules_json !== undefined &&
        typeof body.rules_json !== "string"
    ) {

        return "rules_json must be a string";

    }


    if (
        body.enabled !== undefined &&
        typeof body.enabled !== "boolean"
    ) {

        return "enabled must be a boolean";

    }


    return null;

}


/*
 * GET /api/contests/definitions
 */
router.get(
    "/definitions",
    (
        _req: Request,
        res: Response
    ) => {

        try {

            res.json(
                contestService.getAll()
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest definitions:",
                error
            );


            res.status(500).json({

                error:
                    "Failed to load contest definitions"

            });

        }

    }
);


/*
 * PUT /api/contests/qso/:id
 *
 * Update an existing contest QSO.
 *
 * The session assignment remains unchanged.
 */
router.put(
    "/qso/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest QSO ID"

            });

        }


        const {
            qso_date,
            time_on_utc,
            frequency,
            band,
            mode,
            call,
            rst_sent,
            rst_rcvd,
            exchange_sent,
            exchange_received,
            operator,
            station_callsign
        } = req.body;


        if (
            typeof qso_date !== "string" ||
            typeof time_on_utc !== "string" ||
            typeof frequency !== "number" ||
            typeof band !== "string" ||
            typeof mode !== "string" ||
            typeof call !== "string" ||
            typeof rst_sent !== "string" ||
            typeof rst_rcvd !== "string" ||
            typeof exchange_sent !== "string" ||
            typeof exchange_received !== "string" ||
            typeof operator !== "string" ||
            typeof station_callsign !== "string"
        ) {

            return res.status(400).json({

                error:
                    "Invalid contest QSO data"

            });

        }


        try {

            const qso =
                contestService.updateContestQso(
                    id,
                    {
                        session_id: 0,
                        qso_date,
                        time_on_utc,
                        frequency,
                        band,
                        mode,
                        call,
                        rst_sent,
                        rst_rcvd,
                        exchange_sent,
                        exchange_received,
                        operator,
                        station_callsign
                    }
                );


            if (!qso) {

                return res.status(404).json({

                    error:
                        "Contest QSO not found"

                });

            }


            return res.json(
                qso
            );

        }
        catch (error) {

            console.error(
                "Failed to update contest QSO:",
                error
            );


            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update contest QSO";


            if (
                message ===
                "Duplicate contest QSO"
            ) {

                return res.status(409).json({

                    error:
                        message

                });

            }


            if (
                message ===
                "Required contest QSO fields are missing"
            ) {

                return res.status(400).json({

                    error:
                        message

                });

            }


            return res.status(500).json({

                error:
                    "Failed to update contest QSO"

            });

        }

    }
);


/*
 * DELETE /api/contests/qso/:id
 *
 * Delete an existing contest QSO.
 */
router.delete(
    "/qso/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest QSO ID"

            });

        }


        try {

            const deleted =
                contestService.deleteContestQso(
                    id
                );


            if (!deleted) {

                return res.status(404).json({

                    error:
                        "Contest QSO not found"

                });

            }


            return res.json({

                success:
                    true

            });

        }
        catch (error) {

            console.error(
                "Failed to delete contest QSO:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to delete contest QSO"

            });

        }

    }
);


/*
 * GET /api/contests/qso-history
 *
 * Return all contest QSOs across all sessions,
 * including contest definition information.
 */
router.get(
    "/qso-history",
    (
        _req: Request,
        res: Response
    ) => {

        try {

            return res.json(
                contestService.getContestQsoHistory()
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest QSO history:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to load contest QSO history"
            });

        }

    }
);


/*
 * GET /api/contests/definitions/:id
 */
router.get(
    "/definitions/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest definition ID"

            });

        }


        try {

            const definition =
                contestService.getById(
                    id
                );


            if (!definition) {

                return res.status(404).json({

                    error:
                        "Contest definition not found"

                });

            }


            return res.json(
                definition
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest definition:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to load contest definition"

            });

        }

    }
);


/*
 * POST /api/contests/definitions
 */
router.post(
    "/definitions",
    (
        req: Request,
        res: Response
    ) => {

        const validationError =
            validateDefinition(
                req.body
            );


        if (validationError) {

            return res.status(400).json({

                error:
                    validationError

            });

        }


        try {

            const definition: ContestDefinition = {

                name:
                    req.body.name,

                short_name:
                    req.body.short_name,

                version:
                    typeof req.body.version === "string"
                        ? req.body.version
                        : "1",

                description:
                    req.body.description ?? null,

                rules_json:
                    typeof req.body.rules_json === "string"
                        ? req.body.rules_json
                        : "{}",

                enabled:
                    req.body.enabled !== false

            };


            const created =
                contestService.create(
                    definition
                );


            return res
                .status(201)
                .json(
                    created
                );

        }
        catch (error) {

            console.error(
                "Failed to create contest definition:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to create contest definition"

            });

        }

    }
);


/*
 * PUT /api/contests/definitions/:id
 */
router.put(
    "/definitions/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest definition ID"

            });

        }


        const validationError =
            validateDefinition(
                req.body
            );


        if (validationError) {

            return res.status(400).json({

                error:
                    validationError

            });

        }


        try {

            const definition: ContestDefinition = {

                name:
                    req.body.name,

                short_name:
                    req.body.short_name,

                version:
                    typeof req.body.version === "string"
                        ? req.body.version
                        : "1",

                description:
                    req.body.description ?? null,

                rules_json:
                    typeof req.body.rules_json === "string"
                        ? req.body.rules_json
                        : "{}",

                enabled:
                    req.body.enabled !== false

            };


            const updated =
                contestService.update(
                    id,
                    definition
                );


            if (!updated) {

                return res.status(404).json({

                    error:
                        "Contest definition not found"

                });

            }


            return res.json(
                updated
            );

        }
        catch (error) {

            console.error(
                "Failed to update contest definition:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to update contest definition"

            });

        }

    }
);


/*
 * DELETE /api/contests/definitions/:id
 */
router.delete(
    "/definitions/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest definition ID"

            });

        }


        try {

            const deleted =
                contestService.delete(
                    id
                );


            if (!deleted) {

                return res.status(404).json({

                    error:
                        "Contest definition not found"

                });

            }


            return res.json({

                success:
                    true

            });

        }
        catch (error) {

            console.error(
                "Failed to delete contest definition:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to delete contest definition"

            });

        }

    }
);


/*
 * PATCH /api/contests/definitions/:id/enabled
 */
router.patch(
    "/definitions/:id/enabled",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest definition ID"

            });

        }


        if (
            !req.body ||
            typeof req.body.enabled !== "boolean"
        ) {

            return res.status(400).json({

                error:
                    "enabled must be a boolean"

            });

        }


        try {

            const updated =
                contestService.setEnabled(
                    id,
                    req.body.enabled
                );


            if (!updated) {

                return res.status(404).json({

                    error:
                        "Contest definition not found"

                });

            }


            return res.json(
                updated
            );

        }
        catch (error) {

            console.error(
                "Failed to update contest definition status:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to update contest definition status"

            });

        }

    }
);

/*
 * GET /api/contests/operators
 *
 * Return contest operators.
 */
router.get(
    "/operators",
    (
        req: Request,
        res: Response
    ) => {

        try {

            const includeInactive =
                req.query.include_inactive !== "false";

            const operators =
                contestService.getOperators(
                    includeInactive
                );

            return res.json(
                operators
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest operators:",
                error
            );

            return res.status(500).json({

                error:
                    "Failed to load contest operators"

            });

        }

    }
);


/*
 * GET /api/contests/operators/:id
 *
 * Return one contest operator.
 */
router.get(
    "/operators/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid operator ID"

            });

        }


        try {

            const operator =
                contestService.getOperatorById(
                    id
                );


            if (!operator) {

                return res.status(404).json({

                    error:
                        "Contest operator not found"

                });

            }


            return res.json(
                operator
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest operator:",
                error
            );

            return res.status(500).json({

                error:
                    "Failed to load contest operator"

            });

        }

    }
);


/*
 * POST /api/contests/operators
 *
 * Create a contest operator.
 */
router.post(
    "/operators",
    (
        req: Request,
        res: Response
    ) => {

        const {
            callsign,
            name,
            club,
            email,
            notes,
            active
        } = req.body;


        try {

            const operator =
                contestService.createOperator({

                    callsign:
                        String(
                            callsign ?? ""
                        ),

                    name:
                        String(
                            name ?? ""
                        ),

                    club:
                        String(
                            club ?? ""
                        ),

                    email:
                        String(
                            email ?? ""
                        ),

                    notes:
                        String(
                            notes ?? ""
                        ),

                    active:
                        active !== false

                });


            return res
                .status(201)
                .json(
                    operator
                );

        }
        catch (error) {

            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create contest operator";


            if (
                message ===
                "Operator callsign is required"
                ||
                message ===
                "Operator name is required"
            ) {

                return res.status(400).json({

                    error:
                        message

                });

            }


            if (
                message ===
                "Operator callsign already exists"
            ) {

                return res.status(409).json({

                    error:
                        message

                });

            }


            console.error(
                "Failed to create contest operator:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to create contest operator"

            });

        }

    }
);


/*
 * PATCH /api/contests/operators/:id
 *
 * Update a contest operator.
 */
router.patch(
    "/operators/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid operator ID"

            });

        }


        const {
            callsign,
            name,
            club,
            email,
            notes,
            active
        } = req.body;


        try {

            const operator =
                contestService.updateOperator(

                    id,

                    {

                        callsign:
                            String(
                                callsign ?? ""
                            ),

                        name:
                            String(
                                name ?? ""
                            ),

                        club:
                            String(
                                club ?? ""
                            ),

                        email:
                            String(
                                email ?? ""
                            ),

                        notes:
                            String(
                                notes ?? ""
                            ),

                        active:
                            active !== false

                    }

                );


            if (!operator) {

                return res.status(404).json({

                    error:
                        "Contest operator not found"

                });

            }


            return res.json(
                operator
            );

        }
        catch (error) {

            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update contest operator";


            if (
                message ===
                "Operator callsign is required"
                ||
                message ===
                "Operator name is required"
            ) {

                return res.status(400).json({

                    error:
                        message

                });

            }


            if (
                message ===
                "Operator callsign already exists"
            ) {

                return res.status(409).json({

                    error:
                        message

                });

            }


            console.error(
                "Failed to update contest operator:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to update contest operator"

            });

        }

    }
);


/*
 * POST /api/contests/operators/:id/active
 *
 * Enable or disable a contest operator.
 */
router.post(
    "/operators/:id/active",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid operator ID"

            });

        }


        if (
            typeof req.body.active !==
            "boolean"
        ) {

            return res.status(400).json({

                error:
                    "Active must be a boolean"

            });

        }


        try {

            const operator =
                contestService.setOperatorActive(

                    id,

                    req.body.active

                );


            if (!operator) {

                return res.status(404).json({

                    error:
                        "Contest operator not found"

                });

            }


            return res.json(
                operator
            );

        }
        catch (error) {

            console.error(
                "Failed to update contest operator status:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to update contest operator status"

            });

        }

    }
);


/*
 * DELETE /api/contests/operators/:id
 *
 * Delete a contest operator.
 */
router.delete(
    "/operators/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid operator ID"

            });

        }


        try {

            const deleted =
                contestService.deleteOperator(
                    id
                );


            if (!deleted) {

                return res.status(404).json({

                    error:
                        "Contest operator not found"

                });

            }


            return res.json({

                success:
                    true

            });

        }
        catch (error) {

            if (
                error instanceof Error &&
                error.message ===
                    "Operator is assigned to contest sessions"
            ) {

                return res.status(409).json({

                    error:
                        "Operator is assigned to contest sessions"

                });

            }


            console.error(
                "Failed to delete contest operator:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to delete contest operator"

            });

        }

    }
);


/*
 * GET /api/contests/session/:id/operators
 *
 * Return operators assigned to a contest session.
 */
router.get(
    "/session/:id/operators",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid session ID"

            });

        }


        const session =
            contestService.getSessionById(
                id
            );


        if (!session) {

            return res.status(404).json({

                error:
                    "Contest session not found"

            });

        }


        try {

            const operators =
                contestService.getSessionOperators(
                    id
                );

            return res.json(
                operators
            );

        }
        catch (error) {

            console.error(
                "Failed to load session operators:",
                error
            );

            return res.status(500).json({

                error:
                    "Failed to load session operators"

            });

        }

    }
);


/*
 * POST /api/contests/session/:id/operators/:operatorId
 *
 * Assign an operator to a contest session.
 */
router.post(
    "/session/:id/operators/:operatorId",
    (
        req: Request,
        res: Response
    ) => {

        const sessionId =
            parseId(
                req.params.id
            );

        const operatorId =
            parseId(
                req.params.operatorId
            );


        if (
            sessionId === null ||
            operatorId === null
        ) {

            return res.status(400).json({

                error:
                    "Invalid session or operator ID"

            });

        }


        try {

            const operators =
                contestService.addOperatorToSession(

                    sessionId,

                    operatorId

                );


            return res.json(
                operators
            );

        }
        catch (error) {

            const message =
                error instanceof Error
                    ? error.message
                    : "";


            if (
                message ===
                "Contest session not found"
                ||
                message ===
                "Contest operator not found"
            ) {

                return res.status(404).json({

                    error:
                        message

                });

            }


            console.error(
                "Failed to assign contest operator:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to assign contest operator"

            });

        }

    }
);


/*
 * DELETE /api/contests/session/:id/operators/:operatorId
 *
 * Remove an operator from a contest session.
 */
router.delete(
    "/session/:id/operators/:operatorId",
    (
        req: Request,
        res: Response
    ) => {

        const sessionId =
            parseId(
                req.params.id
            );

        const operatorId =
            parseId(
                req.params.operatorId
            );


        if (
            sessionId === null ||
            operatorId === null
        ) {

            return res.status(400).json({

                error:
                    "Invalid session or operator ID"

            });

        }


        try {

            const operators =
                contestService.removeOperatorFromSession(

                    sessionId,

                    operatorId

                );


            return res.json(
                operators
            );

        }
        catch (error) {

            console.error(
                "Failed to remove contest operator:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to remove contest operator"

            });

        }

    }
);


/*
 * GET /api/contests/session
 *
 * Return the currently active contest session.
 */
router.get(
    "/session",
    (
        _req: Request,
        res: Response
    ) => {

        try {

            const session =
                contestService.getActiveSession();


            return res.json(
                session
            );

        }
        catch (error) {

            console.error(
                "Failed to load active contest session:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to load active contest session"

            });

        }

    }
);


/*
 * GET /api/contests/sessions
 *
 * Return all contest sessions.
 */
router.get(
    "/sessions",
    (
        _req: Request,
        res: Response
    ) => {

        try {

            const sessions =
                contestService.getSessions();

            return res.json(
                sessions
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest sessions:",
                error
            );

            return res.status(500).json({

                error:
                    "Failed to load contest sessions"

            });

        }

    }
);

/*
 * DELETE /api/contests/session/:id
 *
 * Delete a contest session and its operator assignments.
 */
router.delete(
    "/session/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            Number(req.params.id);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return res.status(400).json({
                error: "Invalid session id"
            });
        }

        try {

            const deleted =
                contestService.deleteSession(id);

            if (!deleted) {
                return res.status(404).json({
                    error: "Session not found"
                });
            }

            return res.json({ ok: true });

        }
        catch (error) {

            console.error(
                "Failed to delete contest session:",
                error
            );

            return res.status(500).json({
                error: "Failed to delete contest session"
            });

        }

    }
);

/*
 * POST /api/contests/session
 *
 * Create a new contest session.
 */
router.post(
    "/session",
    (
        req: Request,
        res: Response
    ) => {

        const {
            contest_definition_id,
            operator_name,
            station_callsign,
            station_grid
        } = req.body;


        const definitionId =
            Number(
                contest_definition_id
            );


        if (
            !Number.isInteger(definitionId) ||
            definitionId <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid contest definition ID"

            });

        }


        try {

            const definition =
                contestService.getById(
                    definitionId
                );


            if (!definition) {

                return res.status(404).json({

                    error:
                        "Contest definition not found"

                });

            }


            if (!definition.enabled) {

                return res.status(400).json({

                    error:
                        "Contest definition is disabled"

                });

            }


            const existing =
                contestService.getActiveSession();


            if (existing) {

                return res.status(409).json({

                    error:
                        "A contest session is already active",

                    session:
                        existing

                });

            }


            const session =
                contestService.createSession({

                    contest_definition_id:
                        definitionId,

                    name:
                        definition.name,

                    status:
                        "READY",

                    operator_name:
                        String(
                            req.body?.operator_name || ""
                        ).trim(),

                    station_callsign:
                        String(
                            req.body?.station_callsign || ""
                        ).trim()
                        .toUpperCase(),

                    club:
                        String(
                            req.body?.club || ""
                        ).trim(),

                    station_grid:
                        String(
                            req.body?.station_grid || ""
                        ).trim()
                        .toUpperCase()

                });


            return res
                .status(201)
                .json(
                    session
                );

        }
        catch (error) {

            console.error(
                "Failed to create contest session:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to create contest session"

            });

        }

    }
);


/*
 * PATCH /api/contests/session/:id
 *
 * Session configuration can only be changed while READY.
 */
router.patch(
    "/session/:id",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid session ID"

            });

        }


        const existing =
            contestService.getSessionById(
                id
            );


        if (!existing) {

            return res.status(404).json({

                error:
                    "Contest session not found"

            });

        }


        if (existing.status !== "READY") {

            return res.status(409).json({

                error:
                    "Contest session can only be edited while READY",

                session:
                    existing

            });

        }


        const {
            operator_name,
            station_callsign,
            club,
            station_grid
        } = req.body;


        if (
            typeof operator_name !== "string" ||
            typeof station_callsign !== "string" ||
            typeof club !== "string" ||
            typeof station_grid !== "string"
        ) {

            return res.status(400).json({

                error:
                    "operator_name, station_callsign, club and station_grid must be strings"

            });

        }


        try {

            const session =
                contestService.updateSession(

                    id,

                    operator_name,

                    station_callsign,

                    club,

                    station_grid

                );


            if (!session) {

                return res.status(404).json({

                    error:
                        "Contest session not found"

                });

            }


            return res
                .status(200)
                .json(
                    session
                );

        }
        catch (error) {

            console.error(
                "Failed to update contest session:",
                error
            );


            return res.status(409).json({

                error:
                    error instanceof Error
                        ? error.message
                        : "Contest session cannot be updated"

            });

        }

    }
);


/*
 * POST /api/contests/session/:id/qso
 *
 * Store a QSO exclusively in contest_qsos.
 */
router.post(
    "/session/:id/qso",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest session ID"

            });

        }


        const {
            qso_date,
            time_on_utc,
            frequency,
            band,
            mode,
            call,
            rst_sent,
            rst_rcvd,
            exchange_sent,
            exchange_received,
            operator,
            station_callsign
        } = req.body;


        if (
            typeof qso_date !== "string" ||
            typeof time_on_utc !== "string" ||
            typeof frequency !== "number" ||
            typeof band !== "string" ||
            typeof mode !== "string" ||
            typeof call !== "string" ||
            typeof rst_sent !== "string" ||
            typeof rst_rcvd !== "string" ||
            typeof exchange_sent !== "string" ||
            typeof exchange_received !== "string" ||
            typeof operator !== "string" ||
            typeof station_callsign !== "string"
        ) {

            return res.status(400).json({

                error:
                    "Invalid contest QSO data"

            });

        }


        if (
            !qso_date.trim() ||
            !time_on_utc.trim() ||
            !band.trim() ||
            !mode.trim() ||
            !call.trim() ||
            !rst_sent.trim() ||
            !rst_rcvd.trim() ||
            !exchange_sent.trim() ||
            !exchange_received.trim() ||
            !operator.trim() ||
            !station_callsign.trim()
        ) {

            return res.status(400).json({

                error:
                    "Required contest QSO fields are missing"

            });

        }


        if (
            !Number.isFinite(frequency) ||
            frequency <= 0
        ) {

            return res.status(400).json({

                error:
                    "Invalid contest QSO frequency"

            });

        }


        try {

            const qso =
                contestService.createContestQso({

                    session_id:
                        id,

                    qso_date:
                        qso_date,

                    time_on_utc:
                        time_on_utc,

                    frequency:
                        frequency,

                    band:
                        band,

                    mode:
                        mode,

                    call:
                        call,

                    rst_sent:
                        rst_sent,

                    rst_rcvd:
                        rst_rcvd,

                    exchange_sent:
                        exchange_sent,

                    exchange_received:
                        exchange_received,

                    operator:
                        operator,

                    station_callsign:
                        station_callsign

                });


            return res
                .status(201)
                .json(
                    qso
                );

        }
        catch (error) {

            console.error(
                "Failed to create contest QSO:",
                error
            );


            if (
                error instanceof Error &&
                error.message === "Contest session not found"
            ) {

                return res.status(404).json({

                    error:
                        error.message

                });

            }


            if (
                error instanceof Error &&
                error.message === "Contest session is not running"
            ) {

                return res.status(409).json({

                    error:
                        error.message

                });

            }


            if (
                error instanceof Error &&
                error.message === "Duplicate contest QSO"
            ) {

                return res.status(409).json({

                    error:
                        error.message

                });

            }


            return res.status(500).json({

                error:
                    "Failed to create contest QSO"

            });

        }

    }
);


/*
 * GET /api/contests/session/:id/qso
 *
 * Return all QSOs belonging to this contest session.
 */
router.get(
    "/session/:id/qso",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest session ID"

            });

        }


        try {

            const session =
                contestService.getSessionById(
                    id
                );


            if (!session) {

                return res.status(404).json({

                    error:
                        "Contest session not found"

                });

            }


            const qsos =
                contestService.getContestQsos(
                    id
                );


            return res.json(
                qsos
            );

        }
        catch (error) {

            console.error(
                "Failed to load contest QSOs:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to load contest QSOs"

            });

        }

    }
);


/*
 * POST /api/contests/session/:id/start
 */
router.post(
    "/session/:id/start",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest session ID"

            });

        }


        if (!validateContestControlKey(req)) {

            return res.status(403).json({

                error:
                    "Invalid contest control key"

            });

        }


        try {

            const session =
                contestService.startSession(
                    id
                );


            if (!session) {

                return res.status(404).json({

                    error:
                        "Contest session not found"

                });

            }


            return res.json(
                session
            );

        }
        catch (error) {

            console.error(
                "Failed to start contest session:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to start contest session"

            });

        }

    }
);


/*
 * POST /api/contests/session/:id/pause
 */
router.post(
    "/session/:id/pause",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest session ID"

            });

        }


        if (!validateContestControlKey(req)) {

            return res.status(403).json({

                error:
                    "Invalid contest control key"

            });

        }


        try {

            const session =
                contestService.pauseSession(
                    id
                );


            if (!session) {

                return res.status(404).json({

                    error:
                        "Contest session not found"

                });

            }


            return res.json(
                session
            );

        }
        catch (error) {

            console.error(
                "Failed to pause contest session:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to pause contest session"

            });

        }

    }
);


/*
 * POST /api/contests/session/:id/resume
 */
router.post(
    "/session/:id/resume",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest session ID"

            });

        }


        if (!validateContestControlKey(req)) {

            return res.status(403).json({

                error:
                    "Invalid contest control key"

            });

        }


        try {

            const session =
                contestService.resumeSession(
                    id
                );


            if (!session) {

                return res.status(404).json({

                    error:
                        "Contest session not found"

                });

            }


            return res.json(
                session
            );

        }
        catch (error) {

            return res.status(409).json({

                error:
                    error instanceof Error
                        ? error.message
                        : "Could not resume contest session"

            });

        }

    }
);


/*
 * POST /api/contests/session/:id/finish
 */
router.post(
    "/session/:id/finish",
    (
        req: Request,
        res: Response
    ) => {

        const id =
            parseId(
                req.params.id
            );


        if (id === null) {

            return res.status(400).json({

                error:
                    "Invalid contest session ID"

            });

        }


        if (!validateContestControlKey(req)) {

            return res.status(403).json({

                error:
                    "Invalid contest control key"

            });

        }


        try {

            const session =
                contestService.finishSession(
                    id
                );


            if (!session) {

                return res.status(404).json({

                    error:
                        "Contest session not found"

                });

            }


            return res.json(
                session
            );

        }
        catch (error) {

            console.error(
                "Failed to finish contest session:",
                error
            );


            return res.status(500).json({

                error:
                    "Failed to finish contest session"

            });

        }

    }
);


/*
 * GET /api/contests/session/:id/cabrillo
 *
 * Cabrillo V3.0 export per CQ WW DX Contest format
 * (https://cqww.com/cabrillo.htm).
 *
 * Contest type and exchange format are derived from
 * the contest definition rules_json.
 */
router.get(
    "/session/:id/cabrillo",
    async (
        req: Request,
        res: Response
    ) => {

        const sessionId =
            Number(req.params.id);

        if (!Number.isFinite(sessionId)) {

            res.status(400).json({
                error: "Invalid session id"
            });

            return;

        }

        try {

            const baseUrl =
                `http://localhost:${process.env.PORT || 3000}`;

            /*
             * Session metadata.
             */
            /*
             * GET /session/:id existiert nicht -
             * Session aus der /sessions-Liste nehmen.
             */
            const sessionsResponse =
                await fetch(
                    `${baseUrl}/api/contests/sessions`
                );

            if (!sessionsResponse.ok) {

                throw new Error(
                    `Sessions load failed: HTTP ${sessionsResponse.status}`
                );

            }

            const sessionsData =
                await sessionsResponse.json();

            const sessionsList =
                Array.isArray(sessionsData)
                    ? sessionsData
                    : Array.isArray(sessionsData.sessions)
                        ? sessionsData.sessions
                        : [];

            const session =
                sessionsList.find(
                    (s: any) => Number(s.id) === sessionId
                );

            if (!session) {

                res.status(404).json({
                    error: "Session not found"
                });

                return;

            }

            /*
             * Contest definition incl. rules_json.
             */
            const definitionResponse =
                await fetch(
                    `${baseUrl}/api/contests/definitions/${session.contest_definition_id}`
                );

            if (!definitionResponse.ok) {

                throw new Error(
                    `Definition load failed: HTTP ${definitionResponse.status}`
                );

            }

            const definition =
                await definitionResponse.json();

            let rules: any = {};

            try {

                rules =
                    typeof definition.rules_json === "string"
                        ? JSON.parse(definition.rules_json)
                        : definition.rules_json || {};

            }
            catch {
                rules = {};
            }

            /*
             * Cabrillo contest name.
             */
            const definitionName =
                String(definition.name || "").toUpperCase();

            const cabrilloName =
                definitionName.includes("CQ WW") &&
                definitionName.includes("SSB")
                    ? "CQ-WW-SSB"
                    : definitionName.includes("CQ WW") &&
                          definitionName.includes("CW")
                        ? "CQ-WW-CW"
                        : String(definition.short_name || definition.name || "UNKNOWN")
                              .toUpperCase()
                              .replace(/[^A-Z0-9-]+/g, "-");

            /*
             * Exchange mapping from rules_json.
             */
            const sentExchange =
                String(rules.exchange?.sent || "").toLowerCase();

            const receivedExchange =
                String(rules.exchange?.received || "").toLowerCase();

            const ownExchange =
                sentExchange === "cq_zone"
                    ? "14"
                    : sentExchange === "serial"
                        ? "001"
                        : "";

            const isCW =
                Array.isArray(rules.modes) &&
                rules.modes.length === 1 &&
                String(rules.modes[0]).toUpperCase() === "CW";

            /*
             * Single-mode contest definitions lock the
             * Cabrillo mode (rules_json.modes), so stray
             * CAT mode values cannot pollute the log.
             */
            const singleMode =
                Array.isArray(rules.modes) &&
                rules.modes.length === 1
                    ? String(rules.modes[0]).toUpperCase()
                    : null;

            const modeToCabrillo = (
                mode: string
            ): string => {

                if (singleMode === "SSB") return "PH";
                if (singleMode === "CW")  return "CW";

                switch (String(mode || "").toUpperCase()) {

                    case "CW": return "CW";
                    case "RTTY": return "RY";
                    case "FT8":
                    case "FT4":
                        return "DG";
                    default: return "PH";

                }

            };

            const rstFor = (
                rst: unknown
            ): string => {

                const text =
                    String(rst || "").trim();

                if (singleMode === "SSB") {
                    return text.slice(0, 2) || "59";
                }

                return text || (isCW ? "599" : "59");

            };

            const bandToKHz: Record<string, number> = {
                "160m": 1820,
                "80m": 3650,
                "40m": 7060,
                "30m": 10120,
                "20m": 14200,
                "17m": 18150,
                "15m": 21200,
                "12m": 24950,
                "10m": 28400
            };

            const pad = (
                value: unknown,
                length: number
            ): string =>
                String(value ?? "").slice(0, length).padEnd(length);

            const callsign =
                String(session.station_callsign || "UNKNOWN");

            const qsoResponse =
                await fetch(
                    `${baseUrl}/api/contests/session/${sessionId}/qso`
                );

            if (!qsoResponse.ok) {

                throw new Error(
                    `QSO load failed: HTTP ${qsoResponse.status}`
                );

            }

            const qsoData =
                await qsoResponse.json();

            const qsos =
                Array.isArray(qsoData)
                    ? qsoData
                    : Array.isArray(qsoData.qsos)
                        ? qsoData.qsos
                        : [];

            if (!qsos.length) {

                res.status(404).json({
                    error: "No QSOs in this session"
                });

                return;

            }

            const lines: string[] = [];

            lines.push("START-OF-LOG: 3.0");
            lines.push(`CONTEST: ${cabrilloName}`);
            lines.push(`CALLSIGN: ${callsign}`);
            lines.push("LOCATION: DX");
            /*
             * Categories from rules_json.category,
             * with Cabrillo-legal fallbacks.
             */
            const cat =
                rules.category && typeof rules.category === "object"
                    ? rules.category
                    : {};

            const catLine = (
                label: string,
                value: unknown,
                fallback: string
            ): string =>
                `${label}: ${String(value || "").toUpperCase().trim() || fallback}`;

            lines.push(catLine("CATEGORY-OPERATOR", cat.operator, "SINGLE-OP"));
            lines.push(catLine("CATEGORY-ASSISTED", cat.assisted, "NON-ASSISTED"));
            lines.push("CATEGORY-BAND: ALL");
            lines.push(catLine("CATEGORY-POWER", cat.power, "LOW"));
            lines.push(catLine("CATEGORY-STATION", cat.station, "FIXED"));
            lines.push("CATEGORY-TRANSMITTER: ONE");
            lines.push(isCW
                ? "CATEGORY-MODE: CW"
                : "CATEGORY-MODE: SSB");
            lines.push("CLAIMED-SCORE: 0");
            lines.push(`OPERATORS: ${callsign}`);
            lines.push(`NAME: ${session.operator_name || ""}`);
            if (session.station_grid) {
                lines.push(`GRID-LOCATOR: ${session.station_grid}`);
            }
            if (session.club) {
                lines.push(`CLUB: ${session.club}`);
            }
            lines.push("CREATED-BY: SHACK-SERVER");

            for (const qso of qsos) {

                /*
                 * Cabrillo date: yyyy-mm-dd.
                 */
                const dateDigits =
                    String(qso.qso_date || "").replace(/\D/g, "");

                const dateStr =
                    dateDigits.length >= 8
                        ? `${dateDigits.slice(0, 4)}-${dateDigits.slice(4, 6)}-${dateDigits.slice(6, 8)}`
                        : String(qso.qso_date || "");

                const timeStr =
                    String(qso.time_on_utc || "")
                        .replace(/:/g, "")
                        .slice(0, 4);

                /*
                 * Frequency in kHz. Stored values are usually
                 * kHz (14025), older/edited entries may be MHz
                 * (14.025) or Hz (14025000). Fallback: band
                 * default.
                 */
                let freqkHz = 0;

                const freqNum =
                    Number(qso.frequency);

                if (Number.isFinite(freqNum) && freqNum > 0) {

                    if (freqNum >= 1.5 && freqNum <= 60) {
                        freqkHz = Math.round(freqNum * 1000);
                    }
                    else if (freqNum >= 1500 && freqNum <= 60000) {
                        freqkHz = Math.round(freqNum);
                    }
                    else if (freqNum >= 1500000 && freqNum <= 60000000) {
                        freqkHz = Math.round(freqNum / 1000);
                    }

                }

                if (!freqkHz) {

                    freqkHz =
                        bandToKHz[
                            String(qso.band || "").toLowerCase()
                        ] || 14200;

                }

                /*
                 * Received exchange: stored value or
                 * derived from rules type.
                 */
                const receivedValue =
                    String(qso.exchange_received || "").trim() ||
                    (receivedExchange === "cq_zone"
                        ? "?"
                        : receivedExchange === "serial"
                            ? "?"
                            : "");

                lines.push(
                    [
                        /*
                         * Cabrillo 3.0 (cqww.com/cabrillo.htm):
                         * QSO: freq mo date time call rst exch call rst exch
                         * freq = kHz, right-aligned, 5 wide.
                         */
                        "QSO:",
                        String(freqkHz).padStart(5),
                        pad(modeToCabrillo(qso.mode), 2),
                        pad(dateStr, 10),
                        pad(timeStr, 4),
                        pad(callsign, 13),
                        pad(rstFor(qso.rst_sent), 3),
                        pad(qso.exchange_sent || ownExchange, 6),
                        pad(qso.call, 13),
                        pad(rstFor(qso.rst_rcvd), 3),
                        pad(receivedValue, 6)
                    ].join(" ").trimEnd()
                );

            }

            lines.push("END-OF-LOG:");

            const fileName =
                `${callsign}_${cabrilloName}.log`;

            res.setHeader(
                "Content-Type",
                "text/plain; charset=utf-8"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${fileName}"`
            );

            res.send(lines.join("\n") + "\n");

        }
        catch (error) {

            console.error(
                "Cabrillo export failed:",
                error
            );

            res.status(500).json({
                error: "Cabrillo export failed"
            });

        }

    }
);


export default router;
