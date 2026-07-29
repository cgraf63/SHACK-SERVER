import spotsRouter from './routes/spots.js';
import express from 'express';
import compression from 'compression';
import cors from 'cors';

import path from 'node:path';
import { fileURLToPath } from 'node:url';


import indexRouter from './routes/index.js';
import propagationRouter from './routes/propagation.js';

// später für Fusion Engine / Cluster
// import clusterRouter from './routes/cluster.js';



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
    compression()
);


app.use(
    cors()
);



app.use(
    express.json()
);



app.use(
    express.urlencoded({
        extended:true
    })
);





/*
    Static Frontend
*/


app.use(

    express.static(

        path.join(
            __dirname,
            'public'
        )

    )

);





/*
    Routes
*/


app.use(
    '/',
    indexRouter
);



app.use(

    '/api/propagation',

    propagationRouter

);





/*
    Fusion / Cluster API
    kommt als nächster Schritt

    Beispiel:

    app.use(
        '/api/cluster',
        clusterRouter
    );

*/





export default app;
