import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { createPrivateKey, createPublicKey, sign, verify, X509Certificate, type KeyObject } from "node:crypto";


/*
 * LoTW callsign certificates.
 *
 * The user uploads the .p12 file exported from TQSL ("Save the
 * callsign certificate"). OpenSSL unpacks it (with "-legacy" for the
 * older encryption of many TQSL exports), the certificate and the
 * private key are kept in data/lotw/ (file mode 600, never sent to the
 * browser).
 *
 * LoTW-specific certificate fields (ARRL OID 1.3.6.1.4.1.12348.1.x):
 *   .1  callsign (subject)
 *   .2  QSO first date   .3  QSO end date   .4  DXCC entity number
 */

const DIRECTORY = path.join(process.cwd(), "data", "lotw");

const OID_CALLSIGN = "1.3.6.1.4.1.12348.1.1";
const OID_QSO_FIRST = "1.3.6.1.4.1.12348.1.2";
const OID_QSO_END = "1.3.6.1.4.1.12348.1.3";
const OID_DXCC = "1.3.6.1.4.1.12348.1.4";


export interface LotwCertInfo {
    callsign: string;
    name: string;
    dxcc: number;
    qsoFirstDate: string;      // YYYY-MM-DD
    qsoEndDate: string;        // YYYY-MM-DD
    validFrom: string;         // ISO
    validTo: string;           // ISO
    serial: string;
    importedAt: string;
}

export interface LotwCredentials {
    info: LotwCertInfo;
    certificatePem: string;
    key: KeyObject;
}


/* ------------------------------------------------------------------
 * Minimal DER reader: find the value that follows an OID
 * ------------------------------------------------------------------ */

interface Tlv { tag: number; start: number; header: number; length: number; }

function readTlv(der: Buffer, offset: number): Tlv | null {

    if (offset + 2 > der.length) return null;

    const tag = der[offset] ?? 0;
    let length = der[offset + 1] ?? 0;
    let header = 2;

    if (length & 0x80) {
        const bytes = length & 0x7f;
        if (bytes === 0 || bytes > 4 || offset + 2 + bytes > der.length) return null;
        length = 0;
        for (let i = 0; i < bytes; i++) length = length * 256 + (der[offset + 2 + i] ?? 0);
        header += bytes;
    }

    if (offset + header + length > der.length) return null;

    return { tag, start: offset, header, length };

}

function decodeOid(bytes: Buffer): string {

    if (!bytes.length) return "";

    const first = bytes[0] ?? 0;
    const parts = [Math.floor(first / 40), first % 40];
    let value = 0;

    for (let i = 1; i < bytes.length; i++) {
        const b = bytes[i] ?? 0;
        value = value * 128 + (b & 0x7f);
        if (!(b & 0x80)) {
            parts.push(value);
            value = 0;
        }
    }

    return parts.join(".");

}

/* text of a value: string types directly, OCTET STRING may wrap a string */
function valueText(der: Buffer, tlv: Tlv): string {

    const content = der.subarray(tlv.start + tlv.header, tlv.start + tlv.header + tlv.length);

    if (tlv.tag === 0x04) {
        const inner = readTlv(content, 0);
        if (inner && [0x0c, 0x13, 0x16, 0x14, 0x1a].includes(inner.tag) && inner.header + inner.length === content.length) {
            return valueText(content, inner);
        }
    }

    return content.toString("latin1").replace(/[^\x20-\x7e]/g, "").trim();

}

/* walk the DER tree, collect OID -> text of the next non-boolean sibling */
function collectOidValues(der: Buffer, from = 0, to = der.length, out = new Map<string, string>()): Map<string, string> {

    let offset = from;
    let pendingOid: string | null = null;

    while (offset < to) {

        const tlv = readTlv(der, offset);

        if (!tlv) break;

        const contentStart = tlv.start + tlv.header;
        const end = contentStart + tlv.length;

        if (tlv.tag === 0x06) {
            pendingOid = decodeOid(der.subarray(contentStart, end));
        }
        else if (pendingOid && tlv.tag !== 0x01) {
            if (!out.has(pendingOid)) out.set(pendingOid, valueText(der, tlv));
            pendingOid = null;
        }

        // constructed (SEQUENCE, SET, context): descend
        if (tlv.tag & 0x20) {
            collectOidValues(der, contentStart, end, out);
        }

        offset = end;

    }

    return out;

}


/* ------------------------------------------------------------------
 * OpenSSL
 * ------------------------------------------------------------------ */

function openssl(args: string[], password: string): Promise<string> {

    return new Promise((resolve, reject) => {
        execFile(
            "openssl",
            args,
            { env: { ...process.env, LOTW_P12_PASS: password }, timeout: 20_000, maxBuffer: 2 * 1024 * 1024 },
            (error, stdout, stderr) => {
                if (error) reject(new Error(String(stderr || error.message).trim()));
                else resolve(stdout);
            }
        );
    });

}

async function unpackP12(file: string, password: string): Promise<string> {

    const base = ["pkcs12", "-in", file, "-nodes", "-passin", "env:LOTW_P12_PASS"];

    try {
        return await openssl(base, password);
    }
    catch (first) {
        // OpenSSL 3 needs "-legacy" for RC2 / 3DES encrypted exports
        try {
            return await openssl([...base, "-legacy"], password);
        }
        catch {
            throw first;
        }
    }

}

function pemBlocks(text: string, type: RegExp): string[] {

    const blocks: string[] = [];
    const re = /-----BEGIN ([A-Z ]+)-----[\s\S]+?-----END \1-----/g;
    let match: RegExpExecArray | null;

    while ((match = re.exec(text))) {
        if (type.test(match[1] ?? "")) blocks.push(match[0]);
    }

    return blocks;

}

