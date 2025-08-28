#!/usr/bin/env python3

import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'vosk-transcription-test',
        'version': '1.0'
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Mock transcribe endpoint for testing"""
    return jsonify({
        'status': 'completed',
        'transcription': 'This is a test transcription response'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
