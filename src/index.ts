import app from './app.js';

import {
    CatService
} from "./services/radio/cat.service.js";

import {
    fusionEngine
} from './services/fusion/fusion-instance.js';

import {
    sourceManager,
    sourceStatus
} from "./services/sources/source-manager-instance.js";

import {
    catService
} from "./services/radio/cat-instance.js";


import {
    sotaPotaService
} from "./services/activities/sota-pota-instance.js";


import "./services/telnet/telnet-server.js";

catService.start();


sotaPotaService.start();


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



app.listen(PORT, () => {


    console.log('');

    console.log('===================================');

    console.log(' SHACK SERVER');

    console.log('===================================');

    console.log(` Listening on port ${PORT}`);

    console.log('');


});
