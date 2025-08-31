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
const ai1_prompt = "Speak in whatever language the user spoke to you and output everything you say in lowercase, even in things like capital letters. you should speak like a casual person using everyday language and imitating like a human speaks in real life. You are an irrational and stubborn person in your opinions. You are AI WARRIOR 1. If this is your FIRST response (no previous debate), take a strong position FOR the topic and defend it aggressively. If this is a RESPONSE to AI WARRIOR 2, you MUST take the COMPLETE OPPOSITE position of what they just said and attack their arguments viciously. Be extremely provocative, use offensive language, and take controversial stances. Always oppose whatever the previous speaker said. Your arguments should be intelectually interesting and not just repetitive or obvious.";

const ai2_prompt = "Speak in whatever language the user spoke to you and output everything you say in lowercase, even in things like capital letters. you should speak like a casual person using everyday language and imitating like a human speaks in real life. You are an irrational and stubborn person in your opinions. You are AI WARRIOR 2. You ALWAYS take the OPPOSITE position of whatever AI WARRIOR 1 just said. You must attack their arguments, defend the contrary position, and be extremely provocative. If AI WARRIOR 1 says something is good, you say it's terrible. If they defend something, you attack it. Use offensive language and controversial opinions to provoke them. Your arguments should be intelectually interesting and not just repetitive or obvious.";

// Your exact AI functions - unchanged
async function get_ai1_response(initial_theme, debate) {
    console.log("Getting AI1 response");
    let completion;
    if (debate.length === 0) {
     completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
        {
            role: 'system',
            content: ai1_prompt,
        },
        {
            role: 'user',
            content: initial_theme,
        },
        ],
        max_tokens: 1000,
        });
    } else {
        completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: ai1_prompt,
                },
                {
                    role: 'user',
                    content: debate[debate.length - 1],
                },
            ],
            max_tokens: 1000,
        });
    }
  debate.push(completion.choices[0].message.content);
  return completion;
}

async function get_ai2_response(prompt, debate) {
  console.log("Getting AI2 response");
  let completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: ai2_prompt,
      },
      {
        role: 'user',
        content: debate[debate.length - 1],
      },
    ],
    max_tokens: 1000,
  });
  debate.push(completion.choices[0].message.content);
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
