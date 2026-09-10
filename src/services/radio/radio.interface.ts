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

}
