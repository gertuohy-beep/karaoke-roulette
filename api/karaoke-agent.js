import { GoogleGenAI } from "@google/genai";

// Initialize the Google Gen AI client safely
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req, res) {
  // 1. Handle CORS Preflight requests safely
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, systemPrompt, responseSchema } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Backend Configuration Error: GEMINI_API_KEY is missing from Vercel Environment Variables.' });
    }

    // 3. Set up the exact config configuration structure expected by gemini-2.5-flash
    const config = {
      systemInstruction: systemPrompt || "You are a professional music roulette assistant.",
      temperature: 0.7,
    };

    // 4. Attach schema rules strictly inside the configuration safely
    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }

    // 5. Fire request using the standard official models mechanism
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: config
    });

    // 6. Return response text to frontend
    return res.status(200).json({ text: response.text });

  } catch (error) {
    // This logs the exact trace in your Vercel logs dashboard
    console.error("CRITICAL BACKEND ERROR:", error);
    
    // Return the precise error details to the frontend so we don't blind-guess a 500
    return res.status(500).json({ 
      error: `Server Crash details: ${error.message || 'Unknown execution error'}` 
    });
  }
}
