import subprocess
import json
import time

PROJECT_ID = "involuted-river-466315-p0"
SERVICE_NAME = "vosk-transcription"
REGION = "us-central1"

def run_gcloud_command(cmd):
    """Run gcloud command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {cmd}")
        print(f"Error: {e.stderr}")
        return None

def main():
    print("🚀 Deploying Vosk transcription service...")
    
    # Change to transcription service directory
    import os
    os.chdir("carrot/transcription-service")
    
    # Build and push image
    image_name = f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}"
    
    print("📦 Building Docker image...")
    if not run_gcloud_command(f"docker build -t {image_name} ."):
        return False
    
    print("📤 Pushing to Container Registry...")
    if not run_gcloud_command(f"docker push {image_name}"):
        return False
    
    print("🚀 Deploying to Cloud Run...")
    deploy_cmd = f"""gcloud run deploy {SERVICE_NAME} \
        --image {image_name} \
        --platform managed \
        --region {REGION} \
        --allow-unauthenticated \
        --memory 2Gi \
        --cpu 2 \
        --timeout 900 \
        --min-instances 1 \
        --max-instances 10 \
        --set-env-vars MODEL_PATH=/app/models/vosk-model-small-en-us-0.15 \
        --project {PROJECT_ID}"""
    
    if not run_gcloud_command(deploy_cmd):
        return False
    
    # Get service URL
    print("🔍 Getting service URL...")
    url_cmd = f"gcloud run services describe {SERVICE_NAME} --platform managed --region {REGION} --format='value(status.url)' --project {PROJECT_ID}"
    service_url = run_gcloud_command(url_cmd)
    
    if service_url:
        print(f"\n✅ Deployment successful!")
        print(f"🌐 Service URL: {service_url}")
        print(f"\n📝 Add to .env.local:")
        print(f"TRANSCRIPTION_SERVICE_URL={service_url}")
        return service_url
    
    return False

if __name__ == "__main__":
    main()
