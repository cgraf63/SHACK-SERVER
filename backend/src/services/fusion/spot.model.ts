export interface FusionSpot {


    /*
        Identifikation
    */

    call: string;


    dxcc?: string;



    /*
        Funkdaten
    */

    frequency: number;

    band: string;

    mode: string;

    activityType?: "SOTA" | "POTA";


    /*
        Quellen
    */

    sources: string[];



    /*
        Zeit
    */

    timestamp: number;

    age?: number;



    /*
        Bewertung
    */

    snr?: number;


    worked?: boolean;


    propagationScore?: number;


    priorityScore?: number;



    /*
        Fusion Informationen
    */

    confidence?: number;


    duplicateCount?: number;


    recommendation?: string;


}
