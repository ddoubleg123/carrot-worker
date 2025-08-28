#!/usr/bin/env python3

import os
import json
import tempfile
import logging
from flask import Flask, request, jsonify
import vosk
import soundfile as sf
import numpy as np
from pydub import AudioSegment
import requests
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

print("🚀 Starting Vosk transcription service for Render...")
logger.info("🚀 Starting Vosk transcription service for Render...")

app = Flask(__name__)

print("📦 Flask app created")
logger.info("📦 Flask app created")

# Initialize Vosk model (download if needed)
MODEL_PATH = os.environ.get('MODEL_PATH', '/opt/render/project/src/models/vosk-model-small-en-us-0.15')
print(f"🔍 Looking for Vosk model at: {MODEL_PATH}")
logger.info(f"🔍 Looking for Vosk model at: {MODEL_PATH}")

model = None
try:
    # Check if model exists, download if not
    if not os.path.exists(MODEL_PATH):
        print(f"📥 Downloading Vosk model to {MODEL_PATH}...")
        logger.info(f"📥 Downloading Vosk model to {MODEL_PATH}...")
        
        import zipfile
        
        # Create models directory
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        
        model_url = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
        zip_path = os.path.join(os.path.dirname(MODEL_PATH), "vosk-model.zip")
        
        # Download model
        response = requests.get(model_url, stream=True)
        response.raise_for_status()
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Extract model
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(os.path.dirname(MODEL_PATH))
        
        os.remove(zip_path)
        print(f"✅ Vosk model downloaded and extracted to {MODEL_PATH}")
        logger.info(f"✅ Vosk model downloaded and extracted to {MODEL_PATH}")
    
    print(f"⏳ Loading Vosk model from {MODEL_PATH}...")
    logger.info(f"⏳ Loading Vosk model from {MODEL_PATH}...")
    model = vosk.Model(MODEL_PATH)
    print(f"✅ Vosk model loaded successfully from {MODEL_PATH}")
    logger.info(f"✅ Vosk model loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"❌ Failed to load Vosk model from {MODEL_PATH}: {e}")
    logger.error(f"❌ Failed to load Vosk model from {MODEL_PATH}: {e}")
    # Continue without model for health checks

def download_audio_from_firebase(audio_url):
    """Download audio file from Firebase Storage"""
    try:
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Failed to download audio: {e}")
        raise

def convert_audio_to_wav(audio_data):
    """Convert audio to WAV format suitable for Vosk"""
    try:
        # Save audio data to temporary file
        with tempfile.NamedTemporaryFile(suffix='.audio', delete=False) as temp_input:
            temp_input.write(audio_data)
            temp_input_path = temp_input.name

        # Convert to WAV using pydub
        audio = AudioSegment.from_file(temp_input_path)
        
        # Convert to mono, 16kHz (Vosk requirements)
        audio = audio.set_channels(1)
        audio = audio.set_frame_rate(16000)
        
        # Export to WAV
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_output:
            audio.export(temp_output.name, format="wav")
            temp_output_path = temp_output.name
        
        # Clean up input file
        os.unlink(temp_input_path)
        
        return temp_output_path
    except Exception as e:
        logger.error(f"Failed to convert audio: {e}")
        raise

def transcribe_audio(wav_file_path):
    """Transcribe audio using Vosk"""
    if model is None:
        raise Exception("Vosk model not loaded")
    
    try:
        # Read audio file
        data, samplerate = sf.read(wav_file_path)
        
        # Ensure 16kHz sample rate
        if samplerate != 16000:
            logger.warning(f"Audio sample rate is {samplerate}, expected 16000")
        
        # Create recognizer
        rec = vosk.KaldiRecognizer(model, samplerate)
        rec.SetWords(True)
        
        # Process audio in chunks
        results = []
        chunk_size = 4000
        
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            
            # Convert to bytes
            chunk_bytes = (chunk * 32767).astype(np.int16).tobytes()
            
            if rec.AcceptWaveform(chunk_bytes):
                result = json.loads(rec.Result())
                if result.get('text'):
                    results.append(result['text'])
        
        # Get final result
        final_result = json.loads(rec.FinalResult())
        if final_result.get('text'):
            results.append(final_result['text'])
        
        # Combine all results
        full_transcription = ' '.join(results).strip()
        
        return full_transcription if full_transcription else "No speech detected in audio."
        
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}")
        raise

def basic_cleanup(text):
    """Basic cleanup for transcription text"""
    try:
        # Capitalize first letter
        text = text.strip()
        if text:
            text = text[0].upper() + text[1:]
        
        # Add periods at the end if missing
        if text and not text.endswith(('.', '!', '?')):
            text += '.'
        
        return text
        
    except Exception as e:
        logger.error(f"Basic cleanup failed: {e}")
        return text

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    print("🏥 Health check requested")
    logger.info("🏥 Health check requested")
    
    try:
        response = {'status': 'healthy', 'model_loaded': model is not None, 'service': 'render-vosk'}
        print(f"🏥 Health check response: {response}")
        logger.info(f"🏥 Health check response: {response}")
        return jsonify(response)
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        logger.error(f"❌ Health check failed: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Main transcription endpoint"""
    try:
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        post_id = data.get('postId')
        audio_url = data.get('audioUrl')
        video_url = data.get('videoUrl')
        media_type = data.get('mediaType', 'audio')
        
        if not post_id or (not audio_url and not video_url):
            return jsonify({'error': 'postId and either audioUrl or videoUrl are required'}), 400
        
        logger.info(f"Starting transcription for post {post_id} (media type: {media_type})")
        
        # Download media file from Firebase
        media_url = audio_url or video_url
        logger.info(f"Downloading {media_type} file...")
        media_data = download_audio_from_firebase(media_url)
        
        # Convert to WAV (extracts audio from video if needed)
        logger.info(f"Converting {media_type} to WAV...")
        wav_file_path = convert_audio_to_wav(media_data)
        
        try:
            # Transcribe audio
            logger.info("Transcribing audio...")
            raw_transcription = transcribe_audio(wav_file_path)
            
            # Clean up transcription
            logger.info("Cleaning up transcription...")
            cleaned_transcription = basic_cleanup(raw_transcription)
            
            logger.info(f"Transcription completed for post {post_id}")
            logger.info(f"Raw: {raw_transcription[:100]}...")
            logger.info(f"Cleaned: {cleaned_transcription[:100]}...")
            
            return jsonify({
                'success': True,
                'postId': post_id,
                'transcription': cleaned_transcription,
                'status': 'completed'
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(wav_file_path):
                os.unlink(wav_file_path)
    
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        
        return jsonify({
            'success': False,
            'postId': post_id if 'post_id' in locals() else None,
            'transcription': f"Transcription failed: {str(e)}",
            'error': str(e),
            'status': 'failed'
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    print(f"🌐 Starting Flask server on port {port}")
    logger.info(f"🌐 Starting Flask server on port {port}")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        print(f"❌ Failed to start Flask server: {e}")
        logger.error(f"❌ Failed to start Flask server: {e}")
        raise
