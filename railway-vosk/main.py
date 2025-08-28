import os
import json
import tempfile
import subprocess
import logging
from flask import Flask, request, jsonify
import requests
import vosk
import wave
import soundfile as sf
from pydub import AudioSegment
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Global model variable
model = None

def load_vosk_model():
    """Load Vosk model at startup"""
    global model
    try:
        model_path = os.environ.get('MODEL_PATH', '/app/vosk-model-small-en-us-0.15')
        
        # Download model if not exists
        if not os.path.exists(model_path):
            logger.info("Downloading Vosk model...")
            os.makedirs('/app', exist_ok=True)
            
            # Download and extract model
            import urllib.request
            import zipfile
            
            model_url = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
            zip_path = "/app/model.zip"
            
            urllib.request.urlretrieve(model_url, zip_path)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall('/app')
            
            os.remove(zip_path)
            logger.info("Model downloaded successfully")
        
        model = vosk.Model(model_path)
        logger.info("Vosk model loaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to load Vosk model: {e}")
        return False

def transcribe_audio(audio_data):
    """Transcribe audio using Vosk"""
    try:
        if model is None:
            return "Model not loaded"
        
        # Convert audio to required format (16kHz, mono, WAV)
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
        audio_segment = audio_segment.set_frame_rate(16000).set_channels(1)
        
        # Convert to WAV bytes
        wav_io = io.BytesIO()
        audio_segment.export(wav_io, format="wav")
        wav_data = wav_io.getvalue()
        
        # Create recognizer
        rec = vosk.KaldiRecognizer(model, 16000)
        
        # Process audio in chunks
        with wave.open(io.BytesIO(wav_data), 'rb') as wf:
            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if result.get('text'):
                        results.append(result['text'])
            
            # Get final result
            final_result = json.loads(rec.FinalResult())
            if final_result.get('text'):
                results.append(final_result['text'])
        
        return ' '.join(results)
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return f"Transcription failed: {str(e)}"

@app.route('/health', methods=['GET'])
def health():
    model_status = "loaded" if model else "not_loaded"
    return jsonify({
        "status": "healthy", 
        "service": "railway-vosk-transcription",
        "model": model_status
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.get_json()
        post_id = data.get('postId')
        video_url = data.get('videoUrl')
        audio_url = data.get('audioUrl')
        
        logger.info(f"Transcription request for post {post_id}")
        
        # Use video URL if available, otherwise audio URL
        media_url = video_url or audio_url
        if not media_url:
            return jsonify({"error": "No media URL provided"}), 400
        
        # Download media file
        logger.info(f"Downloading media from: {media_url[:80]}...")
        response = requests.get(media_url, timeout=30)
        response.raise_for_status()
        
        # Transcribe audio
        transcription = transcribe_audio(response.content)
        
        logger.info(f"Transcription completed for post {post_id}")
        
        return jsonify({
            "postId": post_id,
            "transcription": transcription,
            "status": "completed"
        })
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Load model at startup
    if load_vosk_model():
        logger.info("Starting Flask server...")
        port = int(os.environ.get('PORT', 8080))
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        logger.error("Failed to start server - model loading failed")
        exit(1)
