# check_model_info.py
import torch
from ultralytics import YOLO
import os

def check_model_info(model_path):
    """Extract training information from YOLOv8 model"""
    print(f"\n{'='*60}")
    print(f"📊 Model: {os.path.basename(model_path)}")
    print(f"{'='*60}")
    
    try:
        # Method 1: Load with Ultralytics YOLO
        try:
            model = YOLO(model_path)
            
            # Check if model has info attribute
            if hasattr(model, 'model') and hasattr(model.model, 'args'):
                args = model.model.args
                print(f"\n✓ Loaded with Ultralytics YOLO")
                print(f"  Model Type: {type(model.model).__name__}")
                
                # Try to get training args
                if hasattr(args, '__dict__'):
                    print(f"\n📝 Training Arguments:")
                    for key, value in args.__dict__.items():
                        if 'data' in key.lower() or 'epoch' in key.lower() or 'batch' in key.lower():
                            print(f"  {key}: {value}")
        except Exception as e:
            print(f"⚠ Ultralytics load failed: {e}")
        
        # Method 2: Load raw PyTorch checkpoint
        print(f"\n🔍 Loading raw checkpoint...")
        checkpoint = torch.load(model_path, map_location='cpu')
        
        print(f"\n📦 Checkpoint Keys:")
        for key in checkpoint.keys():
            print(f"  - {key}")
        
        # Check for training info
        if 'train_args' in checkpoint:
            print(f"\n✅ Training Arguments Found:")
            train_args = checkpoint['train_args']
            for key, value in train_args.items():
                print(f"  {key}: {value}")
        
        # Check for epoch info
        if 'epoch' in checkpoint:
            print(f"\n📈 Training Progress:")
            print(f"  Epochs Trained: {checkpoint['epoch']}")
        
        # Check for dataset info
        if 'train_args' in checkpoint and 'data' in checkpoint['train_args']:
            data_yaml = checkpoint['train_args']['data']
            print(f"\n📁 Dataset Config: {data_yaml}")
        
        # Check model info
        if 'model' in checkpoint:
            model_dict = checkpoint['model']
            if hasattr(model_dict, 'yaml'):
                print(f"\n🏗️ Model Architecture:")
                print(f"  Config: {model_dict.yaml}")
        
        # Check for best metrics
        if 'best_fitness' in checkpoint:
            print(f"\n🏆 Best Fitness: {checkpoint['best_fitness']}")
        
        # Try to find dataset size from names
        if 'model' in checkpoint:
            model_obj = checkpoint['model']
            if hasattr(model_obj, 'names'):
                names = model_obj.names
                print(f"\n🏷️ Classes ({len(names)}):")
                for idx, name in names.items():
                    print(f"  {idx}: {name}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

# Check all your models
print("\n" + "="*60)
print("🔬 CHECKING ALL MODELS")
print("="*60)

models = [
    'models/Fish_Detection/fish_model_best.pt',
    'models/disease_detection/best.pt'
]

for model_path in models:
    if os.path.exists(model_path):
        check_model_info(model_path)
    else:
        print(f"\n⚠ Model not found: {model_path}")

print("\n" + "="*60)
print("✅ ANALYSIS COMPLETE")
print("="*60)