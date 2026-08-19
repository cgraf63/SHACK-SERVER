# SHACK-SERVER Installation Manual

## Prerequisites

### Recommended operating system

**Raspberry Pi OS Lite (64-bit)** is recommended for SHACK-SERVER.

A graphical desktop environment is not required. SHACK-SERVER runs as a server service and is administered over the network, via a web browser and SSH. The Lite version is therefore particularly suitable because it uses fewer resources and does not install unnecessary desktop components.

**Recommendation:**
- Raspberry Pi OS Lite (64-bit)
- no desktop/GUI installation required
- network connection to the Raspberry Pi
- SSH access for installation and administration

## About SHACK-SERVER

SHACK-SERVER is a Node.js/TypeScript server for amateur radio operation with a REST API, WebSocket support, DX cluster connections, Geo/QRZ enrichment and a web interface.

In addition, SHACK-SERVER can integrate stations from DX Summit (`dxsummit.fi`) and HolyCluster (`holycluster.org`). The Live Spots view shows through which DX clusters a station was found. The system also calculates a score: the more independent clusters report the same station, the higher the score.

For SOTA and POTA activations, a small triangle is displayed next to the callsign – green for POTA and white for SOTA.

The application can display the found callsigns on a zoomable map. SHACK-SERVER also includes a simple logging program with ADIF import and export.

## Software versions

The current installation uses:
- Debian 13 / Raspberry Pi OS Lite (64-bit)
- ARM64 / aarch64
- Node.js 22 or newer
- npm
- PM2

The `package.json` specifies:

```json
"engines": {
  "node": ">=22"
}
```

## Installing Node.js 22

The SHACK-SERVER requires Node.js 22 or newer. On Debian 13 ARM64, Node.js 22 is installed using NodeSource.

### 1. Update the system and install curl

```bash
sudo apt update
sudo apt install -y curl
```

### 2. Configure NodeSource for Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

### 3. Install Node.js

```bash
sudo apt install -y nodejs
```

### 4. Verify the installation

```bash
node --version
npm --version
```

A Node.js version `v22.x.x` should be displayed.

### 5. Install PM2

```bash
sudo npm install -g pm2
```

Verify:

```bash
pm2 --version
```

## SHACK-SERVER configuration

The application uses a `.env` file for environment-specific credentials and connection settings.

The `.env` file must **not** be committed to Git, because it may contain the QRZ password and other credentials.

Example of an anonymized `.env`:

```env
# Operator
SHACK_CALLSIGN=HB9xxx

QRZ_USER=HB9xxx
QRZ_PASSWORD=xxxxxxxxxx

# DXSpider #1
DXSPIDER1_HOST=
DXSPIDER1_PORT=7300
DXSPIDER1_CALLSIGN=HB9xxx
DXSPIDER1_PASSWORD=

# DXSpider #2
DXSPIDER2_HOST=
DXSPIDER2_PORT=7300
DXSPIDER2_CALLSIGN=HB9xxx
DXSPIDER2_PASSWORD=

# HolyCluster
HOLYCLUSTER_HOST=
HOLYCLUSTER_PORT=7300
HOLYCLUSTER_CALLSIGN=HB9xxx
HOLYCLUSTER_PASSWORD=

# DX Summit
DXSUMMIT_HOST=www.dxsummit.fi
DXSUMMIT_ENABLED=true
```

The application loads `.env` through `dotenv` when the server starts.

## Installing the project

Clone the repository and install the dependencies:

```bash
cd ~
git clone <REPOSITORY>
cd SHACK-SERVER
npm install
```

Build the application:

```bash
npm run build
```

Start it with PM2:

```bash
pm2 start dist/index.js --name shack-server
pm2 save
```

Enable PM2 at boot:

```bash
pm2 startup
```

Execute the command printed by PM2, then run:

```bash
pm2 save
```

## Ports

SHACK-SERVER uses two ports:

- **TCP 3000** – web interface and REST API
- **TCP 8000** – integrated DX Cluster Telnet server

The application listens on all interfaces.

Check the ports:

```bash
sudo ss -lntp | grep -E ':3000|:8000'
```

Port 8000 is also used for the SHACK-SERVER's own DX Cluster Telnet service. Outgoing connections to external DXSpider servers also use their configured port, normally 8000.

Test external DX Cluster connectivity, for example:

```bash
nc -vz -w 5 dxc.iapc.ch 8000
nc -vz -w 5 193.108.55.24 8000
```

## Verification

Check PM2:

```bash
pm2 status
pm2 describe shack-server
```

Check the logs:

```bash
pm2 logs shack-server --lines 30 --nostream
```

Test the web/API service locally:

```bash
curl -s http://localhost:3000/api/diagnostics
```

The diagnostics should show the configured sources and their current status.

## Configuration files

The application contains configuration files under:

```text
src/config/
```

Current configuration files include:

```text
location.config.ts
operator.config.ts
qrz.config.ts
settings.config.ts
```

Sensitive credentials should remain in `.env`.

## Updating SHACK-SERVER

After updating the source code:

```bash
cd ~/SHACK-SERVER
git pull
npm install
npm run build
pm2 restart shack-server
```

Then verify:

```bash
pm2 status
curl -s http://localhost:3000/api/diagnostics
```

## Troubleshooting

If the application does not start, first check:

```bash
pm2 status
pm2 logs shack-server --lines 100 --nostream
```

If the build fails:

```bash
npm run build
```

The error output from TypeScript should be corrected before restarting the production service.

If port 3000 or 8000 is not available:

```bash
sudo ss -lntp | grep -E ':3000|:8000'
```

If an external DX Cluster cannot be reached:

```bash
nc -vz -w 5 <HOST> 8000
```

Check the configured hostname, port and credentials.

