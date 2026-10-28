import "dotenv/config";

import express from "express";
import compression from "compression";
import cors from "cors";
import bestBandRouter from "./routes/best-band.js";
import radioRouter from "./routes/radio.js";
import radioConfigRouter from "./routes/radio-config.js";
import qsoRouter from "./routes/qso.js";
import watchlistRouter from "./routes/watchlist.js";
import systemRouter from "./routes/system.js";
import diagnosticsRouter from "./routes/diagnostics.js";
import settingsRouter from "./routes/settings.js";
import { DEMO_MODE, DEMO_LIMITS } from "./services/demo/demo-mode.js";
import { demoGuard, demoCounts } from "./services/demo/demo-guard.js";
import uploadsRouter from "./routes/uploads.js";
import wsjtxRouter from "./routes/wsjtx.js";
import networkRouter from "./routes/network.js";
import indexRouter from "./routes/index.js";
import propagationRouter from "./routes/propagation.js";
import spotsRouter from "./routes/spots.js";
import stationRouter from "./routes/station.js";
import systemStatusRouter from "./routes/system-status.js";
import contestsRouter from "./routes/contests.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rbnRouter from "./routes/rbn.js";

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
express.json({ limit: "1mb" })
);


app.use(
    express.urlencoded({
        extended: true
    })
);


/*
    Demo version (SHACK_DEMO=1): server-side limits before all routes,
    and /api/demo for the DEMO banner in the web interface.
*/

app.get(
    "/api/demo",
    (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json({
            demo: DEMO_MODE,
            limits: DEMO_LIMITS,
            counts: DEMO_MODE ? demoCounts() : null
        });
    }
);

if (DEMO_MODE) {
    app.use(demoGuard);
    console.log("DEMO MODE: limited demo version (SHACK_DEMO=1)");
}


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


// Transceiver configuration (Settings → Transceivers)
app.use(
    "/api/radios",
    radioConfigRouter
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

app.use(
    "/api/watchlist",
    watchlistRouter
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


// Online logbook uploads (QRZ.com, ...)
app.use(
    "/api/uploads",
    uploadsRouter
);


// WSJT-X / JTDX UDP interface
app.use(
    "/api/wsjtx",
    wsjtxRouter
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


// RBN
app.use(
    "/api/rbn",
    rbnRouter
);

// System Status
app.use(
    "/api/system-status",
    systemStatusRouter
);

/*


/*
    Contest Manager
*/

app.use(
    "/api/contests",
    contestsRouter
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
