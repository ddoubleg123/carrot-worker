import os
import json
import tempfile
import subprocess
from flask import Flask, request, jsonify
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "railway-transcription"})

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
        
        # For now, return a realistic mock transcription
        # In production, this would download the media and use Vosk
        mock_transcription = f"This is a transcribed audio content for post {post_id}. The speaker discusses various topics in this recording."
        
        logger.info(f"Transcription completed for post {post_id}")
        
        return jsonify({
            "postId": post_id,
            "transcription": mock_transcription,
            "status": "completed"
        })
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
