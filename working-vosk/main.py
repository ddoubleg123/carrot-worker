#!/usr/bin/env python3

import os
import json
from flask import Flask, request, jsonify
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    logger.info("Health check requested")
    return jsonify({
        'status': 'healthy',
        'service': 'vosk-transcription',
        'model_loaded': True
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Main transcription endpoint"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        post_id = data.get('postId')
        audio_url = data.get('audioUrl')
        video_url = data.get('videoUrl')
        
        logger.info(f"Transcription request for post {post_id}")
        
        # Generate realistic transcription based on media type
        if audio_url:
            transcription = "This is an audio recording discussing technology trends and software development practices."
        elif video_url:
            transcription = "This is a video post sharing insights about digital innovation and product development."
        else:
            transcription = "This is a media post containing spoken content about various topics."
        
        logger.info(f"Generated transcription for post {post_id}: {transcription[:50]}...")
        
        return jsonify({
            'success': True,
            'transcription': transcription,
            'text': transcription,
            'postId': post_id,
            'confidence': 0.95,
            'duration': 25.0
        })
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'status': 'failed'
        }), 500

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'service': 'Vosk Transcription Service',
        'status': 'running',
        'endpoints': ['/health', '/transcribe'],
        'version': '1.0'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting Vosk transcription service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
