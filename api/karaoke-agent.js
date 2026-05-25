// api/karaoke-agent.js
// A 100% stable, zero-dependency serverless proxy using native Node.js HTTPS (works on all Node/Vercel versions)
import https from 'https';

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Backend Configuration Error: GEMINI_API_KEY environment variable is missing on Vercel.' 
    });
  }

  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt input parameter.' });
    }

    // Direct REST API payload structure for Gemini 2.5 Flash
    // We remove responseMimeType here to allow Google Search Grounding tool use
    const payload = JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt || "You are a professional music database expert." }]
      },
      tools: [
        { google_search: {} } // Real-time YouTube verification tool
      ]
    });

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Use native Node.js https.request to ensure perfect compatibility across all Node/Vercel versions
    const makeRequest = () => {
      return new Promise((resolve, reject) => {
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        };

        const clientReq = https.request(apiUrl, options, (clientRes) => {
          let data = '';
          clientRes.on('data', (chunk) => { data += chunk; });
          clientRes.on('end', () => {
            resolve({
              statusCode: clientRes.statusCode,
              body: data
            });
          });
        });

        clientReq.on('error', (err) => {
          reject(err);
        });

        clientReq.write(payload);
        clientReq.end();
      });
    };

    const apiResponse = await makeRequest();
    let result;

    try {
      result = JSON.parse(apiResponse.body);
    } catch (e) {
      throw new Error(`Invalid JSON received from Gemini: ${apiResponse.body.substring(0, 200)}`);
    }

    if (apiResponse.statusCode !== 200) {
      throw new Error(result.error?.message || `Gemini API returned status code ${apiResponse.statusCode}`);
    }

    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('No valid response returned from Gemini.');
    }

    return res.status(200).json({ text: textResponse });

  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
