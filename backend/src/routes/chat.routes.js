import express from 'express';
import OpenAI from 'openai';
import supabase from '../config/supabase.js';
import authenticateUser from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateUser);

// SYSTEM_PROMPT moved dynamically inside the route to inject context directly

router.post('/message', async (req, res) => {
    try {
        const { sessionId, message, detectionContext } = req.body;
        const userId = req.user.id;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === 'your_openai_api_key_here') {
            return res.status(503).json({
                error: 'OpenAI API key not configured',
                message: 'Please add your OpenAI API key to the backend .env file'
            });
        }

        const openai = new OpenAI({ apiKey });

        // Save user message
        await supabase.from('chat_messages').insert([{
            session_id: sessionId,
            user_id: userId,
            role: 'user',
            content: message.trim(),
            created_at: new Date().toISOString()
        }]);

        // Load chat history
        const { data: chatHistory } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(20);

        // Add detection context check
        if (!detectionContext || (!detectionContext.fishResults && !detectionContext.diseaseResults)) {
            const aiResponse = "🐠 Please run an analysis on your uploaded fish image first! I can only provide insights based on specific detection results.";
            
            await supabase.from('chat_messages').insert([{
                session_id: sessionId,
                user_id: userId,
                role: 'assistant',
                content: aiResponse,
                created_at: new Date().toISOString()
            }]);

            return res.json({
                success: true,
                message: { role: 'assistant', content: aiResponse, created_at: new Date().toISOString() }
            });
        }

        const STRICT_SYSTEM_PROMPT = `You are FishCare AI, an expert fish health assistant.

📋 **LATEST FISH ANALYSIS RESULTS**:
**Species:** ${detectionContext.fishResults?.ensemble?.species || 'Unknown'} (${((detectionContext.fishResults?.ensemble?.confidence || 0) * 100).toFixed(1)}% confidence)
**Disease:** ${detectionContext.diseaseResults?.disease || 'None'} | Severity: ${detectionContext.diseaseResults?.severity || 'unknown'} | Confidence: ${((detectionContext.diseaseResults?.confidence || 0) * 100).toFixed(1)}%
**Description:** ${detectionContext.diseaseResults?.description || 'N/A'}
**Recommendations:** ${detectionContext.diseaseResults?.recommendations?.join(', ') || 'N/A'}

STRICT RULES YOU MUST FOLLOW:
1. You are analyzing the SPECIFIC fish image the user just uploaded, based entirely on the detection results above!
2. Do not talk about previous images or previous analyses from this session. Focus ONLY on the latest detection results.
3. If the user asks general questions unrelated to the current fish analysis, firmly redirect them back to the current fish results.
4. If the user asks out-of-field questions (coding, politics, other animals, weather), REFUSE to answer. Reply exactly: "🐠 I am FishCare AI—I can only discuss your uploaded fish image!"
5. Provide concise, direct, and actionable advice based ONLY on the detected species and diseases above.`;

        const messages = [{ role: 'system', content: STRICT_SYSTEM_PROMPT }];

        // Filter out old chat history from previous image analyses in the same session,
        // so the AI does not get confused between different fish images in the same chat UI.
        let relevantHistory = chatHistory || [];
        if (detectionContext.timestamp) {
            relevantHistory = relevantHistory.filter(msg => new Date(msg.created_at) >= new Date(detectionContext.timestamp));
        }

        // Add history (excluding last message which is the current one we just saved)
        if (relevantHistory.length > 0) {
            for (const msg of relevantHistory.slice(0, -1)) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: message.trim() });

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            max_tokens: 1000,
            temperature: 0.7,
        });

        const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        await supabase.from('chat_messages').insert([{
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            content: aiResponse,
            created_at: new Date().toISOString()
        }]);

        res.json({
            success: true,
            message: { role: 'assistant', content: aiResponse, created_at: new Date().toISOString() }
        });

    } catch (error) {
        console.error('Chat error:', error);
        if (error?.status === 401) return res.status(401).json({ error: 'Invalid OpenAI API key' });
        if (error?.status === 429) return res.status(429).json({ error: 'Rate limit exceeded. Please wait.' });
        res.status(500).json({ error: 'Chat failed', message: error.message });
    }
});

router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) return res.status(400).json({ error: error.message });
        res.json({ messages: messages || [] });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

export default router;
