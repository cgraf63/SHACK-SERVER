import {
    SourceManager
} from "./source-manager.js";

import {
    fusionEngine
} from "../fusion/fusion-instance.js";

import {
    SourceStatusService
} from "./source-status.service.js";


export const sourceStatus =
    new SourceStatusService();


export const sourceManager =
    new SourceManager(
        fusionEngine,
        sourceStatus
    );


/*
    Start source manager
    when the server starts.
*/

sourceManager.start();
