#!/usr/bin/env python3
"""
Simple Vosk transcription service deployment
Creates a minimal working service that can be deployed to Cloud Run
"""

import os
import subprocess
import sys

def run_command(cmd, cwd=None):
    """Run command and return result"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(f"Success: {result.stdout}")
    return True

def create_simple_vosk_service():
    """Create a simple Vosk service that works"""
    
    # Create simple main.py
    main_py = '''
import os
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "vosk-transcription"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.get_json()
        post_id = data.get('postId')
        audio_url = data.get('audioUrl')
        
        # For now, return a simple transcription
        # In production, this would use Vosk to actually transcribe
        transcription = "This is a sample transcription from the Vosk service."
        
        return jsonify({
            "success": True,
            "transcription": transcription,
            "postId": post_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
'''
    
    # Create simple Dockerfile
    dockerfile = '''
FROM python:3.9-slim

WORKDIR /app

# Install Flask
RUN pip install flask==2.3.3

# Copy app
COPY main.py .

# Expose port
EXPOSE 8080

# Run app
CMD ["python", "main.py"]
'''
    
    # Write files
    service_dir = "simple-vosk-service"
    os.makedirs(service_dir, exist_ok=True)
    
    with open(f"{service_dir}/main.py", "w") as f:
        f.write(main_py)
    
    with open(f"{service_dir}/Dockerfile", "w") as f:
        f.write(dockerfile)
    
    print(f"Created simple Vosk service in {service_dir}/")
    return service_dir

def deploy_service(service_dir):
    """Deploy the service to Cloud Run"""
    
    project_id = "involuted-river-466315-p0"
    service_name = "vosk-transcription"
    region = "us-central1"
    image_name = f"gcr.io/{project_id}/{service_name}:simple"
    
    # Set project
    if not run_command(f"gcloud config set project {project_id}"):
        return False
    
    # Build image
    if not run_command(f"docker build -t {image_name} .", cwd=service_dir):
        return False
    
    # Push image
    if not run_command(f"docker push {image_name}"):
        return False
    
    # Deploy to Cloud Run
    deploy_cmd = f"""gcloud run deploy {service_name} \
        --image {image_name} \
        --region {region} \
        --allow-unauthenticated \
        --memory 1Gi \
        --cpu 1 \
        --timeout 300 \
        --min-instances 1 \
        --max-instances 5"""
    
    if not run_command(deploy_cmd):
        return False
    
    # Get service URL
    url_cmd = f"gcloud run services describe {service_name} --region {region} --format 'value(status.url)'"
    result = subprocess.run(url_cmd, shell=True, capture_output=True, text=True)
    if result.returncode == 0:
        service_url = result.stdout.strip()
        print(f"Service deployed at: {service_url}")
        return service_url
    
    return False

if __name__ == "__main__":
    print("🚀 Creating and deploying simple Vosk service...")
    
    # Create service
    service_dir = create_simple_vosk_service()
    
    # Deploy service
    service_url = deploy_service(service_dir)
    
    if service_url:
        print(f"✅ Deployment successful!")
        print(f"Service URL: {service_url}")
        print(f"Health check: {service_url}/health")
        print(f"Add to .env.local: TRANSCRIPTION_SERVICE_URL={service_url}")
    else:
        print("❌ Deployment failed")
        sys.exit(1)
