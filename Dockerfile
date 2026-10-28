#
# SHACK-SERVER - demo image for Windows, macOS and Linux (Docker Desktop)
#
#   docker run -d --name shack-demo -p 3000:3000 ghcr.io/cgraf63/shack-server:demo
#   -> http://localhost:3000
#
# Demo version (SHACK_DEMO=1): simulated transceiver, no remote audio /
# transmit, no online uploads, limited log. Live DX spots are real.
# The full version is installed on a Raspberry Pi with scripts/install.sh.

# ---------------------------------------------------------------- build
FROM node:22-bookworm-slim AS build

# serialport needs a compiler only when no prebuilt binary fits
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
 && npm prune --omit=dev

# -------------------------------------------------------------- runtime
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    SHACK_DEMO=1 \
    PORT=3000

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json callsignprefixes_iso_lower_ready.csv ./
COPY data/cty.dat ./data/cty.dat

RUN chown -R node:node /app/data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/demo').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
