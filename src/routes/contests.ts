import { Router, Request, Response } from "express";

import {
    contestService,
    ContestDefinition
} from "../services/contest/contest.service.js";


const router = Router();


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


export default router;
