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

        // Save user message (ignore errors if table doesn't exist yet)
        try {
            await supabase.from('chat_messages').insert([{
                session_id: sessionId,
                user_id: userId,
                role: 'user',
                content: message.trim(),
                created_at: new Date().toISOString()
            }]);
        } catch (dbErr) {
            console.warn('Could not save user message to DB:', dbErr.message);
        }

        // Load chat history (ignore errors if table doesn't exist)
        let chatHistory = [];
        try {
            const { data } = await supabase
                .from('chat_messages')
                .select('role, content, created_at')
                .eq('session_id', sessionId)
                .eq('user_id', userId)
                .order('created_at', { ascending: true })
                .limit(20);
            chatHistory = data || [];
        } catch (dbErr) {
            console.warn('Could not load chat history from DB:', dbErr.message);
        }

        // If no detection context, return a canned response
        if (!detectionContext || (!detectionContext.fishResults && !detectionContext.diseaseResults)) {
            const aiResponse = "🐠 Please run an analysis on your uploaded fish image first! I can only provide insights based on specific detection results.";
            
            try {
                await supabase.from('chat_messages').insert([{
                    session_id: sessionId,
                    user_id: userId,
                    role: 'assistant',
                    content: aiResponse,
                    created_at: new Date().toISOString()
                }]);
            } catch (dbErr) {
                console.warn('Could not save assistant message to DB:', dbErr.message);
            }

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
6. Use emojis and bullet points to make your responses readable and engaging.
7. Keep answers under 200 words unless the user asks for more detail.`;

        // Build messages array for Cohere v2
        const messages = [
            { role: 'system', content: STRICT_SYSTEM_PROMPT }
        ];

        // Add chat history (limited)
        for (const msg of chatHistory.slice(-10)) {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({ role: msg.role, content: msg.content });
            }
        }

        // Add current user message 
        messages.push({ role: 'user', content: message.trim() });

        // --- SSE Streaming Response ---
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        console.log('[CHAT] Calling Cohere API...');

        const cohereResponse = await fetch(COHERE_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
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
            const errorData = await cohereResponse.text();
            console.error('[CHAT] Cohere API error:', cohereResponse.status, errorData);
            res.write(`data: ${JSON.stringify({ error: true, message: 'AI service error: ' + cohereResponse.status })}\n\n`);
            res.write('data: [DONE]\n\n');
            return res.end();
        }

        console.log('[CHAT] Cohere response OK, content-type:', cohereResponse.headers.get('content-type'));

        let fullResponse = '';
        const reader = cohereResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            buffer += chunkStr;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // Skip SSE event type lines like "event: content-delta"
                if (trimmed.startsWith('event:')) continue;

                // Extract JSON from "data: {...}" or raw "{...}" lines
                let jsonStr = trimmed;
                if (trimmed.startsWith('data:')) {
                    jsonStr = trimmed.substring(5).trim();
                }
                if (jsonStr === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(jsonStr);
                    let text = '';

                    // Cohere v2 SSE format: content-delta events
                    if (parsed.type === 'content-delta') {
                        text = parsed.delta?.message?.content?.text || '';
                    }
                    // Cohere non-streaming fallback
                    if (!text && parsed.message?.content?.[0]?.text) {
                        text = parsed.message.content[0].text;
                    }

                    if (text) {
                        fullResponse += text;
                        res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
                    }
                } catch (parseErr) {
                    // Not JSON, skip it
                }
            }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
            try {
                let jsonStr = buffer.trim();
                if (jsonStr.startsWith('data:')) jsonStr = jsonStr.substring(5).trim();
                if (jsonStr !== '[DONE]') {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.type === 'content-delta') {
                        const text = parsed.delta?.message?.content?.text || '';
                        if (text) {
                            fullResponse += text;
                            res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
                        }
                    }
                }
            } catch (e) {
                // ignore
            }
        }

        console.log('[CHAT] Streaming complete. Response length:', fullResponse.length);

        // If streaming produced nothing, try non-streaming as fallback
        if (!fullResponse) {
            console.warn('[CHAT] Streaming produced empty response! Trying non-streaming fallback...');
            try {
                const fallbackResponse = await fetch(COHERE_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: process.env.COHERE_MODEL || 'command-a-03-2025',
                        messages,
                        max_tokens: 1000,
                        temperature: 0.7,
                        stream: false,
                    })
                });
                const fallbackData = await fallbackResponse.json();
                console.log('[CHAT] Fallback response keys:', Object.keys(fallbackData));
                
                // Extract text from non-streaming response
                if (fallbackData.message?.content?.[0]?.text) {
                    fullResponse = fallbackData.message.content[0].text;
                } else if (fallbackData.text) {
                    fullResponse = fallbackData.text;
                } else {
                    fullResponse = JSON.stringify(fallbackData).substring(0, 500);
                    console.log('[CHAT] Unknown fallback format:', fullResponse);
                }

                res.write(`data: ${JSON.stringify({ token: fullResponse })}\n\n`);
            } catch (fallbackErr) {
                console.error('[CHAT] Fallback also failed:', fallbackErr.message);
                fullResponse = 'Sorry, I could not generate a response. Please try again.';
                res.write(`data: ${JSON.stringify({ token: fullResponse })}\n\n`);
            }
        }

        // Signal completion
        res.write('data: [DONE]\n\n');
        res.end();

        // Save the full AI response to the database
        try {
            await supabase.from('chat_messages').insert([{
                session_id: sessionId,
                user_id: userId,
                role: 'assistant',
                content: fullResponse,
                created_at: new Date().toISOString()
            }]);
        } catch (dbErr) {
            console.warn('Could not save assistant message to DB:', dbErr.message);
        }

    } catch (error) {
        console.error('[CHAT] Fatal error:', error);
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

        if (error) {
            console.warn('[CHAT] History query error:', error.message);
            return res.json({ messages: [] });
        }
        res.json({ messages: messages || [] });
    } catch (error) {
        console.error('Get chat history error:', error);
        res.json({ messages: [] });
    }
});

export default router;
