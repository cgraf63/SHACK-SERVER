export interface FusionSpot {

    call: string;

    frequency: number;

    band: string;

    mode: string;

    sources: string[];

    timestamp: number;

    confidence?: number;

    snr?: number;

}
