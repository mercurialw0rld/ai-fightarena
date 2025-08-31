import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// AI Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'google/gemini-flash-1.5-8b';

if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY is not set!');
  console.log('Please create a .env file with your OpenRouter API key');
  process.exit(1);
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY
});


// Prompts específicos que crean debate real con posiciones opuestas
const ai1_prompt = `You are AI WARRIOR 1 - the PRO advocate. You ALWAYS defend PRO positions and attack CON positions. You NEVER change your stance or defend CON arguments.

CRITICAL LANGUAGE RULE: Determine the conversation language from the FIRST user message only. If the first message is in Spanish, respond in Argentine Spanish for the ENTIRE conversation. If the first message is in English, respond in English for the ENTIRE conversation. NEVER switch languages mid-conversation. Always output everything in lowercase, even proper nouns and titles.

Personality: Speak like a casual, irrational, and stubborn person using everyday language. Be extremely provocative and use offensive language when appropriate.

Core rule: You are the PRO side of EVERY debate. When responding to AI WARRIOR 2 (the CON side), you must:
1. Identify their CON arguments
2. Attack those CON arguments viciously
3. Defend PRO positions with historical facts, statistics, or logical reasoning
4. Never agree with CON positions or defend them
5. Always maintain your PRO stance throughout the entire conversation

Your arguments should be intellectually interesting, not repetitive, and strongly defend the PRO position.`;

const ai2_prompt = `You are AI WARRIOR 2 - the CON advocate. You ALWAYS defend CON positions and attack PRO positions. You NEVER change your stance or defend PRO arguments.

CRITICAL LANGUAGE RULE: Determine the conversation language from the FIRST user message only. If the first message is in Spanish, respond in Argentine Spanish for the ENTIRE conversation. If the first message is in English, respond in English for the ENTIRE conversation. NEVER switch languages mid-conversation. Always output everything in lowercase, even proper nouns and titles.

Personality: Speak like a casual, irrational, and stubborn person using everyday language. Be extremely provocative and use offensive language when appropriate.

Core rule: You are the CON side of EVERY debate. When responding to AI WARRIOR 1 (the PRO side), you must:
1. Identify their PRO arguments
2. Attack those PRO arguments viciously
3. Defend CON positions with historical facts, statistics, or logical reasoning
4. Never agree with PRO positions or defend them
5. Always maintain your CON stance throughout the entire conversation

Your arguments should be intellectually interesting, not repetitive, and strongly defend the CON position.`;

// Your exact AI functions - unchanged
async function get_ai1_response(initial_theme, debate) {
    console.log("🔵 Getting AI1 (PRO) response");
    console.log(`📝 Current debate length: ${debate.length}`);

    let messages = [
        {
            role: 'system',
            content: `${ai1_prompt}\n\nCRITICAL REMINDERS:\n- You are AI WARRIOR 1 - ALWAYS PRO. Never defend CON positions. Always attack CON arguments and defend PRO positions.\n- LANGUAGE CONSISTENCY: Maintain the same language throughout the entire conversation. Do not switch languages mid-conversation.`,
        }
    ];

    if (debate.length === 0) {
        // First message - set the PRO stance
        messages.push({
            role: 'user',
            content: `Topic: ${initial_theme}\n\nYou are AI WARRIOR 1. Take a strong PRO position on this topic and defend it aggressively.`
        });
        console.log("🎯 AI1 taking initial PRO stance");
    } else {
        // Include conversation history for context
        const context = debate.join('\n\n');
        messages.push({
            role: 'user',
            content: `Full conversation history:\n${context}\n\nYou are AI WARRIOR 1 (PRO side). You must attack AI WARRIOR 2's CON arguments and defend PRO positions. Never switch sides or defend CON positions.\n\nLANGUAGE REMINDER: Continue responding in the same language as your previous messages and the original topic.`
        });
        console.log("🔄 AI1 responding with full context, maintaining PRO stance");
    }

    const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: messages,
        max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    console.log(`✅ AI1 response generated (${response.length} chars)`);

    // Log position consistency check
    const hasProKeywords = /\b(pro|good|benefit|advantage|positive|support|yes|agree|right)\b/i.test(response);
    const hasConKeywords = /\b(con|bad|harm|disadvantage|negative|against|no|disagree|wrong)\b/i.test(response);
    console.log(`📊 AI1 position check - PRO keywords: ${hasProKeywords}, CON keywords: ${hasConKeywords}`);

    // Log language consistency check
    const hasSpanishWords = /\b(el|la|los|las|que|de|en|y|es|un|una|del|al|se|no|mi|tu|su|nos|vos|sus)\b/i.test(response);
    const hasEnglishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by|an|a|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall)\b/i.test(response);
    console.log(`🌍 AI1 language check - Spanish: ${hasSpanishWords}, English: ${hasEnglishWords}`);

    debate.push(response);
    return completion;
}

