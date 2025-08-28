from flask import Flask, jsonify
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    logger.info("Health check requested")
    return jsonify({"status": "healthy", "service": "minimal-test"})

@app.route('/')
def root():
    return jsonify({'message': 'Test service is running'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting minimal test service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
