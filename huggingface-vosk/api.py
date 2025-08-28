from flask import Flask, request, jsonify
import requests
import tempfile
import os
import json
import vosk
import soundfile as sf
import numpy as np
from pydub import AudioSegment

app = Flask(__name__)

# Download and load Vosk model
MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
MODEL_PATH = "vosk-model-small-en-us-0.15"

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("📥 Downloading Vosk model...")
        import zipfile
        response = requests.get(MODEL_URL, stream=True)
        with open("model.zip", "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        with zipfile.ZipFile("model.zip", 'r') as zip_ref:
            zip_ref.extractall(".")
        
        os.remove("model.zip")
        print("✅ Model downloaded successfully")

# Initialize model
print("🚀 Starting Vosk transcription API...")
download_model()
model = vosk.Model(MODEL_PATH)
print("✅ Vosk model loaded successfully")

def transcribe_audio_from_url(audio_url):
    """Download and transcribe audio from URL"""
    try:
        # Download audio
        print(f"📥 Downloading audio from {audio_url[:50]}...")
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.audio', delete=False) as temp_file:
            temp_file.write(response.content)
            temp_path = temp_file.name
        
        # Convert to WAV
        print("🔄 Converting audio to WAV...")
        audio = AudioSegment.from_file(temp_path)
        audio = audio.set_channels(1).set_frame_rate(16000)
        
        wav_path = temp_path + '.wav'
        audio.export(wav_path, format="wav")
        
        # Transcribe
        print("🎯 Transcribing audio...")
        transcription = transcribe_audio_file(wav_path)
        
        # Cleanup
        os.unlink(temp_path)
        os.unlink(wav_path)
        
        return transcription
        
    except Exception as e:
        print(f"❌ Error processing audio: {e}")
        raise

def transcribe_audio_file(audio_file_path):
    """Transcribe audio file using Vosk"""
    try:
        # Read audio file
        data, samplerate = sf.read(audio_file_path)
        
        # Convert to mono if stereo
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
        
        # Ensure 16kHz sample rate
        if samplerate != 16000:
            print(f"⚠️ Resampling from {samplerate}Hz to 16kHz")
            from scipy import signal
            data = signal.resample(data, int(len(data) * 16000 / samplerate))
            samplerate = 16000
        
        # Create recognizer
        rec = vosk.KaldiRecognizer(model, samplerate)
        rec.SetWords(True)
        
        # Process audio in chunks
        results = []
        chunk_size = 4000
        
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            chunk_bytes = (chunk * 32767).astype(np.int16).tobytes()
            
            if rec.AcceptWaveform(chunk_bytes):
                result = json.loads(rec.Result())
                if result.get('text'):
                    results.append(result['text'])
        
        # Get final result
        final_result = json.loads(rec.FinalResult())
        if final_result.get('text'):
            results.append(final_result['text'])
        
        # Combine results
        full_transcription = ' '.join(results).strip()
        
        return full_transcription if full_transcription else "No speech detected in audio."
        
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        raise

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "vosk-transcription-api",
        "model_loaded": model is not None
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Main transcription endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        post_id = data.get('postId')
        audio_url = data.get('audioUrl')
        video_url = data.get('videoUrl')
        
        if not post_id:
            return jsonify({"error": "postId is required"}), 400
        
        if not audio_url and not video_url:
            return jsonify({"error": "audioUrl or videoUrl is required"}), 400
        
        print(f"🎯 Starting transcription for post {post_id}")
        
        # Use audio URL or video URL
        media_url = audio_url or video_url
        
        # Transcribe the audio
        transcription = transcribe_audio_from_url(media_url)
        
        print(f"✅ Transcription completed: {transcription[:100]}...")
        
        return jsonify({
            "success": True,
            "postId": post_id,
            "transcription": transcription,
            "status": "completed"
        })
        
    except Exception as e:
        print(f"❌ API error: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "status": "failed"
        }), 500

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "service": "Vosk Transcription API",
        "status": "running",
        "endpoints": ["/health", "/transcribe"],
        "model": "vosk-model-small-en-us-0.15"
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🌐 Starting API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
