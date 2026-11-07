import app from './app.js';
import { DEMO_MODE } from "./services/demo/demo-mode.js";
import { seedDemoData } from "./services/demo/demo-data.js";
import { createServer } from "node:http";
import { startAudioWebSocket } from "./services/audio/audio-ws.service.js";
import { startSdrWebSocket } from "./services/sdr/sdr-ws.service.js";

import {
    fusionEngine
} from './services/fusion/fusion-instance.js';

import {
    sourceManager,
    sourceStatus
} from "./services/sources/source-manager-instance.js";

import {
    radioManager
} from "./services/radio/radio-manager.js";

import {
    sotaPotaService
} from "./services/activities/sota-pota-instance.js";

import {
    uploadQueue
} from "./services/upload/upload-queue.service.js";

import {
    wsjtxService
} from "./services/wsjtx/wsjtx.service.js";

import {
    rotatorService
} from "./services/rotator/rotator.service.js";

import {
    dxpeditionService
} from "./services/dxpeditions/dxpedition.service.js";

import {
    backupService
} from "./services/backup/backup.service.js";

import "./services/rbn/rbn-instance.js";

import "./services/telnet/telnet-server.js";
radioManager.start();

sotaPotaService.start();

/* DXpeditions list (NG3K ADXO, refreshed every 6 hours; also in the demo) */
dxpeditionService.start();

if (DEMO_MODE) {

    /* Demo version: sample data, no uploads, no WSJT-X */
    seedDemoData();

}
else {

    /* Online logbook uploads (QRZ.com, ...) */
    uploadQueue.start();

    /* WSJT-X / JTDX: QSOs logged there arrive via UDP */
    wsjtxService.start();

    /* Antenna rotator (Hamlib rotctld) */
    rotatorService.start();

    /* Backup (daily, Settings -> Backup) */
    backupService.start();

}


const PORT =
    Number(process.env.PORT) || 3000;



/*
    Start data sources
*/
app.get(
    "/api/source-status",
    (req, res) => {

        res.json(
            sourceStatus.getStatus()
        );

    }
);

app.get(
    "/api/source-status",
    (req, res) => {

        res.json(
            sourceStatus.getStatus()
        );

    }
);



const server =
    createServer(app);

/* Demo version: no remote audio, no SDR (no hardware). */
if (!DEMO_MODE) {
    startAudioWebSocket(server);
    startSdrWebSocket(server);
}

server.listen(PORT, () => {


    console.log('');

    console.log('===================================');

    console.log(' SHACK SERVER');

    console.log('===================================');

    console.log(` Listening on port ${PORT}`);

    console.log('');


});
