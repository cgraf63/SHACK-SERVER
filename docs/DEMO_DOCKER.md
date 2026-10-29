# SHACK-SERVER – Demo (Docker)

Try SHACK-SERVER on your own computer in a few minutes – **no Raspberry Pi, no transceiver, no changes to your station**.

The demo runs in a Docker container on **Windows, macOS or Linux**. It uses a **simulated transceiver** and shows **real live DX spots** from the clusters.

---

## 1. Requirements

| System | What you need |
|---|---|
| Windows 10 / 11 | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| macOS (Intel or Apple Silicon) | [Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Linux (64-bit, x86 or ARM) | Docker Engine, e.g. `sudo apt install docker.io` |

Install Docker and start it once (Docker Desktop: wait until it shows "Engine running").

An internet connection is needed for the live spots.

---

## 2. Start the demo

Open a terminal (Windows: **PowerShell**, macOS: **Terminal**) and run:

```bash
docker run -d --name shack-demo -p 3000:3000 ghcr.io/cgraf63/shack-server:demo
```

On Linux, put `sudo` in front of `docker` if your user is not in the `docker` group.

The first start downloads the image (a few hundred MB). After a few seconds open:

**http://localhost:3000**

Other devices in your home network (tablet, phone) can use `http://<IP-of-this-computer>:3000`.

---

## 3. What you can try

- **Dashboard** with live DX spots from several clusters (DXSpider, DX Summit, HolyCluster), score, filters, map
- **Click a spot** → the simulated "DEMO TRANSCEIVER" follows frequency and mode
- **QSO Log** with sample QSOs – log your own QSOs, edit, search, filter, ADIF export
- **Contest Console** and **QSO History** with a sample CQ WW session, Cabrillo export
- **Diagnostics**, propagation overview, bandplan, RBN
- **Settings → Station**: enter your own callsign and locator

A yellow **DEMO** bar at the bottom shows that you are in the demo version.

---

## 4. Limits of the demo

| Feature | Demo |
|---|---|
| Transceiver | simulated only – no real CAT |
| Remote audio, microphone, PTT, transmitting | disabled |
| Uploads to QRZ.com / Club Log / LoTW | disabled |
| WSJT-X interface, SDR | disabled |
| Log | max. 100 QSOs (contest log: 200) |
| ADIF import | disabled |
| Settings | station data only |
| Restart / reboot / shutdown | disabled |

---

## 5. Stop, reset, update

```bash
docker stop shack-demo          # stop (data is kept)
docker start shack-demo         # start again

docker rm -f shack-demo         # remove - resets the demo to the sample data
docker pull ghcr.io/cgraf63/shack-server:demo   # get the newest demo version
```

After `docker pull`, remove the old container and start it again with the command from step 2.

Remove the image completely:

```bash
docker rmi ghcr.io/cgraf63/shack-server:demo
```

---

## 6. Troubleshooting

**Port 3000 is already in use** – use another port, e.g. 3080:

```bash
docker run -d --name shack-demo -p 3080:3000 ghcr.io/cgraf63/shack-server:demo
```

Then open **http://localhost:3080**.

**"docker: command not found" / "Cannot connect to the Docker daemon"** – Docker is not installed or not running. Start Docker Desktop and wait until it is ready.

**No spots** – check the internet connection. The first spots usually appear within a minute.

**Show the log output** of the demo:

```bash
docker logs -f shack-demo
```

---

## 7. Full version

The full version runs on a **Raspberry Pi** (recommended: Pi 4 or 5, 64-bit Raspberry Pi OS) connected to your transceivers – with CAT control, remote audio, uploads to QRZ.com and Club Log, WSJT-X integration and more.

Installation: [INSTALLATION_EN.md](INSTALLATION_EN.md) · [INSTALLATION_DE.md](INSTALLATION_DE.md)

Project: https://github.com/cgraf63/SHACK-SERVER
