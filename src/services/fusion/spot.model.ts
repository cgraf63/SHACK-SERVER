export interface FusionSpot {

    call: string;


    frequency: number;


    band: string;


    mode: string;



    sources: string[];



    firstSeen: number;


    lastSeen: number;



    confidence: number;



    snr?: number;



    spotters?: string[];



    comments?: string[];

}
