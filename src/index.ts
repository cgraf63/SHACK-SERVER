import "dotenv/config";
import app from './app.js';


import {
    fusionEngine
} from './services/fusion/fusion-instance.js';


import {
    SourceManager
} from './services/sources/source-manager.js';



const PORT =
    Number(process.env.PORT) || 3000;



/*
    Start data sources
*/


const sourceManager =
    new SourceManager(
        fusionEngine
    );


sourceManager.start();





app.listen(PORT, () => {


    console.log('');

    console.log('===================================');

    console.log(' SHACK SERVER');

    console.log('===================================');

    console.log(` Listening on port ${PORT}`);

    console.log('');


});
