export interface ClusterStatus {


    name: string;


    type: string;


    status:
        | "connected"
        | "connecting"
        | "error"
        | "disabled";


    lastUpdate?: number;


    latency?: number;


}



export class ClusterStatusService {



    private sources: ClusterStatus[] = [];




    registerSource(
        name:string,
        type:string
    ) {


        this.sources.push({

            name,

            type,

            status:"connecting"

        });


    }





    updateStatus(

        name:string,

        status:
            | "connected"
            | "connecting"
            | "error"
            | "disabled",

        latency?:number

    ) {


        const source =
            this.sources.find(
                s => s.name === name
            );



        if(!source)
            return;



        source.status = status;

        source.lastUpdate =
            Date.now();


        if(latency !== undefined) {

            source.latency =
                latency;

        }


    }





    getStatus() {


        return this.sources;


    }


}
