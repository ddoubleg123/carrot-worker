<<<<<<< HEAD
# Carrot Ingest Worker

A Node.js video ingestion worker service for the Carrot platform.

## Features

- Express.js HTTP server with health checks
- Firebase Storage integration
- Redis job queue support
- Docker containerized deployment
- CI/CD pipeline with GitHub Actions

## Environment Variables

Required:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Firebase service account JSON
- `FIREBASE_STORAGE_BUCKET` - Firebase Storage bucket name
- `REDIS_URL` - Redis connection string
- `INGEST_WORKER_SECRET` - Shared secret for authentication

Optional:
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (default: development)

## Development

```bash
npm install
npm run dev
```

## Deployment

The service is deployed using Docker images built in CI/CD:

1. Push to `main` branch triggers GitHub Actions
2. Docker image built and pushed to GHCR
3. Render deploys from the container image

## Health Check

- `GET /healthz` - Detailed health status
- `GET /` - Basic service info
=======
# carrot
>>>>>>> 275d151 (Add/ensure workflows)
