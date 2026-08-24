# TMS Multi-Tenant Deployment Guide — Pre-Production Client Demo

Panduan lengkap deployment multi-tenant **TMS SaaS** untuk demo & pre-production dengan domain `digitalinaja.net`.

---

## 🏛️ Arsitektur Multi-Tenant

Satu aplikasi Backend Node.js melayani secara otomatis seluruh tenant (`gercepin` dan `dam`) dengan menggunakan model **Database-Per-Tenant**:

| Komponen | Platform Hosting | Subdomain / Target | Status Database |
|---|---|---|---|
| **Frontend UI** | Vercel | `https://tms.digitalinaja.net` | — |
| **Backend API** | Back4app Containers | `https://api-tms.digitalinaja.net` | — |
| **Auth & Shared DB** | Neon PostgreSQL (Singapore) | `tms_db` | ✅ **100% Imported & Verified** |
| **Tenant GERCEPIN DB** | Neon PostgreSQL (Singapore) | `tmsf_gercepin` | ✅ **100% Imported & Verified** |
| **Tenant DAM DB** | Neon PostgreSQL (Singapore) | `tmsf_dam` | ✅ **100% Imported & Verified** |

---

## 🐳 Docker Deployment (Back4app Containers)

Backend disiapkan dengan Dockerfile multi-stage production (`backend/Dockerfile`):

- **Base Image**: `node:22-alpine`
- **Build Stage**: Compiles TypeScript (`tsc`) to `dist/`
- **Runner Stage**: Minimal Node.js 22 runtime, non-root user ready, installs `--only=production` dependencies
- **Port Exposure**: `10000` (dapat dikustomisasi via `PORT` env var)
- **Host Binding**: `0.0.0.0`
- **Health Check Endpoint**: `/health`

### Command Docker Lokal (Testing Container):
```bash
# Build image
docker build -t tms-backend:latest ./backend

# Run container
docker run -d -p 10000:10000 --env-file ./backend/.env tms-backend:latest
```

---

## 🔑 Environment Variables Documentation

### Backend (Back4app Containers Environment)

```env
# Server Runtime
NODE_ENV=production
PORT=10000

# Primary Auth & Shared Database Connection (Points to tms_db)
DATABASE_URL=postgresql://neondb_owner:YOUR_NEON_PASSWORD@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require

# Maximum Connection Pool Size per Tenant Database (Neon Free Tier limit: 5)
TENANT_POOL_MAX=5

# Better Auth Configuration
BETTER_AUTH_SECRET=YOUR_RANDOM_SECRET_32_PLUS_CHARS
BETTER_AUTH_URL=https://api-tms.digitalinaja.net

# Frontend URL & Multi-Tenant CORS Allowlist
FRONTEND_URL=https://tms.digitalinaja.net
CORS_ORIGINS=https://tms.digitalinaja.net,https://tmsgercepin.digitalinaja.net,https://gercepin.digitalinaja.net,https://dam.digitalinaja.net
UPLOAD_DIR=uploads
```

### Frontend (Vercel Environment)

```env
VITE_API_BASE_URL=https://api-tms.digitalinaja.net
```

---

## 🌐 Cloudflare DNS Configuration

Tambahkan 2 CNAME Record di dashboard **Cloudflare / Registrar Domain `digitalinaja.net`**:

1. **Backend Container CNAME (Back4app)**:
   - **Type**: `CNAME`
   - **Name**: `api-tms`
   - **Target**: `<back4app-app-id>.b4a.run` (atau CNAME yang diberikan Back4app Containers)
   - **Proxy Status**: Proxied / DNS Only

2. **Frontend UI CNAME (Vercel)**:
   - **Type**: `CNAME`
   - **Name**: `tms`
   - **Target**: `cname.vercel-dns.com`
   - **Proxy Status**: DNS Only / Proxied

---

## 🧪 Health & Verification Endpoint

- **Health Check URL**: `https://api-tms.digitalinaja.net/health`
- **Expected Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-24T18:12:19.000Z"
  }
  ```
