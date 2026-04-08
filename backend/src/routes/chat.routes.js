import express from 'express';
import supabase from '../config/supabase.js';
import authenticateUser from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateUser);

const COHERE_BASE_URL = 'https://api.cohere.com/v2/chat';

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

        const apiKey = process.env.COHERE_API_KEY;
        if (!apiKey) {
            return res.status(503).json({
                error: 'AI API key not configured',
                message: 'Please add your COHERE_API_KEY to the backend .env file'
            });
        }

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
            .select('role, content, created_at')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
            .limit(20);

        // If no detection context, return a canned response
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

        // Build strict system prompt
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
5. Provide concise, direct, and actionable advice based ONLY on the detected species and diseases above.
6. Use emojis sparingly for readability (🐟 🏥 💊 💧 🌡️). Use markdown formatting. Keep responses under 500 words.
7. For serious disease conditions, ALWAYS recommend consulting a fish veterinarian.`;

        const messages = [{ role: 'system', content: STRICT_SYSTEM_PROMPT }];

        // Filter history to only include messages from the latest analysis
        let relevantHistory = chatHistory || [];
        if (detectionContext.timestamp) {
            relevantHistory = relevantHistory.filter(msg => new Date(msg.created_at) >= new Date(detectionContext.timestamp));
        }

        if (relevantHistory.length > 0) {
            for (const msg of relevantHistory.slice(0, -1)) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: message.trim() });

        // --- SSE Streaming Response ---
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const cohereResponse = await fetch(COHERE_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.COHERE_MODEL || 'command-a-03-2025',
                messages,
                max_tokens: 1000,
                temperature: 0.7,
                stream: true,
            })
        });

        if (!cohereResponse.ok) {
            const errorData = await cohereResponse.json().catch(() => ({}));
            console.error('Cohere API error:', cohereResponse.status, JSON.stringify(errorData));
            res.write(`data: ${JSON.stringify({ error: true, message: errorData?.message || 'AI service error' })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
        }

        let fullResponse = '';
        const reader = cohereResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const jsonStr = trimmed.slice(5).trim();
                if (jsonStr === '[DONE]') continue;

                try {
                    const event = JSON.parse(jsonStr);

                    // Cohere v2 streaming: content-delta events
                    if (event.type === 'content-delta') {
                        const text = event.delta?.message?.content?.text || '';
                        if (text) {
                            fullResponse += text;
                            res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
                        }
                    }
                } catch (e) {
                    // skip unparseable lines
                }
            }
        }

        // If streaming produced nothing, fallback
        if (!fullResponse) {
            fullResponse = 'Sorry, I could not generate a response. Please try again.';
            res.write(`data: ${JSON.stringify({ token: fullResponse })}\n\n`);
        }

        // Signal completion
        res.write('data: [DONE]\n\n');
        res.end();

        // Save the full AI response to the database
        await supabase.from('chat_messages').insert([{
            session_id: sessionId,
            user_id: userId,
            role: 'assistant',
            content: fullResponse,
            created_at: new Date().toISOString()
        }]);

    } catch (error) {
        console.error('Chat error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Chat failed', message: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: true, message: error.message })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
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
