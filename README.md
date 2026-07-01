# MacOps

Interne webapp voor ABM-serienummerzoekacties, MDM-assignment en Jamf PreStage-keuze.

## Lokaal draaien

```bash
npm install
npm run prisma:deploy
npm run seed
npm run dev
```

Open daarna [http://localhost:3000](http://localhost:3000). De lokale `.env` gebruikt mock-login en mock-integraties.

## Docker

De container luistert intern op poort `3000`, maar de meegeleverde Compose-configuratie publiceert de app standaard op hostpoort `8080`.

```bash
docker compose -f docker-compose.yaml up --build
```

Open daarna [http://localhost:8080](http://localhost:8080).

De container draait als non-root user, gebruikt `/data/macops.sqlite` voor persistente opslag en past bij start de Prisma migration SQL idempotent toe.

Losse Docker-run zonder Compose:

```bash
docker build -t macops:local .
docker run --rm \
  -p 8080:3000 \
  -v macops-data:/data \
  -e APP_BASE_URL=http://localhost:8080 \
  -e DATABASE_URL=file:/data/macops.sqlite \
  -e SESSION_SECRET=change-this-before-any-shared-environment \
  -e AUTH_MOCK_ENABLED=true \
  -e INTEGRATION_MODE=mock \
  macops:local
```

## Live integraties

Zet minimaal deze waarden en schakel mock uit:

```bash
AUTH_MOCK_ENABLED=false
INTEGRATION_MODE=live
APP_BASE_URL=https://macops.example.org
SESSION_SECRET=<lange-random-string>
PING_ENTRY_POINT=<ping-sso-url>
PING_IDP_CERT_PATH=/run/secrets/ping-idp-cert.pem
ABM_CLIENT_ID=<apple-business-api-client-id>
ABM_KEY_ID=<apple-business-api-key-id>
ABM_PRIVATE_KEY_PATH=/run/secrets/abm-private-key.pem
JAMF_BASE_URL=https://tenant.jamfcloud.com
JAMF_CLIENT_ID=<jamf-api-client-id>
JAMF_CLIENT_SECRET_PATH=/run/secrets/jamf-client-secret
```

MDM- en PreStage-mappings staan in SQLite en worden met defaults gevuld. Pas `appleServerId`, `jamfId` en `versionLock` aan voordat je live mutaties uitvoert.

## Checks

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```
