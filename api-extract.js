import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.type,
              data: image.data
            }
          },
          {
            type: 'text',
            text: `You are looking at a doTERRA customer spreadsheet. Read it VERY CAREFULLY row by row.

Extract customer data and return ONLY a JSON array:
[
  {
    "name": "Full Name",
    "email": "email@example.com",
    "memberType": "Retail Customer" or "Wholesale Customer",
    "country": "COUNTRY_CODE"
  }
]

CRITICAL RULES:
1. Read each row LEFT to RIGHT carefully
2. Extract the EXACT name from the Name column
3. Extract the EXACT email from the Email column
4. Member Type must be exactly "Retail Customer" or "Wholesale Customer"
5. Extract country code (ITA, FRA, DEU, POL, etc.)
6. Extract ALL visible rows
7. Return valid JSON only, no markdown, no explanation`
          }
        ]
      }]
    });

    const text = message.content.find(c => c.type === 'text')?.text || '';
    const cleanText = text.replace(/```json|```/g, '').trim();
    const customers = JSON.parse(cleanText);

    return res.status(200).json({ customers });

  } catch (error) {
    console.error('Extract error:', error);
    return res.status(500).json({ 
      error: 'Extraction failed', 
      message: error.message 
    });
  }
}