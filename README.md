# TitipJus Backend

[![CI](https://github.com/imamkasep-hash/Titipjus-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/imamkasep-hash/Titipjus-backend/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/imamkasep-hash/Titipjus-backend/actions/workflows/e2e.yml/badge.svg)](https://github.com/imamkasep-hash/Titipjus-backend/actions/workflows/e2e.yml)

Backend API untuk aplikasi TitipJus (delivery jus & minuman).

## 🚀 Tech Stack

- **Framework:** NestJS 12
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Auth:** Supabase Auth (ES256)
- **Payment:** Midtrans Snap
- **Realtime:** Socket.IO
- **Push Notif:** Firebase FCM

## 📚 API Documentation

- **Swagger:** `/api/docs`
- **API Base:** `/api/v1`
- **Health:** `/health`

## 🧪 Testing

- **Unit tests:** `pnpm test` (20 tests)
- **E2E tests:** `pnpm test:e2e` (90 tests)
- **Coverage:** `pnpm test:cov`

## 📦 Setup

```bash
pnpm install
cp .env.example .env  # Edit isi .env
pnpm run start:dev
