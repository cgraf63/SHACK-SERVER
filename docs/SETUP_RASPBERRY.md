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
