import "dotenv/config";
import express from 'express';
import compression from 'compression';
import cors from 'cors';

import path from 'node:path';
import { fileURLToPath } from 'node:url';


import indexRouter from './routes/index.js';
import propagationRouter from './routes/propagation.js';
import spotsRouter from './routes/spots.js';
import stationRouter from './routes/station.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();



/*
    Middleware
*/

app.use(compression());

app.use(cors());


app.use(express.json());


app.use(express.urlencoded({
    extended: true
}));



/*
    Static Frontend
*/

app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);



/*
    API Routes
*/


// Dashboard Frontend
app.use(
    '/',
    indexRouter
);


// Propagation Data
app.use(
    '/api/propagation',
    propagationRouter
);


// Live Spots
app.use(
    '/api/spots',
    spotsRouter
);

// Station Information
app.use(
    '/api/station',
    stationRouter
);

export default app;
