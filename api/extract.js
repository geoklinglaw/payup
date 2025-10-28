import { GoogleGenAI } from '@google/genai';

/** Get raw body as string from either req.body (dev) or the stream (prod) */
async function getRawBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    try { return JSON.stringify(req.body); } catch { return String(req.body); }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

/** Parse body that may be:
 *  - JSON: {"base64Receipt":"...","mimeType":"..."}
 *  - data URL: "data:image/jpeg;base64,AAAA..."
 *  - raw base64: "AAAA..."
 */
function parseBody(raw) {
  if (!raw) return { base64: '', mimeType: '' };
  const s = raw.trim();

  // JSON?
  if (s.startsWith('{')) {
    try {
      const obj = JSON.parse(s);
      return {
        base64: obj?.base64Receipt ? String(obj.base64Receipt) : '',
        mimeType: obj?.mimeType ? String(obj.mimeType) : '',
      };
    } catch { /* fall through */ }
  }

  // Data URL?
  if (s.startsWith('data:')) {
    const m = s.match(/^data:([^;]+);base64,(.*)$/);
    if (m && m[2]) return { base64: m[2], mimeType: m[1] || '' };
  }

  // Assume raw base64
  return { base64: s, mimeType: '' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is missing');
      return res.status(500).json({ error: 'Server misconfigured: GEMINI_API_KEY missing' });
    }

    // Read and parse body (works in dev & prod)
    const raw = await getRawBody(req);
    console.log('[extract] raw length:', raw?.length || 0);
    const { base64, mimeType } = parseBody(raw);
    console.log('[extract] parsed base64 length:', base64?.length || 0);

    if (!base64) {
      return res.status(400).json({ error: 'Missing base64Receipt' });
    }

    // ~6M base64 ≈ ~4.5MB binary — adjust if you like
    if (base64.length > 6_000_000) {
      return res.status(413).json({ error: 'Image too large' });
    }

    const mt = mimeType || 'image/jpeg';
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("api key: ", apiKey)

    const ai = new GoogleGenAI({ apiKey: apiKey });
    const request = {
      model: 'gemini-2.5-flash',
      contents: [
        { inlineData: { mimeType: mt, data: base64 } },
        { 
            text: `
            You are a professional receipt reader. Extract fields from this receipt image. 
            Only the following fields are needed:
            merchant,
            address,
            subtotal,
            tax,
            total
            line_items: {
            type: "array",
            items: {
                description
                quantity
                unit_price
                amount
            }

            Return only valid JSON.
            This is an example of a JSON format. 
            
            {
                "merchant": "Starbucks Coffee",
                "address": "123 Orchard Road, Singapore",
                "date": "2025-08-29",
                "subtotal": 9.50,
                "tax": 0.50,
                "total": 10.00,
                "line_items": [
                    {
                        "description": "Latte Tall",
                        "quantity": 1,
                        "unit_price": 5.00,
                        "amount": 5.00
                    },
                    {
                        "description": "Blueberry Muffin",
                        "quantity": 1,
                        "unit_price": 4.50,
                        "amount": 4.50
                    }
                ]
            }`
        },
      ],
      
      generationConfig: {
        temperature: 0, topP: 0, topK: 1, maxOutputTokens: 1024,
        response_mime_type: 'application/json',
        response_schema: {
            type: "object",
            properties: {
            merchant: { type: "string" },
            address: { type: "string" },
            date: { type: "string" },
            subtotal: { type: "number" },
            tax: { type: "number" },
            total: { type: "number" },
            line_items: {
                type: "array",
                items: {
                type: "object",
                properties: {
                    description: { type: "string" },
                    quantity: { type: "number" },
                    unit_price: { type: "number" },
                    amount: { type: "number" },
                },
                required: ["description", "amount"],
                },
            },
            },
            required: ["merchant", "date", "total"],
        }
      },
    };
    console.log(request)

    let result;
    try {
      result = await ai.models.generateContent(request);
    } catch (apiErr) {
      console.error('Gemini API error:', apiErr?.response?.status, apiErr?.response?.data || apiErr);
      return res.status(502).json({
        error: 'Gemini API error',
        details: String(apiErr?.message || apiErr),
      });
    }

    let text = result?.text;
    if (!text && result?.response?.text) text = await result.response.text();
    if (!text) {
      console.error('Empty model response:', result);
      return res.status(502).json({ error: 'Empty response from model' });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('extract handler crashed:', err);
    return res.status(500).json({ error: err?.message || 'FUNCTION_INVOCATION_FAILED' });
  }
}
