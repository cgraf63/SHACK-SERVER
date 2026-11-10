import { settingsService } from "../services/settings/settings.service.js";


/*
 * QRZ.com credentials.
 *   username / password: XML lookup - Settings (setup assistant) first,
 *                        QRZ_USER / QRZ_PASSWORD in .env as fallback
 *   apiKey:              logbook key of the own callsign from .env
 *                        (logbook keys are set per account in Settings)
 * Read on every access, so changes in the settings apply at once.
 */
export const qrzConfig = {

    get username(): string {
        return settingsService.get().qrzLookup?.username || process.env.QRZ_USER || "";
    },

    get password(): string {
        const lookup = settingsService.get().qrzLookup;
        return (lookup?.username ? lookup.password : "") || process.env.QRZ_PASSWORD || "";
    },

    get apiKey(): string {
        return process.env.QRZ_API_KEY ?? "";
    }

};
