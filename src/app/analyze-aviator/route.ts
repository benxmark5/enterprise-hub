import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mediaType } = await request.json();

    if (!imageBase64) {
      return Response.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Call the Gemini API instead of Anthropic
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mediaType || 'image/jpeg',
                  data: imageBase64
                }
              },
              {
                text: `You are an Aviator crash game pattern analyst.
Analyze this Aviator round history screenshot showing multipliers.
Based on the pattern of numbers visible, identify 3-5 optimal entry/exit signals.

Respond ONLY with a valid JSON array, no other text, no markdown:
[
  {
    "entry_point": 1.20,
    "exit_point": 3.50,
    "confidence": 78,
    "risk_level": "MEDIUM",
    "signal_notes": "Pattern shows consistent runs to 3x range before crash",
    "suggested_price": 3.00
  }
]

Rules:
- entry_point: between 1.01 and 2.00 (when to enter)
- exit_point: between 1.5 and 15.0, always higher than entry (when to cash out)
- confidence: integer 60-95
- risk_level: LOW if exit under 2x, MEDIUM if 2x-5x, HIGH if above 5x
- signal_notes: brief explanation based on pattern
- suggested_price: 3 for single signal, 5 for medium confidence, 10 for high bundle

Return ONLY the JSON array.`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini API error:', err);
      return Response.json(
        { error: 'Analysis service error: ' + err },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Extract textual content back from Gemini payload format safely
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    // Clean markdown blocks if Gemini decides to include them despite instructions
    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const signals = JSON.parse(clean);

    // Returns back to frontend with the identical layout as before
    return Response.json({ signals });

  } catch (error) {
    console.error('Analyze error:', error);
    return Response.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}