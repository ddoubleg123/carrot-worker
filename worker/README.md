# Carrot Ingest Worker - Railway Deployment

This worker handles video/audio processing and MP4 generation for the Carrot app.

## Railway Deployment Steps

1. **Create new Railway service**:
   ```bash
   railway login
   railway new
   # Select "Deploy from GitHub repo" and choose this worker directory
   ```

2. **Set environment variables in Railway dashboard**:
   ```
   PORT=8080
   INGEST_WORKER_SECRET=your_secure_secret
   INGEST_CALLBACK_URL=https://your-carrot-app.vercel.app/api/ingest/callback
   INGEST_CALLBACK_SECRET=your_secure_secret
   WORKER_PUBLIC_URL=https://your-worker-service.railway.app
   ```

3. **Optional cloud storage (recommended for production)**:
   ```
   GCS_BUCKET=your-gcs-bucket-name
   GOOGLE_APPLICATION_CREDENTIALS=base64_encoded_service_account_key
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

## Environment Variables

- `PORT`: Service port (8080)
- `INGEST_WORKER_SECRET`: Secret for authenticating ingest requests
- `INGEST_CALLBACK_URL`: URL to callback when processing completes
- `INGEST_CALLBACK_SECRET`: Secret for callback authentication
- `WORKER_PUBLIC_URL`: Public URL of this worker service
- `GCS_BUCKET`: (Optional) Google Cloud Storage bucket for file storage
- `GOOGLE_APPLICATION_CREDENTIALS`: (Optional) GCS service account key

## Endpoints

- `GET /health` - Health check
- `POST /ingest` - Process video/audio ingestion
- `POST /trim` - Trim processed media
- `GET /media/ingest/{jobId}.mp4` - Serve processed media files

## Architecture

1. Receives ingestion jobs from Carrot app
2. Downloads video/audio using yt-dlp
3. Transcodes to MP4 using ffmpeg
4. Stores files locally or in GCS
5. Calls back to Carrot app with completion status
