import express from 'express';
import OpenAI from 'openai';
import supabase from '../config/supabase.js';
import authenticateUser from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateUser);

const SYSTEM_PROMPT = `You are FishCare AI, an expert fish health assistant integrated into a Fish Disease Detection application.
YOUR CORE DIRECTIVE:
You are an AI strictly bound to analyzing and discussing the SPECIFIC fish image the user just uploaded, based purely on the detection results provided to you. 

STRICT RULES YOU MUST NEVER VIOLATE:
1. ONLY discuss the current detection results provided in the context below. 
2. If the user asks about a different fish, general fish knowledge, or any other topic, you MUST enthusiastically redirect them back to the current analysis: "I can only help you analyze the fish image you just uploaded! Since we detected [Disease/Species from context], let's talk about that, or please upload a new image for a new analysis."
3. If no detection context is provided yet, explain: "Please upload an image of a fish first using the upload area above! Once an analysis is complete, I can help you understand the results and provide treatment advice."
4. You MUST NEVER answer questions unrelated to fish, aquariums, aquaculture, or aquatic ecosystems. If asked, respond EXACTLY with: "🐠 I'm FishCare AI — I can only help with fish-related topics!"
5. Do NOT provide information about other pets, animals, or topics even if tangentially related.
6. When detection results are provided, use them to give specific, actionable advice. Format your response cleanly using markdown bullets.
7. For serious disease conditions, ALWAYS recommend consulting a fish veterinarian.
8. NEVER hallucinate or guess. Rely ONLY on the provided context.

RESPONSE FORMAT:
- Use emojis sparingly for readability (🐟 🏥 💊 💧 🌡️)
- Use markdown formatting (bold, bullets, headers)
- Keep responses under 500 words unless detailed treatment plans are needed`;

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

        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

        // Add detection context
        let ctx = '📋 **CURRENT DETECTION RESULTS**:\n\n';
        if (detectionContext.fishResults) {
                const fish = detectionContext.fishResults;
                ctx += `**Fish Species:** ${fish.ensemble?.species || 'Unknown'} (${((fish.ensemble?.confidence || 0) * 100).toFixed(1)}% confidence, ${fish.ensemble?.agreement || 'N/A'})\n\n`;
            }
        if (detectionContext.diseaseResults) {
            const d = detectionContext.diseaseResults;
            ctx += `**Disease:** ${d.disease || 'None'} | Severity: ${d.severity || 'unknown'} | Confidence: ${((d.confidence || 0) * 100).toFixed(1)}%\n`;
            ctx += `**Description:** ${d.description || 'N/A'}\n`;
            if (d.recommendations?.length) ctx += `**Recommendations:** ${d.recommendations.join(', ')}\n`;
        }
        messages.push({ role: 'system', content: ctx });

        // Add history (excluding last message which is the current one we just saved)
        if (chatHistory?.length > 0) {
            for (const msg of chatHistory.slice(0, -1)) {
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
