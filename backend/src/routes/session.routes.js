import express from 'express';
import supabase from '../config/supabase.js';
import authenticateUser from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Create new detection session
router.post('/', async (req, res) => {
    try {
        const { title, type } = req.body;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('sessions')
            .insert([
                {
                    user_id: userId,
                    title: title || `New ${type === 'disease_detection' ? 'Disease' : 'Fish'} Detection`,
                    session_type: type || 'fish_detection',
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Session insert error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ session: data });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get all sessions for current user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ sessions: data || [] });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Get specific session with detections
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (sessionError || !session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { data: detections, error: detectionsError } = await supabase
            .from('detections')
            .select('*')
            .eq('session_id', id)
            .order('created_at', { ascending: true });

        if (detectionsError) {
            return res.status(400).json({ error: detectionsError.message });
        }

        res.json({
            session,
            detections: detections || []
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// Delete session
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // First delete chat messages
        await supabase
            .from('chat_messages')
            .delete()
            .eq('session_id', id);

        // Delete detections
        await supabase
            .from('detections')
            .delete()
            .eq('session_id', id);

        // Then delete the session
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Update session title
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('sessions')
            .update({ title })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ session: data });
    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

export default router;
