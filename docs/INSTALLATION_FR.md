# Manuel d'installation de SHACK-SERVER

## Prérequis

### Système d'exploitation recommandé

**Raspberry Pi OS Lite (64 bits)** est recommandé pour SHACK-SERVER.

Aucune interface graphique n'est nécessaire. SHACK-SERVER fonctionne comme un service serveur et est administré via le réseau, avec un navigateur web et SSH. La version Lite est donc particulièrement adaptée, car elle utilise moins de ressources et n'installe pas de composants de bureau inutiles.

**Recommandation :**
- Raspberry Pi OS Lite (64 bits)
- aucune installation de bureau/interface graphique nécessaire
- connexion réseau au Raspberry Pi
- accès SSH pour l'installation et l'administration

## À propos de SHACK-SERVER

SHACK-SERVER est un serveur Node.js/TypeScript destiné à l'exploitation radioamateur, avec API REST, prise en charge WebSocket, connexions aux DX Cluster, enrichissement Geo/QRZ et interface web.

SHACK-SERVER peut également intégrer les stations provenant de DX Summit (`dxsummit.fi`) et de HolyCluster (`holycluster.org`). Dans la vue Live Spots, le système indique via quels DX Cluster une station a été trouvée. Le système calcule également un score : plus le nombre de clusters indépendants signalant la même station est élevé, plus le score est élevé.

Pour les activations SOTA et POTA, un petit triangle est affiché à côté du callsign – vert pour POTA et blanc pour SOTA.

L'application peut afficher les callsigns trouvés sur une carte zoomable. SHACK-SERVER comprend également un programme de log simple avec importation et exportation ADIF.

## Versions logicielles

L'installation actuelle utilise :
- Debian 13 / Raspberry Pi OS Lite (64 bits)
- ARM64 / aarch64
- Node.js 22 ou supérieur
- npm
- PM2

Le fichier `package.json` spécifie :

```json
"engines": {
  "node": ">=22"
}
```

## Installation de Node.js 22

SHACK-SERVER nécessite Node.js 22 ou supérieur. Sur Debian 13 ARM64, Node.js 22 est installé via NodeSource.

### 1. Mettre à jour le système et installer curl

```bash
sudo apt update
sudo apt install -y curl
```

### 2. Configurer NodeSource pour Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

### 3. Installer Node.js

```bash
sudo apt install -y nodejs
```

### 4. Vérifier l'installation

```bash
node --version
npm --version
```

Une version Node.js `v22.x.x` doit être affichée.

### 5. Installer PM2

```bash
sudo npm install -g pm2
```

Vérifier :

```bash
pm2 --version
```

## Configuration de SHACK-SERVER

L'application utilise un fichier `.env` pour les identifiants et paramètres de connexion spécifiques à l'installation.

Le fichier `.env` ne doit **pas** être ajouté à Git, car il peut contenir le mot de passe QRZ et d'autres identifiants.

Exemple de `.env` anonymisé :

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

L'application charge le fichier `.env` via `dotenv` lors du démarrage du serveur.

## Installation du projet

Cloner le dépôt et installer les dépendances :

```bash
cd ~
git clone <REPOSITORY>
cd SHACK-SERVER
npm install
```

Compiler l'application :

```bash
npm run build
```

Démarrer avec PM2 :

```bash
pm2 start dist/index.js --name shack-server
pm2 save
```

Activer PM2 au démarrage :

```bash
pm2 startup
```

Exécuter ensuite la commande affichée par PM2, puis :

```bash
pm2 save
```

## Ports

SHACK-SERVER utilise deux ports :

- **TCP 3000** – interface web et API REST
- **TCP 8000** – serveur Telnet DX Cluster intégré

L'application écoute sur toutes les interfaces.

Vérifier les ports :

```bash
sudo ss -lntp | grep -E ':3000|:8000'
```

Le port 8000 est également utilisé par le service Telnet DX Cluster propre à SHACK-SERVER. Les connexions sortantes vers les serveurs DXSpider externes utilisent le port configuré, normalement 8000.

Tester la connectivité vers des DX Cluster externes, par exemple :

```bash
nc -vz -w 5 dxc.iapc.ch 8000
nc -vz -w 5 193.108.55.24 8000
```

## Vérification

Vérifier PM2 :

```bash
pm2 status
pm2 describe shack-server
```

Vérifier les logs :

```bash
pm2 logs shack-server --lines 30 --nostream
```

Tester localement le service web/API :

```bash
curl -s http://localhost:3000/api/diagnostics
```

Les diagnostics doivent afficher les sources configurées et leur état actuel.

## Fichiers de configuration

Les fichiers de configuration se trouvent sous :

```text
src/config/
```

Les fichiers de configuration actuels comprennent :

```text
location.config.ts
operator.config.ts
qrz.config.ts
settings.config.ts
```

Les identifiants sensibles doivent rester dans `.env`.

## Mise à jour de SHACK-SERVER

Après une mise à jour du code source :

```bash
cd ~/SHACK-SERVER
git pull
npm install
npm run build
pm2 restart shack-server
```

Puis vérifier :

```bash
pm2 status
curl -s http://localhost:3000/api/diagnostics
```

## Dépannage

Si l'application ne démarre pas, vérifier d'abord :

```bash
pm2 status
pm2 logs shack-server --lines 100 --nostream
```

Si la compilation échoue :

```bash
npm run build
```

Les erreurs TypeScript doivent être corrigées avant de redémarrer le service de production.

Si le port 3000 ou 8000 n'est pas disponible :

```bash
sudo ss -lntp | grep -E ':3000|:8000'
```

Si un DX Cluster externe n'est pas accessible :

```bash
nc -vz -w 5 <HOST> 8000
```

Vérifier le nom d'hôte, le port et les identifiants configurés.

