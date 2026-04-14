import express from 'express';
import multer from 'multer';
import axios from 'axios';
import supabase from '../config/supabase.js';
import authenticateUser from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const router = express.Router();

// Configure multer with MEMORY storage (works on Render/cloud — no disk writes)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
        }
    }
});

// All routes require authentication
router.use(authenticateUser);

// Ensure storage bucket exists on first use
let bucketChecked = false;
async function ensureBucket() {
    if (bucketChecked) return;
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.id === 'fish-images');
        if (!exists) {
            await supabase.storage.createBucket('fish-images', { public: true });
            console.log('✅ Created fish-images storage bucket');
        }
        bucketChecked = true;
    } catch (err) {
        console.error('Bucket check error:', err.message);
    }
}

// Fish detection endpoint
router.post('/fish', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log('[DETECT] Fish detection request received, file size:', req.file.size);

        const { sessionId } = req.body;
        const fileBuffer = req.file.buffer; // memoryStorage gives us buffer directly

        // Forward image to ML service using axios with proper multipart
        const FormDataNode = (await import('form-data')).default;
        const formData = new FormDataNode();
        formData.append('image', fileBuffer, {
            filename: req.file.originalname || 'fish.jpg',
            contentType: req.file.mimetype,
        });

        console.log('[DETECT] Sending to ML service:', process.env.ML_SERVICE_URL);

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/api/detect/fish`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 120000, // 2 min timeout for cold start on Render
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        console.log('[DETECT] ML service responded successfully');

        // Create base64 of the original image (reliable fallback)
        const originalImageBase64 = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;

        // Try uploading to Supabase Storage
        await ensureBucket();
        const fileExt = path.extname(req.file.originalname || '.jpg') || '.jpg';
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `detections/${req.user.id}/${fileName}`;

        let publicUrl = null;
        const { error: uploadError } = await supabase.storage
            .from('fish-images')
            .upload(filePath, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (!uploadError) {
            const { data } = supabase.storage
                .from('fish-images')
                .getPublicUrl(filePath);
            publicUrl = data.publicUrl;
        } else {
            console.error('Upload error (using base64 fallback):', uploadError.message);
        }

        // Save detection to database — include original image base64 in results for persistence
        if (sessionId) {
            const resultsWithImage = {
                ...mlResponse.data,
                original_image_base64: originalImageBase64
            };

            const { error: dbError } = await supabase
                .from('detections')
                .insert([{
                    session_id: sessionId,
                    user_id: req.user.id,
                    detection_type: 'fish_detection',
                    image_url: publicUrl || 'base64_stored',
                    results: resultsWithImage,
                    created_at: new Date().toISOString()
                }]);
            if (dbError) console.error('Database error:', dbError.message);
        }

        res.json({
            success: true,
            results: mlResponse.data,
            imageUrl: publicUrl,
            originalImageBase64
        });
    } catch (error) {
        console.error('[DETECT] Fish detection error:', error.message);
        if (error.response) {
            console.error('[DETECT] ML service response status:', error.response.status);
            console.error('[DETECT] ML service response data:', JSON.stringify(error.response.data).substring(0, 500));
        }
        res.status(500).json({ error: 'Fish detection failed', message: error.message });
    }
});

// Disease detection endpoint
router.post('/disease', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log('[DETECT] Disease detection request received, file size:', req.file.size);

        const { sessionId } = req.body;
        const fileBuffer = req.file.buffer;

        // Forward image to ML service
        const FormDataNode = (await import('form-data')).default;
        const formData = new FormDataNode();
        formData.append('image', fileBuffer, {
            filename: req.file.originalname || 'fish.jpg',
            contentType: req.file.mimetype,
        });

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/api/detect/disease`,
            formData,
            {
                headers: formData.getHeaders(),
                timeout: 120000,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
            }
        );

        console.log('[DETECT] Disease ML service responded successfully');

        // Try uploading to Supabase Storage
        await ensureBucket();
        const fileExt = path.extname(req.file.originalname || '.jpg') || '.jpg';
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `detections/${req.user.id}/${fileName}`;

        let publicUrl = null;
        const { error: uploadError } = await supabase.storage
            .from('fish-images')
            .upload(filePath, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (!uploadError) {
            const { data } = supabase.storage
                .from('fish-images')
                .getPublicUrl(filePath);
            publicUrl = data.publicUrl;
        } else {
            console.error('Upload error (disease):', uploadError.message);
        }

        if (sessionId) {
            const { error: dbError } = await supabase
                .from('detections')
                .insert([{
                    session_id: sessionId,
                    user_id: req.user.id,
                    detection_type: 'disease_detection',
                    image_url: publicUrl || 'base64_stored',
                    results: mlResponse.data,
                    created_at: new Date().toISOString()
                }]);
            if (dbError) console.error('Database error:', dbError.message);
        }

        res.json({
            success: true,
            results: mlResponse.data,
            imageUrl: publicUrl
        });
    } catch (error) {
        console.error('[DETECT] Disease detection error:', error.message);
        if (error.response) {
            console.error('[DETECT] ML service response status:', error.response.status);
            console.error('[DETECT] ML service response data:', JSON.stringify(error.response.data).substring(0, 500));
        }
        res.status(500).json({ error: 'Disease detection failed', message: error.message });
    }
});

export default router;