function dateOnly(value: string): string {

    const match = /(\d{4})-?(\d{2})-?(\d{2})/.exec(value);

    return match ? `${match[1]}-${match[2]}-${match[3]}` : "";

}


/* ------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------ */

function safeId(accountId: string): string {

    return String(accountId).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80);

}

function files(accountId: string): { cert: string; key: string; meta: string } {

    const id = safeId(accountId);

    return {
        cert: path.join(DIRECTORY, `${id}.cert.pem`),
        key: path.join(DIRECTORY, `${id}.key.pem`),
        meta: path.join(DIRECTORY, `${id}.json`)
    };

}

const cache = new Map<string, LotwCredentials | null>();


/*
 * Read a .p12 file: returns the certificate data, throws a readable
 * message (wrong password, key-only file, no LoTW certificate).
 */
export async function importP12(accountId: string, p12: Buffer, password: string): Promise<LotwCertInfo> {

    if (!p12.length || p12.length > 200_000) {
        throw new Error("Not a certificate file");
    }

    fs.mkdirSync(DIRECTORY, { recursive: true, mode: 0o700 });

    const temp = path.join(DIRECTORY, `.import-${process.pid}-${Date.now()}.p12`);

    fs.writeFileSync(temp, p12, { mode: 0o600 });

    let pem: string;

    try {
        pem = await unpackP12(temp, password);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/mac verify|invalid password|bad decrypt/i.test(message)) {
            throw new Error("Wrong certificate password (TQSL export password)");
        }
        throw new Error(`Cannot read the .p12 file: ${message.split("\n").pop()}`);
    }
    finally {
        fs.rmSync(temp, { force: true });
    }

    const keyPem = pemBlocks(pem, /PRIVATE KEY/)[0];
    const certs = pemBlocks(pem, /^CERTIFICATE$/);

    if (!keyPem) {
        throw new Error("The file contains no private key - export the callsign certificate from TQSL (Callsign Certificates → Save), not the .tq6 file");
    }

    // the callsign certificate is the one with the LoTW callsign field
    let found: { pem: string; values: Map<string, string>; x509: X509Certificate } | null = null;

    for (const certPem of certs) {
        const x509 = new X509Certificate(certPem);
        const values = collectOidValues(x509.raw);
        if (values.get(OID_CALLSIGN)) {
            found = { pem: certPem, values, x509 };
            break;
        }
    }

    if (!found) {
        throw new Error(certs.length
            ? "No LoTW callsign certificate in this file (key-only file? The request may not be processed by LoTW yet)"
            : "The file contains no certificate");
    }

    const key = createPrivateKey(keyPem);

    if (!found.x509.checkPrivateKey(key)) {
        throw new Error("Private key does not match the certificate");
    }

    // round trip: sign and verify a test string
    const probe = Buffer.from("SHACK-SERVER LOTW TEST");
    const signature = sign("sha1", probe, key);
    if (!verify("sha1", probe, createPublicKey(found.x509.publicKey.export({ type: "spki", format: "pem" })), signature)) {
        throw new Error("Signature test failed");
    }

    const cnMatch = /(?:^|\n)CN=([^\n]+)/.exec(found.x509.subject);

    const info: LotwCertInfo = {
        callsign: String(found.values.get(OID_CALLSIGN)).toUpperCase(),
        name: cnMatch?.[1]?.trim() ?? "",
        dxcc: Number(found.values.get(OID_DXCC)) || 0,
        qsoFirstDate: dateOnly(found.values.get(OID_QSO_FIRST) ?? ""),
        qsoEndDate: dateOnly(found.values.get(OID_QSO_END) ?? ""),
        validFrom: new Date(found.x509.validFrom).toISOString(),
        validTo: new Date(found.x509.validTo).toISOString(),
        serial: found.x509.serialNumber,
        importedAt: new Date().toISOString()
    };

    if (!info.dxcc) {
        throw new Error("The certificate has no DXCC entity");
    }

    const f = files(accountId);

    fs.writeFileSync(f.key, keyPem.trim() + "\n", { mode: 0o600 });
    fs.writeFileSync(f.cert, found.pem.trim() + "\n", { mode: 0o600 });
    fs.writeFileSync(f.meta, JSON.stringify(info, null, 2), { mode: 0o600 });

    cache.delete(accountId);

    return info;

}

export function getCertInfo(accountId: string): LotwCertInfo | null {

    try {
        return JSON.parse(fs.readFileSync(files(accountId).meta, "utf8")) as LotwCertInfo;
    }
    catch {
        return null;
    }

}

export function getCredentials(accountId: string): LotwCredentials | null {

    if (cache.has(accountId)) return cache.get(accountId) ?? null;

    let result: LotwCredentials | null = null;

    try {
        const f = files(accountId);
        const info = JSON.parse(fs.readFileSync(f.meta, "utf8")) as LotwCertInfo;
        result = {
            info,
            certificatePem: fs.readFileSync(f.cert, "utf8"),
            key: createPrivateKey(fs.readFileSync(f.key, "utf8"))
        };
    }
    catch {
        result = null;
    }

    cache.set(accountId, result);

    return result;

}

export function deleteCertificate(accountId: string): void {

    const f = files(accountId);

    for (const file of [f.cert, f.key, f.meta]) fs.rmSync(file, { force: true });

    cache.delete(accountId);

}

/* problems that stop uploads (expired, not yet valid) */
export function certProblem(info: LotwCertInfo, now = new Date()): string | null {

    if (now < new Date(info.validFrom)) return "LoTW certificate not valid yet";
    if (now > new Date(info.validTo)) return "LoTW certificate expired - renew it in TQSL and upload the new .p12";

    return null;

}
