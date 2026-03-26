import express from 'express';
import multer from 'multer';
import axios from 'axios';
import supabase from '../config/supabase.js';
import authenticateUser from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads  
const upload = multer({
    dest: 'uploads/',
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

// Fish detection endpoint
router.post('/fish', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { sessionId } = req.body;

        // Forward image to ML service
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        formData.append('image', blob, req.file.originalname);

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/api/detect/fish`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000
            }
        );

        // Upload image to Supabase Storage  
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `detections/${req.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('fish-images')
            .upload(filePath, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
        }

        const { data: { publicUrl } } = supabase.storage
            .from('fish-images')
            .getPublicUrl(filePath);

        // Save detection to database
        if (sessionId) {
            const { error: dbError } = await supabase
                .from('detections')
                .insert([{
                    session_id: sessionId,
                    user_id: req.user.id,
                    detection_type: 'fish_detection',
                    image_url: publicUrl,
                    results: mlResponse.data,
                    created_at: new Date().toISOString()
                }]);
            if (dbError) console.error('Database error:', dbError);
        }

        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            results: mlResponse.data,
            imageUrl: publicUrl
        });
    } catch (error) {
        console.error('Fish detection error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Fish detection failed', message: error.message });
    }
});

// Disease detection endpoint
router.post('/disease', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const { sessionId } = req.body;

        const formData = new FormData();
        const fileBuffer = fs.readFileSync(req.file.path);
        const blob = new Blob([fileBuffer], { type: req.file.mimetype });
        formData.append('image', blob, req.file.originalname);

        const mlResponse = await axios.post(
            `${process.env.ML_SERVICE_URL}/api/detect/disease`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 60000
            }
        );

        const fileExt = path.extname(req.file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = `detections/${req.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('fish-images')
            .upload(filePath, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) console.error('Upload error:', uploadError);

        const { data: { publicUrl } } = supabase.storage
            .from('fish-images')
            .getPublicUrl(filePath);

        if (sessionId) {
            const { error: dbError } = await supabase
                .from('detections')
                .insert([{
                    session_id: sessionId,
                    user_id: req.user.id,
                    detection_type: 'disease_detection',
                    image_url: publicUrl,
                    results: mlResponse.data,
                    created_at: new Date().toISOString()
                }]);
            if (dbError) console.error('Database error:', dbError);
        }

        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            results: mlResponse.data,
            imageUrl: publicUrl
        });
    } catch (error) {
        console.error('Disease detection error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: 'Disease detection failed', message: error.message });
    }
});

export default router;
