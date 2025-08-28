#!/usr/bin/env python3
"""
Deploy Vosk transcription service to Google Cloud Run using Google Cloud APIs
"""

import os
import json
import time
import zipfile
import tempfile
import requests
from pathlib import Path

# Configuration
PROJECT_ID = "involuted-river-466315-p0"
SERVICE_NAME = "vosk-transcription"
REGION = "us-central1"
IMAGE_NAME = f"gcr.io/{PROJECT_ID}/{SERVICE_NAME}"

def get_access_token():
    """Get Google Cloud access token using gcloud CLI"""
    import subprocess
    try:
        result = subprocess.run(['gcloud', 'auth', 'print-access-token'], 
                              capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        print("❌ Failed to get access token. Make sure gcloud CLI is installed and authenticated.")
        return None

def create_source_archive():
    """Create a zip archive of the transcription service source code"""
    source_dir = Path("carrot/transcription-service")
    
    # Create temporary zip file
    with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_file:
        with zipfile.ZipFile(tmp_file.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in source_dir.rglob('*'):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    arcname = file_path.relative_to(source_dir)
                    zipf.write(file_path, arcname)
        
        return tmp_file.name

def submit_cloud_build(access_token, source_archive_path):
    """Submit build to Google Cloud Build"""
    
    # Upload source archive to Cloud Build
    url = f"https://cloudbuild.googleapis.com/v1/projects/{PROJECT_ID}/builds"
    
    build_config = {
        "steps": [
            {
                "name": "gcr.io/cloud-builders/docker",
                "args": ["build", "-t", f"{IMAGE_NAME}:latest", "."]
            },
            {
                "name": "gcr.io/cloud-builders/docker", 
                "args": ["push", f"{IMAGE_NAME}:latest"]
            }
        ],
        "images": [f"{IMAGE_NAME}:latest"]
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # For simplicity, we'll use the inline source approach
    with open(source_archive_path, 'rb') as f:
        source_data = f.read()
    
    # Create build with source
    build_request = {
        **build_config,
        "source": {
            "storageSource": {
                "bucket": f"{PROJECT_ID}_cloudbuild",
                "object": f"source/{int(time.time())}.zip"
            }
        }
    }
    
    print("🔨 Submitting build to Cloud Build...")
    response = requests.post(url, headers=headers, json=build_request)
    
    if response.status_code == 200:
        build = response.json()
        build_id = build['metadata']['build']['id']
        print(f"✅ Build submitted: {build_id}")
        return build_id
    else:
        print(f"❌ Build submission failed: {response.status_code}")
        print(response.text)
        return None

def wait_for_build(access_token, build_id):
    """Wait for Cloud Build to complete"""
    url = f"https://cloudbuild.googleapis.com/v1/projects/{PROJECT_ID}/builds/{build_id}"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    print("⏳ Waiting for build to complete...")
    
    while True:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            build = response.json()
            status = build.get('status', 'UNKNOWN')
            
            if status == 'SUCCESS':
                print("✅ Build completed successfully!")
                return True
            elif status in ['FAILURE', 'CANCELLED', 'TIMEOUT']:
                print(f"❌ Build failed with status: {status}")
                return False
            else:
                print(f"🔄 Build status: {status}")
                time.sleep(10)
        else:
            print(f"❌ Failed to check build status: {response.status_code}")
            return False

def deploy_to_cloud_run(access_token):
    """Deploy the built image to Cloud Run"""
    url = f"https://run.googleapis.com/apis/serving.knative.dev/v1/namespaces/{PROJECT_ID}/services"
    
    service_config = {
        "apiVersion": "serving.knative.dev/v1",
        "kind": "Service",
        "metadata": {
            "name": SERVICE_NAME,
            "namespace": PROJECT_ID,
            "annotations": {
                "run.googleapis.com/ingress": "all",
                "run.googleapis.com/ingress-status": "all"
            }
        },
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "autoscaling.knative.dev/minScale": "1",
                        "autoscaling.knative.dev/maxScale": "10",
                        "run.googleapis.com/cpu-throttling": "false"
                    }
                },
                "spec": {
                    "containerConcurrency": 80,
                    "timeoutSeconds": 900,
                    "containers": [
                        {
                            "image": f"{IMAGE_NAME}:latest",
                            "ports": [{"containerPort": 8080}],
                            "env": [
                                {
                                    "name": "MODEL_PATH",
                                    "value": "/app/models/vosk-model-small-en-us-0.15"
                                }
                            ],
                            "resources": {
                                "limits": {
                                    "cpu": "2000m",
                                    "memory": "2Gi"
                                }
                            }
                        }
                    ]
                }
            },
            "traffic": [
                {
                    "percent": 100,
                    "latestRevision": True
                }
            ]
        }
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print("🚀 Deploying to Cloud Run...")
    
    # Check if service exists (update vs create)
    get_url = f"{url}/{SERVICE_NAME}"
    get_response = requests.get(get_url, headers=headers)
    
    if get_response.status_code == 200:
        # Service exists, update it
        response = requests.put(get_url, headers=headers, json=service_config)
    else:
        # Service doesn't exist, create it
        response = requests.post(url, headers=headers, json=service_config)
    
    if response.status_code in [200, 201]:
        service = response.json()
        service_url = service.get('status', {}).get('url')
        print(f"✅ Service deployed successfully!")
        print(f"🌐 Service URL: {service_url}")
        return service_url
    else:
        print(f"❌ Deployment failed: {response.status_code}")
        print(response.text)
        return None

def main():
    print("🚀 Starting Vosk transcription service deployment...")
    
    # Get access token
    access_token = get_access_token()
    if not access_token:
        return False
    
    # Create source archive
    print("📦 Creating source archive...")
    source_archive = create_source_archive()
    
    try:
        # Submit build
        build_id = submit_cloud_build(access_token, source_archive)
        if not build_id:
            return False
        
        # Wait for build to complete
        if not wait_for_build(access_token, build_id):
            return False
        
        # Deploy to Cloud Run
        service_url = deploy_to_cloud_run(access_token)
        if not service_url:
            return False
        
        print("\n🎉 Deployment completed successfully!")
        print(f"📝 Add this to your .env.local:")
        print(f"TRANSCRIPTION_SERVICE_URL={service_url}")
        
        return True
        
    finally:
        # Clean up temporary files
        if os.path.exists(source_archive):
            os.unlink(source_archive)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
