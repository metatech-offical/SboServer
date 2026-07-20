# SboServer

Node/Express API for the SBO mobile app.

## Production

- **URL:** https://sboserver-production.up.railway.app  
- **API prefix:** `/v1/api/`  
- **Host:** Railway (service `SboServer`)

See the mobile repo notes for the full session write-up:

`SBOApp/docs/WHAT_WE_DID_2026-07-20.md`

## Stack

- MongoDB Atlas
- Railway Redis
- Cloudflare R2 (S3-compatible)
- Firebase Admin (`FIREBASE_SERVICE_ACCOUNT`)
- Resend for email OTP (SMTP is blocked on Railway Hobby)

## Local

```bash
cp .env.example .env   # if present; otherwise use existing .env
npm install
npm run dev            # http://localhost:8080
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with reload |
| `npm run build` | `tsc` → `dist/` |
| `npm start` | `node dist/index.js` (Railway) |

## Important env vars

`MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `FIREBASE_SERVICE_ACCOUNT`, `RESEND_API_KEY`, `RESEND_FROM`, R2/`AWS_*`, optional `OTP_DEBUG=true` for simulator testing.
