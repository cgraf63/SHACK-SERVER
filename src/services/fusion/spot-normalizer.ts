import {
    FusionSpot
} from "./spot.model.js";

export class SpotNormalizer {

    normalize(raw: any, source: string): FusionSpot | null {

        if (!raw.call || !raw.frequency) {
            return null;
        }

        const frequency = Number(raw.frequency);

        const mode = this.detectMode(raw.mode, frequency);

        return {
            call: raw.call.toUpperCase().trim(),
            frequency,
            band: this.getBand(frequency),
            mode,
            sources: [source],
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            confidence: this.calculateConfidence(mode),
            snr: raw.snr,
            country: raw.country,
            dxcc: raw.dxcc,
            continent: raw.continent,
            flag: this.getFlag(raw.call),
            countryCode: this.getCountryCode(raw.call)
        };
    }

    private detectMode(mode: string | undefined, frequency: number): string {
        if (mode) {
            const upper = mode.toUpperCase();
            for (const item of ["FT8","FT4","RTTY","CW","SSB","USB","LSB"]) {
                if (upper.includes(item)) return item;
            }
        }

        if (frequency >= 144100 && frequency <= 144150) return "FT8";
        if (frequency >= 50300 && frequency <= 50400) return "FT8";
        if (frequency >= 14070 && frequency <= 14110) return "FT8";
        if (frequency >= 7000 && frequency <= 7050) return "CW";
        if (frequency >= 7050 && frequency <= 7200) return "SSB";
        return "UNKNOWN";
    }

    private calculateConfidence(mode: string): number {
        let value = 60;
        if (mode !== "UNKNOWN") value += 15;
        return Math.min(value, 99);
    }

    private getBand(frequency: number): string {
        const mhz = frequency / 1000;
        if (mhz >= 50) return "6m";
        if (mhz >= 28) return "10m";
        if (mhz >= 21) return "15m";
        if (mhz >= 14) return "20m";
        if (mhz >= 7) return "40m";
        if (mhz >= 3) return "80m";
        return "unknown";
    }

    private getFlag(call: string): string {
        const c = this.getCountryCode(call);
        const map: Record<string,string> = {
            de:"🇩🇪", ch:"🇨🇭", fr:"🇫🇷", gb:"🇬🇧",
            it:"🇮🇹", es:"🇪🇸", us:"🇺🇸", ca:"🇨🇦",
            nl:"🇳🇱", pl:"🇵🇱", se:"🇸🇪", dk:"🇩🇰",
            no:"🇳🇴", cz:"🇨🇿", bg:"🇧🇬", jp:"🇯🇵"
        };
        return map[c] ?? "🌐";
    }

    private getCountryCode(call: string): string {
        const prefix = call.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const codes: Record<string,string> = {
            DL:"de", HB:"ch", F:"fr", G:"gb", M:"gb",
            I:"it", EA:"es", PA:"nl", PD:"nl",
            SP:"pl", SQ:"pl", SM:"se", OZ:"dk",
            OK:"cz", LZ:"bg", VE:"ca",
            K:"us", N:"us", W:"us",
            JA:"jp", VK:"au", ZL:"nz"
        };

        for (const key of Object.keys(codes).sort((a,b)=>b.length-a.length)) {
            if (prefix.startsWith(key)) {
                return codes[key] ?? "";
            }
        }

        return "";
    }
}
