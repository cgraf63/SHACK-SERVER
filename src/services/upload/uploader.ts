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

    /* Enabled in Settings and credentials present. */
    isEnabled(): boolean;

    /*
     * Upload one QSO. replace = the QSO was edited after an
     * earlier upload (overwrite instead of adding a duplicate).
     */
    upload(
        qso: UploadQso,
        adif: string,
        options: { replace: boolean }
    ): Promise<UploadResult>;

    /* Check the credentials (Settings → Test). */
    test(credentials?: Record<string, string>): Promise<UploadResult>;

}
