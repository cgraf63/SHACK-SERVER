import "dotenv/config";

import express from "express";
import compression from "compression";
import cors from "cors";

import bestBandRouter from "./routes/best-band.js";
import radioRouter from "./routes/radio.js";
import qsoRouter from "./routes/qso.js";
import systemRouter from "./routes/system.js";
import diagnosticsRouter from "./routes/diagnostics.js";
import settingsRouter from "./routes/settings.js";
import networkRouter from "./routes/network.js";
import indexRouter from "./routes/index.js";
import propagationRouter from "./routes/propagation.js";
import spotsRouter from "./routes/spots.js";
import stationRouter from "./routes/station.js";
import systemStatusRouter from "./routes/system-status.js";
import ft8Router from "./routes/ft8.js";

import path from "node:path";
import { fileURLToPath } from "node:url";


const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);


const app =
    express();


/*
    Middleware
*/

app.use(
    "/api/network",
    networkRouter
);


app.use(
    compression()
);


app.use(
    cors()
);


/*
    Body parsers

    IMPORTANT:
    These must be registered before
    routes that need req.body.
*/

app.use(
    express.json()
);


app.use(
    express.urlencoded({
        extended: true
    })
);


/*
    API Routes
*/


// System
app.use(
    "/api/system",
    systemRouter
);


// Best Band
app.use(
    "/api/best-band",
    bestBandRouter
);


// Radio
app.use(
    "/api",
    radioRouter
);


// QSO
app.use(
    "/api/qso",
    qsoRouter
);


// Station
app.use(
    "/api/station",
    stationRouter
);


// Settings
app.use(
    "/api/settings",
    settingsRouter
);


// Propagation
app.use(
    "/api/propagation",
    propagationRouter
);


// Live Spots
app.use(
    "/api/spots",
    spotsRouter
);


// System Status
app.use(
    "/api/system-status",
    systemStatusRouter
);

/*
    FT8 / TX-5DR
*/

app.use(
    "/api/ft8",
    ft8Router
);


// Diagnostics
app.use(
    "/api/diagnostics",
    diagnosticsRouter
);

/*
    Static Frontend
*/

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/*
    Frontend Routes
*/


// Dashboard
app.use(
    "/",
    indexRouter
);


export default app;
