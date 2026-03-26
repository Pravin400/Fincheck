import base64
import io
import cv2
import numpy as np

class DiseaseDetector:
    def __init__(self, model_loader):
        self.model_loader = model_loader
        
        # Disease information mapping
        self.disease_info = {
            'healthy': {
                'description': 'The fish appears to be in good health with no visible signs of disease.',
                'severity': 'none',
                'recommendations': [
                    'Continue regular water quality monitoring',
                    'Maintain proper feeding schedule',
                    'Keep tank clean and well-maintained'
                ]
            },
            'ich': {
                'description': 'White spot disease (Ich) detected. Small white spots visible on fish body. Caused by the parasite Ichthyophthirius multifiliis.',
                'severity': 'moderate',
                'recommendations': [
                    'Raise water temperature gradually to 82-86°F',
                    'Add aquarium salt (1 tablespoon per 5 gallons)',
                    'Use ich medication as directed',
                    'Improve water quality with partial water changes',
                    'Treat the entire tank as Ich is highly contagious'
                ]
            },
            'fin_rot': {
                'description': 'Fin rot detected. Fins appear ragged, frayed, or deteriorating. Usually caused by bacterial infection due to poor water quality.',
                'severity': 'moderate',
                'recommendations': [
                    'Perform 25-50% water change immediately',
                    'Test and improve water quality (pH, ammonia, nitrite)',
                    'Use antibacterial medication (e.g., Melafix or API Fin & Body Cure)',
                    'Remove any sharp decorations that may cause injury',
                    'Monitor closely for 7-10 days'
                ]
            },
            'fungal': {
                'description': 'Fungal infection detected. Cotton-like white or gray growth visible on fish body. Often occurs in fish with weakened immune systems.',
                'severity': 'high',
                'recommendations': [
                    'Isolate affected fish in a quarantine tank',
                    'Use antifungal medication (e.g., Methylene Blue or Pimafix)',
                    'Improve water quality immediately with 50% water change',
                    'Increase aeration and water flow',
                    'Add aquarium salt (1 tsp per gallon)',
                    'Consult a veterinarian if condition worsens within 48 hours'
                ]
            }
        }
    
    def detect(self, image):
        """
        Run disease detection on the fish image
        Returns disease classification with recommendations and annotated image
        """
        try:
            model = self.model_loader.get_disease_model()
            results = model(image, conf=0.25)
            
            # Generate annotated image with bounding boxes
            annotated_image_base64 = None
            all_detections = []
            
            if len(results) > 0:
                try:
                    annotated_img = results[0].plot()  # YOLOv8 built-in annotation
                    annotated_img = cv2.cvtColor(annotated_img, cv2.COLOR_BGR2RGB)
                    _, buffer = cv2.imencode('.jpg', cv2.cvtColor(annotated_img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 85])
                    annotated_image_base64 = base64.b64encode(buffer).decode('utf-8')
                except Exception as e:
                    print(f'Error generating annotated image: {str(e)}')
            
            if len(results) > 0 and len(results[0].boxes) > 0:
                boxes = results[0].boxes
                top_idx = boxes.conf.argmax()
                
                class_id = int(boxes.cls[top_idx])
                confidence = float(boxes.conf[top_idx])
                class_name = results[0].names[class_id].lower()
                
                # Collect all detection bounding boxes
                for i in range(len(boxes)):
                    box = boxes.xyxy[i].tolist()
                    all_detections.append({
                        'label': results[0].names[int(boxes.cls[i])],
                        'confidence': float(boxes.conf[i]),
                        'bbox': {
                            'x1': round(box[0], 1),
                            'y1': round(box[1], 1),
                            'x2': round(box[2], 1),
                            'y2': round(box[3], 1)
                        }
                    })
                
                # Get disease information
                disease_data = self.disease_info.get(
                    class_name, 
                    {
                        'description': f'Detected condition: {class_name}. Please consult a fish health specialist for detailed diagnosis.',
                        'severity': 'unknown',
                        'recommendations': ['Consult with a fish health specialist for proper diagnosis and treatment']
                    }
                )
                
                return {
                    'disease': class_name.title(),
                    'confidence': confidence,
                    'description': disease_data['description'],
                    'severity': disease_data['severity'],
                    'recommendations': disease_data['recommendations'],
                    'additionalInfo': self._get_additional_info(class_name),
                    'detections': all_detections,
                    'annotated_image': annotated_image_base64
                }
            else:
                return {
                    'disease': 'No Disease Detected',
                    'confidence': 0.0,
                    'description': 'No specific disease was detected in this image. The fish may be healthy, or the image quality may be insufficient for accurate detection.',
                    'severity': 'none',
                    'recommendations': [
                        'Fish appears healthy based on visual analysis',
                        'Continue regular water quality monitoring',
                        'Ensure clear, well-lit image for better detection accuracy',
                        'Monitor fish behavior for any abnormalities',
                        'Consult a specialist if you notice unusual symptoms'
                    ],
                    'additionalInfo': 'No bounding boxes were detected. If you suspect disease, try uploading a clearer, close-up image of the affected area.',
                    'detections': [],
                    'annotated_image': annotated_image_base64
                }
        
        except Exception as e:
            print(f'Disease detection error: {str(e)}')
            raise
    
    def _get_additional_info(self, disease_name):
        """Get additional information about the disease"""
        info_map = {
            'healthy': 'Regular monitoring and maintenance will help keep your fish healthy. Check water parameters weekly.',
            'ich': 'Ich (White Spot Disease) is caused by the parasite Ichthyophthirius multifiliis. It is highly contagious — treat the entire tank, not just the affected fish. The parasite goes through lifecycle stages and is only vulnerable to medication when free-swimming.',
            'fin_rot': 'Fin rot is usually caused by poor water quality (high ammonia/nitrite) or bacterial infection (Pseudomonas, Aeromonas). Early treatment prevents progression. Fins can regenerate once the infection is cleared.',
            'fungal': 'Fungal infections (Saprolegnia) often occur as secondary infections on fish with compromised immune systems, open wounds, or in poor water conditions. Prompt treatment is essential to prevent systemic infection.'
        }
        return info_map.get(disease_name, 'Monitor the fish closely and maintain good water quality. Consult a fish health specialist for accurate diagnosis.')
