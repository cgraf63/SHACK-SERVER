cat > SETUP_RASPBERRY.md <<'EOF'
# SHACK-SERVER Recovery

## System

sudo apt update

sudo apt install -y git curl build-essential

## Node.js

Node version:
v22.x.x

## PM2

sudo npm install -g pm2

## Application

git clone https://github.com/cgraf63/SHACK-SERVER.git

cd SHACK-SERVER

npm ci

npm run build

pm2 start dist/index.js --name shack-server
pm2 save


# Caddy / HTTPS

Caddy is used as the HTTPS reverse proxy in front of SHACK-SERVER.

It provides:

- HTTPS access to the remote radio interface
- WebSocket support for RX/TX audio
- secure browser access for WebHID / CTR2-MIDI
- public access via the configured DNS name
- secure LAN access without requiring a public DNS entry


## Install Caddy

Official Debian/Raspberry Pi installation:

sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list

sudo apt update

sudo apt install caddy


## Caddy configuration

Edit:

sudo nano /etc/caddy/Caddyfile

Current configuration:

yaesu.internet-box.ch {
    reverse_proxy 127.0.0.1:3000
}

192.168.1.128 {
    tls internal
    reverse_proxy 127.0.0.1:3000
}


## Apply configuration

Validate the configuration:

sudo caddy validate --config /etc/caddy/Caddyfile

Reload Caddy:

sudo systemctl reload caddy

Check status:

sudo systemctl status caddy


## Access

Public access:

https://yaesu.internet-box.ch

LAN access:

https://192.168.1.128

The LAN address uses Caddy's internal CA.

The browser may initially report that the certificate is not trusted until the Caddy local CA certificate is installed/trusted on the client device.


## WebSockets / Remote Audio

SHACK-SERVER uses WebSockets for remote audio.

RX audio:

/audio

TX microphone audio:

/audio-tx

When the remote interface is accessed through HTTPS, the browser uses secure WebSockets:

wss://<host>/audio
wss://<host>/audio-tx

The HTTPS connection is required by modern browsers for microphone access and WebHID.


## Remote microphone

The remote interface can use the client device microphone for TX audio.

Requirements:

- HTTPS
- microphone permission granted in the browser
- microphone available on the client device

Audio format:

- 48 kHz
- mono
- 16-bit PCM

The microphone audio is sent through the TX WebSocket to SHACK-SERVER and played back through the configured ALSA audio device connected to the FTDX10.


## CTR2-MIDI / WebHID

The CTR2-MIDI controller is connected to the client computer/tablet via USB.

The remote interface accesses the controller using WebHID.

Requirements:

- HTTPS
- browser with WebHID support
- CTR2 connected via USB

Expected controller:

XIAO_ESP32S3

USB:

VID: 0x2886
PID: 0x0056

The VFO encoder is used to change the active radio frequency.

Current step:

10 Hz per encoder click

The active VFO (A/B) is handled by SHACK-SERVER.


## Network ports

SHACK-SERVER itself:

TCP 3000

Caddy:

TCP 80
TCP 443

Port 3000 should normally not be exposed directly to the Internet.

Remote clients should use HTTPS through Caddy.


## Caddy diagnostics

Check Caddy service:

systemctl status caddy

Check listening ports:

sudo ss -lntp | grep -E ':80|:443|:3000'

Validate configuration:

sudo caddy validate --config /etc/caddy/Caddyfile

Reload after configuration changes:

sudo systemctl reload caddy


## PM2 diagnostics

Check application:

pm2 status

View logs:

pm2 logs shack-server

Restart application:

pm2 restart shack-server


## Recovery summary

After a fresh Raspberry Pi installation:

1. Install Git, curl and build tools.
2. Install Node.js 22.x.
3. Install PM2.
4. Clone SHACK-SERVER.
5. Run `npm ci`.
6. Run `npm run build`.
7. Start SHACK-SERVER with PM2.
8. Install and configure Caddy.
9. Validate and reload Caddy.
10. Access the remote interface using HTTPS.

The direct SHACK-SERVER HTTP port is 3000.

Caddy provides the HTTPS frontend on ports 80/443.
