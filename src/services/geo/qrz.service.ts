import axios from "axios";

import {
    XMLParser
} from "fast-xml-parser";

import {
    DxLocation
} from "./geo.model.js";

import {
    QsoRecord
} from "../qso/qso.service.js";

import {
    qrzConfig
} from "../../config/qrz.config.js";

import {
    systemLog
} from "../diagnostics/system-log.service.js";


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

        const normalizedCall =
            call
                .toUpperCase()
                .trim();


        if (!normalizedCall) {
            return null;
        }


        if (
            !qrzConfig.username ||
            !qrzConfig.password
        ) {

            systemLog.error(
                "QRZ",
                "QRZ",
                "Credentials missing"
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
                            s: session,
                            callsign:
                                normalizedCall
                        },

                        timeout: 5000
                    }
                );


            const data =
                this.parser.parse(
                    response.data
                );


            const cs =
                data?.QRZDatabase?.Callsign;


            if (!cs) {

                systemLog.warn(
                    "QRZ",
                    "QRZ",
                    `Callsign not found: ${normalizedCall}`
                );


                console.log(
                    "QRZ RESULT:",
                    normalizedCall,
                    null
                );


                return null;
            }


            /*
             * QRZ name
             *
             * Prefer name_fmt when available.
             * Otherwise combine first + last name.
             */

            const qrzName =
                cs.name_fmt ||
                [
                    cs.fname,
                    cs.name
                ]
                    .filter(
                        (value: unknown) =>
                            typeof value === "string" &&
                            value.trim()
                    )
                    .join(" ")
                    .trim();


            const result: DxLocation = {

                call:
                    cs.call ??
                    normalizedCall,

                updated:
                    Date.now()

            };


            if (qrzName) {

                result.name =
                    qrzName;

            }


            if (cs.land) {

                result.country =
                    cs.land;

            }
            else if (cs.country) {

                result.country =
                    cs.country;

            }


            if (cs.grid) {

                result.locator =
                    cs.grid;

            }


            const ituZone =
                this.toNumber(
                    cs.ituzone
                );


            if (
                ituZone !== undefined
            ) {

                result.ituZone =
                    ituZone;

            }


            const cqZone =
                this.toNumber(
                    cs.cqzone
                );


            if (
                cqZone !== undefined
            ) {

                result.cqZone =
                    cqZone;

            }


            const dxcc =
                this.toNumber(
                    cs.dxcc
                );


            if (
                dxcc !== undefined
            ) {

                result.dxcc =
                    dxcc;

            }


            const latitude =
                this.toNumber(
                    cs.lat
                );


            if (
                latitude !== undefined
            ) {

                result.latitude =
                    latitude;

            }


            const longitude =
                this.toNumber(
                    cs.lon
                );


            if (
                longitude !== undefined
            ) {

                result.longitude =
                    longitude;

            }


            console.log(
                "QRZ RESULT:",
                normalizedCall,
                result
            );


            return result;


        }
        catch (error) {

            const message =
                this.getErrorMessage(
                    error
                );


            systemLog.error(
                "QRZ",
                "QRZ",
                `Lookup ${normalizedCall}: ${message}`
            );


            console.error(
                "QRZ lookup failed:",
                normalizedCall,
                error
            );


            return null;
        }

    }

    private buildQrzAdif(
        qso: QsoRecord
    ): string {

        const fields: string[] = [];


        const addField = (
            name: string,
            value: string | number | null | undefined
        ) => {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return;
            }


            const text =
                String(value);

            fields.push(
                `<${name}:${text.length}>${text}`
            );
        };


        const qsoDate =
            qso.qso_date
                .replaceAll("-", "");


        const timeOn =
            qso.time_on_utc
                .replaceAll(":", "")
                .replaceAll(" ", "");


        const timeOff =
            qso.time_off_utc
                ? qso.time_off_utc
                    .replaceAll(":", "")
                    .replaceAll(" ", "")
                : null;


        const frequencyMHz =
            (
                qso.frequency /
                1_000_000
            ).toFixed(6);


        addField(
            "CALL",
            qso.call
        );

        addField(
            "QSO_DATE",
            qsoDate
        );

        addField(
            "TIME_ON",
            timeOn
        );

        addField(
            "TIME_OFF",
            timeOff
        );

        addField(
            "FREQ",
            frequencyMHz
        );

        addField(
            "BAND",
            qso.band
        );

        addField(
            "MODE",
            qso.mode
        );

        addField(
            "RST_SENT",
            qso.rst_sent
        );

        addField(
            "RST_RCVD",
            qso.rst_rcvd
        );

        addField(
            "STATION_CALLSIGN",
            qso.my_callsign
        );

        addField(
            "OPERATOR",
            qso.operator_name
        );

        addField(
            "MY_GRIDSQUARE",
            qso.my_grid
        );

        addField(
            "GRIDSQUARE",
            qso.dx_grid
        );

        addField(
            "NAME",
            qso.name
        );

        addField(
            "COUNTRY",
            qso.country
        );

        addField(
            "CQZ",
            qso.cq_zone
        );

        addField(
            "ITUZ",
            qso.itu_zone
        );

        addField(
            "COMMENT",
            qso.notes
        );


        return (
            fields.join("") +
            "<EOR>"
        );
    }


    async uploadQsoToLogbook(
        qso: QsoRecord
    ): Promise<boolean> {

        if (!qrzConfig.apiKey) {

            systemLog.warn(
                "QRZ",
                "QRZ",
                "Logbook API key missing"
            );

            return false;
        }


        try {

            const adif =
                this.buildQrzAdif(
                    qso
                );


            const response =
                await axios.post(
                    "https://logbook.qrz.com/api",
                    new URLSearchParams({

                        KEY:
                            qrzConfig.apiKey,

                        ACTION:
                            "INSERT",

                        ADIF:
                            adif

                    }),
                    {
                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded",

                            "User-Agent":
                                "SHACK-SERVER/1.0 (HB9ISO)"

                        },

                        timeout: 5000
                    }
                );


            const result =
                String(
                    response.data ?? ""
                );


            const resultMatch =
                result.match(
                    /(?:^|&)RESULT=([^&]+)/i
                );


            const resultCode =
                resultMatch?.[1]
                    ?.toUpperCase() ?? "";


            if (
                resultCode === "OK"
            ) {

                const logIdMatch =
                    result.match(
                        /(?:^|&)LOGID=([^&]+)/i
                    );


                const logId =
                    logIdMatch?.[1] ?? "";


                systemLog.info(
                    "QRZ",
                    "QRZ",
                    `Logbook upload successful: ${qso.call}` +
                    (
                        logId
                            ? ` (LOGID ${logId})`
                            : ""
                    )
                );


                return true;
            }


            systemLog.warn(
                "QRZ",
                "QRZ",
                `Logbook upload rejected: ${qso.call} ${result}`
            );


            return false;

        }
        catch (error) {

            const message =
                this.getErrorMessage(
                    error
                );


            systemLog.error(
                "QRZ",
                "QRZ",
                `Logbook upload ${qso.call}: ${message}`
            );


            console.error(
                "QRZ logbook upload failed:",
                qso.call,
                error
            );


            return false;
        }
    }





    private toNumber(
        value: unknown
    ): number | undefined {

        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {

            return undefined;

        }


        const number =
            Number(value);


        return Number.isFinite(number)
            ? number
            : undefined;

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

                        timeout: 5000
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

                systemLog.error(
                    "QRZ",
                    "QRZ",
                    "Session failed: no session key returned"
                );


                console.error(
                    "QRZ session failed"
                );


                return null;

            }


            this.sessionKey =
                session.Key;

            this.sessionTime =
                Date.now();


            systemLog.info(
                "QRZ",
                "QRZ",
                "Session established"
            );


            return this.sessionKey;


        }
        catch (error) {

            const message =
                this.getErrorMessage(
                    error
                );


            systemLog.error(
                "QRZ",
                "QRZ",
                `Session error: ${message}`
            );


            console.error(
                "QRZ session error:",
                error
            );


            return null;

        }

    }


    private getErrorMessage(
        error: unknown
    ): string {

        if (
            axios.isAxiosError(error)
        ) {

            if (
                error.response
            ) {

                return `HTTP ${error.response.status}`;

            }


            if (
                error.code ===
                "ECONNABORTED"
            ) {

                return "Timeout";

            }


            if (
                error.code
            ) {

                return error.code;

            }


            if (
                error.message
            ) {

                return error.message;

            }

        }


        if (
            error instanceof Error
        ) {

            return error.message;

        }


        return "Unknown error";

    }

}
