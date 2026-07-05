import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the Google GenAI SDK as instructed on the server
// Telemetry User-Agent 'aistudio-build' is attached to the httpOptions
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // 1. Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 2. High-thinking Gemini AI endpoint to generate curated event themes, custom word pools, and ticketing tiers
  app.post('/api/gemini/generate-event', async (req, res) => {
    const { promptTheme, venueName, capacity } = req.body;
    
    if (!promptTheme) {
      return res.status(400).json({ error: 'Please provide an event theme or prompt.' });
    }

    try {
      console.log(`Invoking gemini-3.1-pro-preview with HIGH thinking for theme: "${promptTheme}"`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Create an epic, high-fidelity music event based on the theme: "${promptTheme}" and venue name: "${venueName || 'Secret Venue'}". The venue capacity is ${capacity || 500}.`,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          },
          systemInstruction: 
            "You are a legendary creative director and expert event producer for major music festivals and underground music clubs. " +
            "Your writing is highly immersive, styled with Spotify-style aesthetic, energetic yet sophisticated, and optimized to appeal to music purists. " +
            "Provide an engaging event description, a refined title, a set of custom-curated music/art words to scramble for ticket codes, " +
            "and appropriate ticket tiers with pricing and limit recommendations tailored to the venue's capacity.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'A punchy, thematic, beautiful music event title'
              },
              description: {
                type: Type.STRING,
                description: 'An immersive, atmospheric 2-3 sentence event description in Spotify style'
              },
              wordPool: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of 10 high-energy thematic capital words (e.g., DECIbel, MODULAR) used to generate security scrambling codes'
              },
              tiers: {
                type: Type.ARRAY,
                description: '2-3 ticketing tiers custom tailored to the theme and capacity',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'e.g., Early Entrance, Backstage Pass, General Admission' },
                    price: { type: Type.INTEGER, description: 'Ticket price in dollars' },
                    limit: { type: Type.INTEGER, description: 'Max available tickets for this tier' },
                    description: { type: Type.STRING, description: 'Short detail of what is included' }
                  },
                  required: ['name', 'price', 'limit', 'description']
                }
              }
            },
            required: ['title', 'description', 'wordPool', 'tiers']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No content returned from Gemini.');
      }

      const parsedJSON = JSON.parse(responseText.trim());
      res.json(parsedJSON);
    } catch (error: any) {
      console.error('Gemini processing error:', error);
      res.status(500).json({ 
        error: 'Failed to generate creative event with Gemini AI.', 
        details: error.message 
      });
    }
  });

  // 3. Vite middleware for local development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files mounted from dist/.');
  }

  // 4. Listen on PORT 3000
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
