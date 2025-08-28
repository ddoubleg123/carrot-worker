# CASCADE AI - STARTUP GUIDE
**READ THIS FIRST EVERY SESSION**

## CRITICAL SYSTEM STATE

### Database & Architecture
- **Database**: SQLite at `carrot/prisma/dev.db`
- **Environment**: Windows development machine
- **URLs**: localhost:3005 (dev), gotcarrot.com (prod)
- **Tools Installed**: Google Cloud CLI, Docker, Node.js, Prisma

### SQLite & Prisma Studio (Windows)
- **Canonical DB path**: `carrot/prisma/dev.db`
- The app resolves `DATABASE_URL` to an absolute path internally. For Prisma Studio/CLI, set it explicitly to the absolute Windows path with forward slashes.

Steps to open Studio on the exact same DB:

```powershell
# From carrot/
$abs = (Resolve-Path .\prisma\dev.db).Path -replace '\\','/'
$env:DATABASE_URL = "file:$abs"   # NOTE: use file:C:/..., not file:/C:/
npx prisma studio --port 5556
```

Verify user and posts:
- In Studio (http://localhost:5556), open `User` → ensure `email`, `username`, `isOnboarded` are set.
- Open `Post` and filter by your `userId`.
- If tables look empty, click `Fields → All` to show all columns.

### Repository Structure
- **Main App**: `ddoubleg123/carrot` → `C:\Users\danie\CascadeProjects\windsurf-project\carrot\`
- **Video Ingestion**: `ddoubleg123/carrot-video-ingestion` → `C:\Users\danie\carrot-video-ingestion\`
- **⚠️ CRITICAL**: Video ingestion is in SEPARATE repository to avoid Railway Node.js detection issues

### Video Storage Architecture
- **Storage**: Firebase Storage with user-isolated namespaces
- **Path Structure**: `users/{uid}/{timestamp}_{index}_{filename}`
- **Security**: Storage rules enforce strict user isolation - users can only access their own files
- **Upload Flow**: ComposerModal → uploadFileToFirebase() → Firebase Storage → URL saved to database
- **Database Field**: Video URLs stored in `videoUrl` field with Firebase access tokens

### User's Main Issues (ONGOING)
1. **Avatar Display**: Custom uploaded profile photos disappear after page load due to hydration mismatches
2. **Transcription System**: Audio/video posts should auto-transcribe but currently use placeholder text
3. **Database Queries**: My command execution shows truncated output, making system verification difficult

### What Actually Works
- ✅ User authentication (Google OAuth)
- ✅ Post creation and display  
- ✅ File uploads to Firebase Storage
- ✅ Video processing via Cloudflare Stream
- ✅ Avatar system (with occasional hydration issues)

### What's Broken/Incomplete
- ❌ Real transcription (Vosk service not deployed, using placeholders)
- ❌ My ability to verify database state (commands succeed but show no output)
- ❌ Occasional avatar flickering on page load

## USER COMMUNICATION PREFERENCES
- **NO** unnecessary acknowledgment phrases like "You're absolutely right" or "I can see the issue"
- **Focus on direct problem-solving**
- **Don't assume tools are missing** - they're installed but my command output is truncated
- **Ask for manual verification** when my commands fail rather than making assumptions

## TRANSCRIPTION SYSTEM CURRENT STATE
- **Flow**: Post upload → trigger-transcription → transcribe → database update
- **Status**: Transcription service working but database updates failing (P2025 error)
- **Database Fields**: `audioTranscription`, `transcriptionStatus` in posts table
- **Auto-triggers**: Works for both audio and video posts
- **Current Issue**: Background process database connection differs from main app connection

## Transcription System Status
- **Current State**: Vosk transcription service DEPLOYED and ACTIVE
- **Service URL**: https://vosk-transcription-591459094147.us-central1.run.app
- **Location**: `carrot/transcription-service/` (Google Cloud Run deployment)
- **Cost**: ~$0.001 per transcription (very affordable)
- **Functionality**: Real speech-to-text transcription for audio/video posts
- **Environment Variable**: `TRANSCRIPTION_SERVICE_URL` in `.env.local`

## VIDEO INGESTION SERVICE
- **Repository**: `ddoubleg123/carrot-video-ingestion` (SEPARATE from main carrot repo)
- **Local Path**: `C:\Users\danie\carrot-video-ingestion\`
- **Technology**: Python FastAPI + yt-dlp + Redis
- **Deployment**: Railway (Docker build)
- **Status**: ✅ Successfully deployed
- **Purpose**: Video URL processing and metadata extraction
- **Files**: `main.py`, `requirements.txt`, `Dockerfile`
- **Integration**: Requires Railway service URL in carrot app config

## AVATAR SYSTEM PRIORITY
1. Database `profilePhoto` (user-uploaded)
2. Session `profilePhoto`  
3. Session OAuth `image`
4. Placeholder

## COMMON DEBUGGING ISSUES
- My commands return exit code 0 but show truncated output
- Database check scripts don't display results properly
- I often incorrectly assume things don't exist when they do
- User has audio/video posts but my queries don't show them

## DEPLOYMENT CONTEXT
- **Development**: Uses localhost:3005 endpoints
- **Production**: Uses gotcarrot.com endpoints
- **Transcription**: Google Cloud Run service (Vosk)
- **Video Ingestion**: Railway service (separate repository)
- **Database**: SQLite for development, production TBD

### Railway Video Ingestion Service
- **Status**: ✅ Deployed successfully
- **Repository**: `carrot-video-ingestion` (clean Python-only repo)
- **Build Method**: Docker (forced to avoid Node.js detection)
- **Required**: Redis service (needs to be added)
- **Integration**: Service URL needed in `carrot/.env.local`

## IMMEDIATE ACTIONS FOR NEW SESSIONS
1. Check `SYSTEM_STATE.md` for latest system status
2. Remember user has existing posts with audio/video
3. Don't assume missing tools - verify actual errors
4. Use todo_list tool to track progress
5. Focus on fixing transcription and avatar issues

## KEY FILES TO REMEMBER
- `carrot/src/app/api/audio/transcribe/route.ts` - Main transcription endpoint
- `carrot/src/app/api/audio/trigger-transcription/route.ts` - Triggers transcription
- `carrot/src/app/(app)/dashboard/DashboardClient.tsx` - Avatar display logic
- `carrot/prisma/schema.prisma` - Database schema
- `SYSTEM_STATE.md` - Detailed system documentation
- `DEPLOYMENT_ARCHITECTURE.md` - Complete deployment and repository structure

### Video Ingestion Service Files
- `C:\Users\danie\carrot-video-ingestion\main.py` - FastAPI service
- `C:\Users\danie\carrot-video-ingestion\requirements.txt` - Python dependencies
- `C:\Users\danie\carrot-video-ingestion\Dockerfile` - Docker build config

## USER'S FRUSTRATIONS
- I keep forgetting system state between sessions
- I make incorrect assumptions about missing tools/data
- I don't properly verify what actually exists in the database
- I suggest reinstalling things that are already installed

## Render Image Deploy Verification (carrot-worker)
Use these steps to verify Render is using the intended GHCR image and to interpret `/debug` correctly.

1. __Service type and Image URL__
   - Settings → Image URL must be the exact tag, e.g.
     `ghcr.io/ddoubleg123/carrot-worker:worker-<commit_sha>`
   - If GHCR is private, add a registry credential in Render (ghcr.io, GitHub username, PAT with read:packages) or make the package public.

2. __Deploy events__
   - Events → open the Deploy event. Prefer to see: “Pulling image ghcr.io/...”. If it’s missing, Render may be using a cached digest. Not necessarily a problem.

3. __/debug fields (from `carrot-worker/src/index.js`__
   - `deployment.commit` now includes:
     - `commit`: taken from `RELEASE_SHA || GITHUB_SHA || RENDER_GIT_COMMIT || 'unknown'`
     - `commitSource`: which env var provided it
     - `commitEnv`: echoes all three envs for transparency
   - `env.IMAGE_TAG` is optionally surfaced if you set it.

4. __Deterministic proof of the running build__
   - Set envs in Render → Environment and redeploy:
     - `RELEASE_SHA=<expected_full_sha>`
     - `IMAGE_TAG=ghcr.io/ddoubleg123/carrot-worker:worker-<commit_sha>`
   - Call `/debug` and confirm `deployment.commit` matches `RELEASE_SHA` and `env.IMAGE_TAG` matches.

5. __PORT behavior__
   - For Docker services on Render, PORT is injected (commonly 10000). Seeing 10000 is normal; do not set PORT manually.

6. __yt-dlp cookies and tools__
   - `/debug.tools` shows versions for `yt-dlp` and `ffmpeg`.
   - Cookies come from `YT_DLP_COOKIES` or `YT_DLP_COOKIES_FROM_BROWSER`. Inline Netscape cookies are supported and written to a temp file at runtime.

7. __Ingest auth__
   - Send `x-worker-secret` header matching `INGEST_WORKER_SECRET`. 401 indicates mismatch.

8. __Sanity workflow__
   - Verify `/debug` → run POST `/ingest` with secret → watch logs for yt-dlp/ffmpeg → confirm uploads and callback.
