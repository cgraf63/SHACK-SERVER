import axios from "axios";

import {
    XMLParser
} from "fast-xml-parser";


import {
    DxLocation
} from "./geo.model.js";


import {
    qrzConfig
} from "../../config/qrz.config.js";



export class QRZService {


    private sessionKey:
        string | null = null;


    private sessionTime =
        0;


    private parser =
        new XMLParser({
            ignoreAttributes: false
        });



    async lookup(
        call: string
    ): Promise<DxLocation | null> {


        if (
            !qrzConfig.username ||
            !qrzConfig.password
        ) {

            console.log(
                "QRZ credentials missing"
            );

            return null;

        }



        const session =
            await this.getSession();



        if (!session) {

            return null;

        }



        try {


            const response =
                await axios.get(
                    "https://xmldata.qrz.com/xml/current/",
                    {

                        params: {

                            s:
                                session,

                            callsign:
                                call.toUpperCase().trim()

                        },

                        timeout:
                            5000

                    }
                );



            const data =
                this.parser.parse(
                    response.data
                );



            const cs =
                data?.QRZDatabase?.Callsign;



            if (!cs) {

                console.log(
                    "QRZ RESULT:",
                    call,
                    null
                );

                return null;

            }



            const result: DxLocation = {

    call:
        cs.call ??
        call.toUpperCase(),


    updated:
        Date.now()

};


if (cs.grid) {

    result.locator =
        cs.grid;

}


if (cs.lat) {

    result.latitude =
        Number(cs.lat);

}


if (cs.lon) {

    result.longitude =
        Number(cs.lon);

}

            console.log(
                "QRZ RESULT:",
                call,
                result
            );


            return result;


        }
        catch(error) {


            console.error(
                "QRZ lookup failed:",
                call,
                error
            );


            return null;

        }

    }






    private async getSession()
        : Promise<string | null> {


        if (
            this.sessionKey &&
            (
                Date.now()
                -
                this.sessionTime
            )
            <
            25 * 60 * 1000
        ) {

            return this.sessionKey;

        }



        try {


            const response =
                await axios.get(
                    "https://xmldata.qrz.com/xml/current/",
                    {

                        params: {

                            username:
                                qrzConfig.username,


                            password:
                                qrzConfig.password

                        },

                        timeout:
                            5000

                    }
                );



            const data =
                this.parser.parse(
                    response.data
                );



            const session =
                data?.QRZDatabase?.Session;



            if (
                !session?.Key
            ) {

                console.error(
                    "QRZ session failed"
                );

                return null;

            }



            this.sessionKey =
                session.Key;


            this.sessionTime =
                Date.now();



            return this.sessionKey;


        }
        catch(error) {


            console.error(
                "QRZ session error:",
                error
            );


            return null;

        }

    }


}
