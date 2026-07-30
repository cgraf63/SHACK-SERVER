import {
    DxLocation
} from "./geo.model.js";


export class GeoCacheService {


    private cache =
        new Map<string, DxLocation>();


    get(
        call: string
    ): DxLocation | undefined {

        return this.cache.get(
            call.toUpperCase()
        );

    }


    set(
        location: DxLocation
    ): void {

        this.cache.set(
            location.call.toUpperCase(),
            location
        );

    }

}
