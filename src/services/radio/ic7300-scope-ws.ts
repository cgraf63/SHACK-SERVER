import type { Server } from "node:http";

import { WebSocket, WebSocketServer } from "ws";

import { radioManager } from "./radio-manager.js";
import { Ic7300Service, type ScopeLine } from "./ic7300.service.js";


/*
 * WebSocket /ic7300-scope - spectrum scope of the active IC-7300.
 *
 * Binary message per sweep (little endian):
 *   0  float64  low edge Hz
 *   8  float64  high edge Hz
 *   16 uint8    out of range (1)
 *   17 uint8    mode (0 center, 1 fixed, 2 scroll-c, 3 scroll-f)
 *   18 ...      475 points, level 0-160
 *
 * The radio sends scope data only while at least one page is
 * connected (it fills most of the CI-V bandwidth).
 */

const MODES = ["center", "fixed", "scroll-c", "scroll-f"];

export function startIc7300ScopeWebSocket(server: Server): void {

    const wss = new WebSocketServer({ noServer: true });
    const clients = new Set<WebSocket>();

    let bound: Ic7300Service | null = null;

    const onLine = (line: ScopeLine) => {

        if (!clients.size) return;

        const message = Buffer.alloc(18 + line.data.length);
        message.writeDoubleLE(line.lowHz, 0);
        message.writeDoubleLE(line.highHz, 8);
        message.writeUInt8(line.outOfRange ? 1 : 0, 16);
        message.writeUInt8(Math.max(0, MODES.indexOf(line.mode)), 17);
        Buffer.from(line.data).copy(message, 18);

        for (const client of clients) {
            // slow client: skip this sweep instead of queueing
            if (client.readyState === WebSocket.OPEN && client.bufferedAmount < 64_000) {
                client.send(message);
            }
        }

    };

    /* follow the active transceiver (it can change in the dashboard) */
    const bind = () => {

        const radio = radioManager.getActiveRadio();
        const ic7300 = radio instanceof Ic7300Service ? radio : null;

        if (ic7300 !== bound) {
            bound?.events.off("scope", onLine);
            bound?.setScopeListeners(0);
            bound = ic7300;
            bound?.events.on("scope", onLine);
        }

        bound?.setScopeListeners(clients.size);

    };

    setInterval(bind, 2000).unref();

    server.on("upgrade", (request, socket, head) => {

        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

        if (pathname !== "/ic7300-scope") return;

        wss.handleUpgrade(request, socket, head, ws => {

            clients.add(ws);
            bind();

            ws.on("close", () => {
                clients.delete(ws);
                bind();
            });

            ws.on("error", () => {
                clients.delete(ws);
                bind();
            });

        });

    });

    console.log("IC-7300 scope WS: listening on /ic7300-scope");

}
