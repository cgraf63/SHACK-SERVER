import axios from "axios";

import { settingsService } from "../settings/settings.service.js";
import { qrzConfig } from "../../config/qrz.config.js";
import type { Uploader, UploadResult } from "./uploader.js";


/*
 * QRZ.com Logbook API
 * https://logbook.qrz.com/api  (form POST, answer: KEY=VALUE&...)
 */

const QRZ_LOGBOOK_URL = "https://logbook.qrz.com/api";


function apiKey(): string {

    return (
        settingsService.get().uploads.qrz.apiKey ||
        qrzConfig.apiKey ||
        ""
    ).trim();

}


function parseAnswer(text: string): Record<string, string> {

    const result: Record<string, string> = {};

    for (const part of String(text || "").split("&")) {

        const index = part.indexOf("=");

        if (index > 0) {
            result[part.slice(0, index).toUpperCase()] =
                decodeURIComponent(part.slice(index + 1).replace(/\+/g, " "));
        }

    }

    return result;

}


async function call(
    params: Record<string, string>
): Promise<Record<string, string>> {

    const response =
        await axios.post(
            QRZ_LOGBOOK_URL,
            new URLSearchParams(params),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "SHACK-SERVER/1.0"
                },
                timeout: 15000,
                responseType: "text",
                transformResponse: (data: unknown) => data
            }
        );

    return parseAnswer(String(response.data ?? ""));

}


function isAuthError(reason: string): boolean {

    return /invalid api key|access denied|not authorized|key.*(invalid|expired)/i
        .test(reason);

}


export const qrzUploader: Uploader = {

    id: "qrz",

    label: "QRZ.com",

    isEnabled(): boolean {

        return (
            settingsService.get().uploads.qrz.enabled &&
            Boolean(apiKey())
        );

    },

    async upload(_qso, adif, options): Promise<UploadResult> {

        const params: Record<string, string> = {
            KEY: apiKey(),
            ACTION: "INSERT",
            ADIF: adif
        };

        if (options.replace) {
            params.OPTION = "REPLACE";
        }

        try {

            const answer = await call(params);
            const result = (answer.RESULT || "").toUpperCase();
            const reason = answer.REASON || "";

            if (result === "OK" || result === "REPLACE") {
                return {
                    ok: true,
                    message: answer.LOGID ? `LOGID ${answer.LOGID}` : "Uploaded"
                };
            }

            /*
             * Already in the QRZ logbook: nothing to do.
             */
            if (/duplicate/i.test(reason)) {
                return { ok: true, message: "Already in QRZ logbook" };
            }

            return {
                ok: false,
                message: reason || `QRZ answered ${result || "nothing"}`,
                permanent: isAuthError(reason) || result === "FAIL"
            };

        }
        catch (error) {

            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };

        }

    },

    async test(credentials): Promise<UploadResult> {

        const key = (credentials?.apiKey || apiKey()).trim();

        if (!key) {
            return { ok: false, message: "No API key entered." };
        }

        try {

            const answer = await call({ KEY: key, ACTION: "STATUS" });

            if ((answer.RESULT || "").toUpperCase() === "OK") {

                const parts = [
                    answer.CALLSIGN ? `Logbook ${answer.CALLSIGN}` : "Key valid",
                    answer.COUNT ? `${answer.COUNT} QSOs` : ""
                ].filter(Boolean);

                return { ok: true, message: parts.join(" · ") };

            }

            return {
                ok: false,
                message: answer.REASON || "API key not accepted"
            };

        }
        catch (error) {

            return {
                ok: false,
                message: error instanceof Error ? error.message : String(error)
            };

        }

    }

};
