import app from './app.js';

import {
    CatService
} from "./services/radio/cat.service.js";

import {
    SourceStatusService
} from "./services/sources/source-status.service.js";

import {
    fusionEngine
} from './services/fusion/fusion-instance.js';

import {
    SourceManager
} from './services/sources/source-manager.js';


import {
    catService
} from "./services/radio/cat-instance.js";


import {
    sotaPotaService
} from "./services/activities/sota-pota-instance.js";

catService.start();


sotaPotaService.start();

const sourceStatus =
    new SourceStatusService();


const PORT =
    Number(process.env.PORT) || 3000;



/*
    Start data sources
*/


const sourceManager =
    new SourceManager(
        fusionEngine,
        sourceStatus
    );


sourceManager.start();

app.get(
    "/api/source-status",
    (req, res) => {

        res.json(
            sourceStatus.getStatus()
        );

    }
);



app.listen(PORT, () => {


    console.log('');

    console.log('===================================');

    console.log(' SHACK SERVER');

    console.log('===================================');

    console.log(` Listening on port ${PORT}`);

    console.log('');


});
