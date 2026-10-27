import type { LogbookAccount } from "../../config/settings.config.js";
import type { UploadQso } from "./adif-export.js";


export type UploadServiceId = "qrz" | "clublog";


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

    /*
     * Optional: many QSOs of one account in one request (Club Log asks
     * for files instead of hundreds of single uploads). Used for
     * contest sessions when at least batchMinimum QSOs are waiting.
     */
    uploadBatch?(
        qsos: UploadQso[],
        adif: string,
        options: { account: LogbookAccount }
    ): Promise<UploadResult>;

    batchMinimum?: number;

    /*
     * Optional: the service must not be contacted for this account at
     * the moment (e.g. after an error). Returns the reason, or null.
     * The queue then sends nothing and leaves the QSOs waiting.
     */
    pausedFor?(account: LogbookAccount): { reason: string; until: number } | null;

    /* Check credentials (Settings → Test). */
    test(
        account: LogbookAccount | null,
        credentials?: Record<string, string>
    ): Promise<UploadResult>;

}
