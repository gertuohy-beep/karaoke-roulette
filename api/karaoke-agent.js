// api/karaoke-agent.js
// Secure serverless backend handler to proxy requests to Gemini 2.5 Flash

export default async function handler(req, res) {
  // Set up secure Cross-Origin Resource Sharing (CORS) headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Look up your hidden API Key stored inside your server environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on the hosting server.' });
  }

  try {
    const { prompt, systemPrompt, responseSchema } = req.body;

    // Structured production payload for Gemini with native Google Search Grounding enabled
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      tools: [
        { google_search: {} } // Uses Google's active index to verify real YouTube videos
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    // If a strict validation schema is passed down, enforce it natively
    if (responseSchema) {
      payload.generationConfig.responseSchema = responseSchema;
    }

    // Connect to the latest standard Google AI API endpoint
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Gemini Server API Error');
    }

    // Extract the strict JSON payload from the AI response structure
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No valid music metadata content returned by the server.');
    }

    return res.status(200).json({ text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
