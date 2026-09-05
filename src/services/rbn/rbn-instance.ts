import {
    RbnConnector
} from "./rbn.connector.js";


export const rbnConnector =
    new RbnConnector();


/*
    Start RBN connector
    when the server starts.
*/

rbnConnector.connect();
