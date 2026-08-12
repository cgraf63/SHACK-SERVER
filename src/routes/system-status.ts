import { Router } from "express";
import os from "os";
import fs from "fs";
import { statfs } from "fs/promises";
import { exec } from "child_process";
import { DatabaseSync } from "node:sqlite";

const router = Router();



function getCpuTemperature() {

    try {

        const temp =
            fs.readFileSync(
                "/sys/class/thermal/thermal_zone0/temp",
                "utf8"
            );


        return (
            Number(temp) / 1000
        ).toFixed(1);

    }

    catch {

        return null;

    }

}

function getDeviceModel() {

    try {

        return fs.readFileSync(
            "/sys/firmware/devicetree/base/model",
            "utf8"
        ).replace(/\0/g, "").trim();

    }

    catch {

        return null;

    }

}

async function getDiskUsage() {

    try {

        const info =
            await statfs("/");


        const total =
            info.blocks * info.bsize;


        const free =
            info.bfree * info.bsize;


        const used =
            total - free;


        return {

            total:
                Math.round(
                    total / 1024 / 1024 / 1024
                ) + " GB",


            used:
                Math.round(
                    used / 1024 / 1024 / 1024
                ) + " GB",


            percent:
                Math.round(
                    used / total * 100
                ) + "%"

        };

    }

    catch {

        return null;

    }

}

function getDockerStatus() {

    return new Promise((resolve) => {

        exec(
            "docker ps -q | wc -l",
            (error, stdout) => {

                if (error) {

                    resolve("Offline");
                    return;

                }


                resolve(
                    stdout.trim() + " running"
                );

            }
        );

    });

}


function getSQLiteStatus() {

    try {

        const db =
            new DatabaseSync(
                "./data/geo-cache.db"
            );


        db.prepare(
            "SELECT 1"
        ).get();


        db.close();


        return "OK";

    }

    catch {

        return "Offline";

    }

}

router.get("/", async (_req, res) => {


    res.json({

        hostname:
            os.hostname(),


        uptime:
            Math.floor(
                os.uptime()
            ),


        temperature:
            getCpuTemperature(),

	model:
    	    getDeviceModel(),


        ip:
            Object.values(
                os.networkInterfaces()
            )
            .flat()
            .find(
                iface =>
                    iface &&
                    iface.family === "IPv4" &&
                    !iface.internal
            )
            ?.address,


        memory: {

            total:
                os.totalmem(),


            free:
                os.freemem()

        },


       disk:
    await getDiskUsage(),


docker:
    await getDockerStatus(),


sqlite:
    getSQLiteStatus()



    });


});



export default router;
