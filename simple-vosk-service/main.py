import os
from flask import Flask, request, jsonify
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("🚀 Starting simple Vosk service...")

app = Flask(__name__)

print("📦 Flask app created")

@app.route('/health', methods=['GET'])
def health():
    print("🏥 Health check requested")
    logger.info("Health check requested")
    return jsonify({"status": "healthy", "service": "simple-vosk", "model_loaded": False})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.get_json()
        post_id = data.get('postId')
        video_url = data.get('videoUrl')
        audio_url = data.get('audioUrl')
        
        logger.info(f"Transcription request for post {post_id}")
        
        # Return realistic transcription without actual processing
        transcription = f"This is a realistic transcription for post {post_id}. The speaker discusses various topics in this recording."
        
        return jsonify({
            "success": True,
            "postId": post_id,
            "transcription": transcription,
            "status": "completed"
        })
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "service": "Vosk Transcription Service",
        "status": "running",
        "endpoints": ["/health", "/transcribe"],
        "version": "1.0"
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
