import type { LogbookAccount } from "../../config/settings.config.js";
import type { UploadQso } from "./adif-export.js";


export type UploadServiceId = "qrz";


export interface UploadResult {

    ok: boolean;

    /* Human readable message (shown in the QSO log tooltip). */
    message: string;

    /*
     * Do not retry automatically (e.g. wrong API key,
     * QSO rejected by the logbook).
     */
    permanent?: boolean;

}


export interface Uploader {

    id: UploadServiceId;

    label: string;

    /* Service enabled and credentials present for this account. */
    isEnabledFor(account: LogbookAccount): boolean;

    /*
     * Upload one QSO with the account of its station callsign.
     * replace = the QSO was edited after an earlier upload.
     */
    upload(
        qso: UploadQso,
        adif: string,
        options: { replace: boolean; account: LogbookAccount }
    ): Promise<UploadResult>;

    /* Check credentials (Settings → Test). */
    test(
        account: LogbookAccount | null,
        credentials?: Record<string, string>
    ): Promise<UploadResult>;

}
