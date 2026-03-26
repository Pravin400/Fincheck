from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from src.model_loader import ModelLoader
from src.fish_detector import FishDetector
from src.disease_detector import DiseaseDetector
from src.utils.image_processing import process_image

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize model loader
model_loader = ModelLoader()

# Initialize detectors
fish_detector = FishDetector(model_loader)
disease_detector = DiseaseDetector(model_loader)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'ML Service is running',
        'models_loaded': model_loader.get_loaded_models()
    })

@app.route('/api/detect/fish', methods=['POST'])
def detect_fish():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        
        # Process image
        image = process_image(image_file)
        
        # Run ensemble detection
        results = fish_detector.detect(image)
        
        return jsonify(results), 200
    
    except Exception as e:
        print(f'Fish detection error: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/detect/disease', methods=['POST'])
def detect_disease():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        
        # Process image
        image = process_image(image_file)
        
        # Run disease detection
        results = disease_detector.detect(image)
        
        return jsonify(results), 200
    
    except Exception as e:
        print(f'Disease detection error: {str(e)}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    print(f'🚀 ML Service starting on http://localhost:{port}')
    print(f'📊 Loading models...')
    
    # Pre-load all models
    model_loader.load_all_models()
    
    print(f'✅ All models loaded successfully!')
    print(f'🔬 Ready to process detections')
    
    app.run(host='0.0.0.0', port=port, debug=True)
