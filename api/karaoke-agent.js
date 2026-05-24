import { GoogleGenAI } from "@google/genai";

// Ensure your environment variable is loaded correctly
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  // Handle preflight CORS requests if applicable
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, systemPrompt, responseSchema } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Build model configuration parameters securely
    const config = {
      systemInstruction: systemPrompt || "You are a helpful assistant.",
      temperature: 0.7,
    };

    // Explicitly enforce valid Structured JSON Mode flags 
    // This removes the conflict causing the "Tool use" rejection
    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }

    // We use the reliable gemini-2.5-flash model 
    // It fully supports structured JSON out of the box
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: config
    });

    // Send back the raw text string for the frontend to parse safely
    return res.status(200).json({ text: response.text });

  } catch (error) {
    console.error("Gemini API backend proxy error:", error);
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error' 
    });
  }
}
