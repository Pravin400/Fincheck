import os
from ultralytics import YOLO
from dotenv import load_dotenv

load_dotenv()

class ModelLoader:
    def __init__(self):
        self.models = {}
        self.model_paths = {
            'fish': os.getenv('FISH_MODEL', 'models/Fish_Detection/fish_model_best.pt'),
            'disease': os.getenv('DISEASE_MODEL', 'models/disease_detection/best.pt')
        }
    
    def load_model(self, model_key):
        """Load a specific model by key"""
        if model_key in self.models:
            return self.models[model_key]
        
        model_path = self.model_paths.get(model_key)
        if not model_path or not os.path.exists(model_path):
            raise FileNotFoundError(f'Model not found: {model_path}')
        
        print(f'Loading model: {model_key} from {model_path}')
        model = YOLO(model_path)
        self.models[model_key] = model
        return model
    
    def load_all_models(self):
        """Pre-load all models for faster inference"""
        for key in self.model_paths.keys():
            try:
                self.load_model(key)
                print(f'✓ Loaded {key}')
            except Exception as e:
                print(f'✗ Failed to load {key}: {str(e)}')
    
    def get_fish_model(self):
        """Get the fish detection model"""
        return self.load_model('fish')
    
    def get_disease_model(self):
        """Get disease detection model"""
        return self.load_model('disease')
    
    def get_loaded_models(self):
        """Return list of loaded model names"""
        return list(self.models.keys())
