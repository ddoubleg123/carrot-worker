import os
import json
import logging
from flask import Flask, request, jsonify
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy", 
        "service": "local-transcription-service"
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
        
        # Generate realistic mock transcription based on post ID
        transcriptions = [
            "In this video, I discuss the importance of building reliable systems and the challenges we face when deploying cloud services.",
            "Today I'm sharing my thoughts on software development best practices and how to handle deployment issues effectively.",
            "This recording covers various technical topics including cloud infrastructure, API design, and system reliability.",
            "I'm talking about the recent challenges with our transcription service and how we're working to resolve them.",
            "In this audio, I explain the process of migrating services between cloud providers and ensuring uptime."
        ]
        
        # Use post ID hash to select consistent transcription
        transcription_index = hash(post_id) % len(transcriptions)
        mock_transcription = transcriptions[transcription_index]
        
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
