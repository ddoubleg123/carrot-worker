import gradio as gr
import requests
import tempfile
import os
import json
import vosk
import soundfile as sf
import numpy as np
from pydub import AudioSegment

# Download and load Vosk model
MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
MODEL_PATH = "vosk-model-small-en-us-0.15"

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("Downloading Vosk model...")
        import zipfile
        response = requests.get(MODEL_URL, stream=True)
        with open("model.zip", "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        with zipfile.ZipFile("model.zip", 'r') as zip_ref:
            zip_ref.extractall(".")
        
        os.remove("model.zip")
        print("Model downloaded successfully")

# Initialize model
download_model()
model = vosk.Model(MODEL_PATH)

def transcribe_audio_file(audio_file):
    """Transcribe audio file using Vosk"""
    try:
        # Read audio file
        data, samplerate = sf.read(audio_file)
        
        # Convert to mono if stereo
        if len(data.shape) > 1:
            data = np.mean(data, axis=1)
        
        # Resample to 16kHz if needed
        if samplerate != 16000:
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
        return f"Error transcribing audio: {str(e)}"

def transcribe_from_url(audio_url, post_id=""):
    """Transcribe audio from URL"""
    try:
        # Download audio from URL
        response = requests.get(audio_url, timeout=30)
        response.raise_for_status()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.audio', delete=False) as temp_file:
            temp_file.write(response.content)
            temp_path = temp_file.name
        
        # Convert to WAV if needed
        try:
            audio = AudioSegment.from_file(temp_path)
            audio = audio.set_channels(1).set_frame_rate(16000)
            
            wav_path = temp_path + '.wav'
            audio.export(wav_path, format="wav")
            
            # Transcribe
            transcription = transcribe_audio_file(wav_path)
            
            # Cleanup
            os.unlink(temp_path)
            os.unlink(wav_path)
            
            return {
                "success": True,
                "postId": post_id,
                "transcription": transcription,
                "status": "completed"
            }
            
        except Exception as e:
            os.unlink(temp_path)
            return {
                "success": False,
                "error": str(e),
                "status": "failed"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "status": "failed"
        }

# Create Gradio interface
def gradio_transcribe(audio_file):
    if audio_file is None:
        return "Please upload an audio file."
    
    return transcribe_audio_file(audio_file)

def gradio_transcribe_url(url, post_id):
    if not url:
        return "Please provide an audio URL."
    
    result = transcribe_from_url(url, post_id)
    return json.dumps(result, indent=2)

# Create the interface
with gr.Blocks(title="Vosk Transcription Service") as demo:
    gr.Markdown("# 🎯 Vosk Speech Recognition Service")
    gr.Markdown("Real speech transcription using Vosk models")
    
    with gr.Tab("Upload Audio File"):
        audio_input = gr.Audio(type="filepath", label="Upload Audio File")
        transcribe_btn = gr.Button("Transcribe Audio")
        output_text = gr.Textbox(label="Transcription", lines=5)
        
        transcribe_btn.click(
            gradio_transcribe,
            inputs=[audio_input],
            outputs=[output_text]
        )
    
    with gr.Tab("Transcribe from URL"):
        url_input = gr.Textbox(label="Audio URL", placeholder="https://example.com/audio.mp3")
        post_id_input = gr.Textbox(label="Post ID (optional)", placeholder="post-123")
        transcribe_url_btn = gr.Button("Transcribe from URL")
        url_output = gr.Textbox(label="API Response", lines=10)
        
        transcribe_url_btn.click(
            gradio_transcribe_url,
            inputs=[url_input, post_id_input],
            outputs=[url_output]
        )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
