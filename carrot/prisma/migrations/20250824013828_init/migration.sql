-- AlterTable
ALTER TABLE "User" ADD COLUMN "privacy_accepted_at" DATETIME;
ALTER TABLE "User" ADD COLUMN "privacy_version" TEXT;
ALTER TABLE "User" ADD COLUMN "tos_accepted_at" DATETIME;
ALTER TABLE "User" ADD COLUMN "tos_version" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "audioTranscription" TEXT;
ALTER TABLE "posts" ADD COLUMN "caption_vtt_url" TEXT;
ALTER TABLE "posts" ADD COLUMN "cf_duration_sec" REAL;
ALTER TABLE "posts" ADD COLUMN "cf_height" INTEGER;
ALTER TABLE "posts" ADD COLUMN "cf_playback_url_hls" TEXT;
ALTER TABLE "posts" ADD COLUMN "cf_status" TEXT;
ALTER TABLE "posts" ADD COLUMN "cf_uid" TEXT;
ALTER TABLE "posts" ADD COLUMN "cf_width" INTEGER;
ALTER TABLE "posts" ADD COLUMN "transcriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "ingest_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "user_id" TEXT,
    "post_id" TEXT,
    "source_url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER,
    "error" TEXT,
    "media_url" TEXT,
    "cf_uid" TEXT,
    "cf_status" TEXT,
    "duration_sec" REAL,
    "width" INTEGER,
    "height" INTEGER,
    "title" TEXT,
    "channel" TEXT
);

-- CreateTable
CREATE TABLE "source_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "source_url_raw" TEXT NOT NULL,
    "source_url_normalized" TEXT NOT NULL,
    "external_id" TEXT,
    "storage_uri" TEXT,
    "content_hash" TEXT,
    "duration_sec" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "fps" REAL,
    "title" TEXT,
    "author_handle" TEXT,
    "published_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL DEFAULT 1,
    "refcount" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_videos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'original_ref',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title_override" TEXT,
    "notes" TEXT,
    "poster_uri" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_videos_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "source_assets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "video_variants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_video_id" TEXT NOT NULL,
    "derived_from_asset_id" TEXT NOT NULL,
    "variant_kind" TEXT NOT NULL DEFAULT 'edit',
    "storage_uri" TEXT NOT NULL,
    "content_hash" TEXT,
    "duration_sec" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "fps" REAL,
    "edit_manifest" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "video_variants_user_video_id_fkey" FOREIGN KEY ("user_video_id") REFERENCES "user_videos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "video_variants_derived_from_asset_id_fkey" FOREIGN KEY ("derived_from_asset_id") REFERENCES "source_assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "source_url_raw" TEXT NOT NULL,
    "source_url_normalized" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "external_id" TEXT,
    "asset_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ingestion_jobs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "source_assets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "source_assets_source_url_normalized_key" ON "source_assets"("source_url_normalized");

-- CreateIndex
CREATE INDEX "source_assets_content_hash_idx" ON "source_assets"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_assets_platform_external_id_key" ON "source_assets"("platform", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_videos_user_id_asset_id_key" ON "user_videos"("user_id", "asset_id");

-- CreateIndex
CREATE INDEX "video_variants_derived_from_asset_id_idx" ON "video_variants"("derived_from_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingestion_jobs_idempotency_key_key" ON "ingestion_jobs"("idempotency_key");
