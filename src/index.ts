import app from './app.js';

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


import "./services/telnet/telnet-server.js";
import {
    tx5drService
} from "./services/ft8/tx5dr.service.js";

radioManager.start();

tx5drService.start();


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
