import { CatService } from "./cat.service.js";


export const catService =
    new CatService(
        "/dev/ttyACM0"
    );
