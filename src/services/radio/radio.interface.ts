export interface RadioService {

    start(): void;


    setFrequency(
        frequency: number
    ): void;


    setMode(
        mode: string,
        frequency: number
    ): void;


    getFrequency(): number;


    getMode(): string;


    getPower(): number;


    tune?(): Promise<boolean>;

    playCwMemory?(
        memory: number
    ): Promise<boolean>;

    /*
     * Send CW text (A-Z 0-9 and punctuation, already cleaned) and
     * stop it. Optional: only transceivers that can do it via CAT.
     */
    sendCwText?(text: string): Promise<boolean>;

    /* keyer speed in WPM (set before CW text is sent) */
    setCwSpeed?(wpm: number): void;

    stopCwText?(): Promise<boolean>;


    /*
     * Lifecycle / status (provided by SerialRadioBase).
     * Optional so that non-serial drivers can still implement the interface.
     */

    /* Stop for good: close the port, no reconnect. */
    stop?(): void;

    /* Serial port really open. */
    isConnected?(): boolean;

    /* Last open/connection error, "" when there is none. */
    getLastError?(): string;

    /*
     * Ask the transceiver for frequency and mode once
     * (used by the connection test for drivers that do not poll).
     */
    requestStatus?(): void;

}
