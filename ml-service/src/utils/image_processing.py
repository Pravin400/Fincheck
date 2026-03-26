from PIL import Image
import io
import numpy as np

def process_image(image_file):
    """
    Process uploaded image file for model inference
    
    Args:
        image_file: FileStorage object from Flask request
    
    Returns:
        PIL Image object
    """
    try:
        # Read image bytes
        image_bytes = image_file.read()
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        return image
    
    except Exception as e:
        raise ValueError(f'Failed to process image: {str(e)}')

def validate_image(image_file):
    """
    Validate uploaded image file
    
    Args:
        image_file: FileStorage object from Flask request
    
    Returns:
        bool: True if valid, raises exception otherwise
    """
    allowed_extensions = {'png', 'jpg', 'jpeg'}
    
    if not image_file:
        raise ValueError('No image file provided')
    
    filename = image_file.filename.lower()
    if not any(filename.endswith(ext) for ext in allowed_extensions):
        raise ValueError(f'Invalid file type. Allowed: {", ".join(allowed_extensions)}')
    
    # Check file size (max 10MB)
    image_file.seek(0, 2)  # Seek to end
    size = image_file.tell()
    image_file.seek(0)  # Reset to beginning
    
    if size > 10 * 1024 * 1024:  # 10MB
        raise ValueError('File size exceeds 10MB limit')
    
    return True