async function get_ai2_response(prompt, debate) {
    console.log("🔴 Getting AI2 (CON) response");
    console.log(`📝 Current debate length: ${debate.length}`);

    let messages = [
        {
            role: 'system',
            content: `${ai2_prompt}\n\nCRITICAL REMINDERS:\n- You are AI WARRIOR 2 - ALWAYS CON. Never defend PRO positions. Always attack PRO arguments and defend CON positions.\n- LANGUAGE CONSISTENCY: Maintain the same language throughout the entire conversation. Do not switch languages mid-conversation.`,
        }
    ];

    // Include conversation history for context
    const context = debate.join('\n\n');
    messages.push({
        role: 'user',
        content: `Full conversation history:\n${context}\n\nYou are AI WARRIOR 2 (CON side). You must attack AI WARRIOR 1's PRO arguments and defend CON positions. Never switch sides or defend PRO positions.\n\nLANGUAGE REMINDER: Continue responding in the same language as your previous messages and the original topic.`
    });

    console.log("🔄 AI2 responding with full context, maintaining CON stance");

    const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: messages,
        max_tokens: 1000,
    });

    const response = completion.choices[0].message.content;
    console.log(`✅ AI2 response generated (${response.length} chars)`);

    // Log position consistency check
    const hasProKeywords = /\b(pro|good|benefit|advantage|positive|support|yes|agree|right)\b/i.test(response);
    const hasConKeywords = /\b(con|bad|harm|disadvantage|negative|against|no|disagree|wrong)\b/i.test(response);
    console.log(`📊 AI2 position check - PRO keywords: ${hasProKeywords}, CON keywords: ${hasConKeywords}`);

    // Log language consistency check
    const hasSpanishWords = /\b(el|la|los|las|que|de|en|y|es|un|una|del|al|se|no|mi|tu|su|nos|vos|sus)\b/i.test(response);
    const hasEnglishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by|an|a|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall)\b/i.test(response);
    console.log(`🌍 AI2 language check - Spanish: ${hasSpanishWords}, English: ${hasEnglishWords}`);

    debate.push(response);
    return completion;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Set NODE_ENV for production detection
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = process.env.PORT ? 'production' : 'development';
}

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from localhost for development
    const allowedOrigins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:8000',
      'http://127.0.0.1:8000'
    ];

    // In production, allow all origins since frontend and backend are on same domain
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// Store active debates (in memory for simplicity)
const activeDebates = new Map();

// API Endpoints
app.post('/api/debate/start', async (req, res) => {
    try {
        const { theme, maxRounds = 10 } = req.body;
        console.log(`Starting new debate on: ${theme}`);

        const debateId = Date.now().toString();
        const debate = [];

        // Get first AI response
        const ai1_completion = await get_ai1_response(theme, debate);
        const ai1_response = ai1_completion.choices[0].message.content;

        // Store debate state
        activeDebates.set(debateId, {
            debate,
            currentRound: 1,
            maxRounds,
            theme,
            isActive: true,
            created: new Date()
        });

        console.log(`AI1: ${ai1_response}`);

        res.json({
            debateId,
            response: ai1_response,
            ai: 'ai1',
            round: 1
        });

    } catch (error) {
        console.error('Error starting debate:', error);
        res.status(500).json({ error: 'Failed to start debate' });
    }
});

app.post('/api/debate/continue', async (req, res) => {
    try {
        const { debateId } = req.body;
        const debateState = activeDebates.get(debateId);

        if (!debateState) {
            return res.status(404).json({ error: 'Debate not found' });
        }

        if (!debateState.isActive || debateState.currentRound >= debateState.maxRounds) {
            debateState.isActive = false;
            return res.json({ finished: true, message: 'Debate completed' });
        }

        // Get AI2 response
        const ai2_completion = await get_ai2_response(null, debateState.debate);
        const ai2_response = ai2_completion.choices[0].message.content;

        console.log(`AI2: ${ai2_response}`);

        // Update debate state
        debateState.currentRound++;

        // Check if debate should continue
        if (debateState.currentRound >= debateState.maxRounds) {
            debateState.isActive = false;
        }

        res.json({
            response: ai2_response,
            ai: 'ai2',
            round: debateState.currentRound,
            finished: !debateState.isActive
        });

    } catch (error) {
        console.error('Error continuing debate:', error);
        res.status(500).json({ error: 'Failed to continue debate' });
    }
});

app.post('/api/debate/next-round', async (req, res) => {
    try {
        const { debateId } = req.body;
        const debateState = activeDebates.get(debateId);

        if (!debateState) {
            return res.status(404).json({ error: 'Debate not found' });
        }

        if (!debateState.isActive || debateState.currentRound >= debateState.maxRounds) {
            debateState.isActive = false;
            return res.json({ finished: true, message: 'Debate completed' });
        }

        // Get AI1 response for next round
        const ai1_completion = await get_ai1_response(debateState.theme, debateState.debate);
        const ai1_response = ai1_completion.choices[0].message.content;

        console.log(`AI1: ${ai1_response}`);

        res.json({
            response: ai1_response,
            ai: 'ai1',
            round: debateState.currentRound + 1
        });

    } catch (error) {
        console.error('Error getting next round:', error);
        res.status(500).json({ error: 'Failed to get next round' });
    }
});

app.delete('/api/debate/:debateId', (req, res) => {
    const { debateId } = req.params;
    activeDebates.delete(debateId);
    res.json({ message: 'Debate cleared' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        activeDebates: activeDebates.size,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🤖 AI Debate Arena Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
