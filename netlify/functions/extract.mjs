import Anthropic from '@anthropic-ai/sdk';

export async function handler(event, context) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { image } = JSON.parse(event.body);
    
    if (!image) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'No image provided' })
      };
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
    "memberType": "Retail Customer" or "Wholesale Customer" or "Wellness Advocate",
    "country": "COUNTRY_CODE"
  }
]

CRITICAL RULES - READ TWICE BEFORE EXTRACTING:
1. Read each row LEFT to RIGHT carefully
2. Extract the EXACT name from the Name column - preserve exact spacing and capitalization
3. Extract the EXACT email from the Email column with EXTREME CARE:
   - Be very careful with numbers in emails (0, 1, 2, etc.)
   - A single "0" is NOT "00" or "009"
   - Double-check each character in the email
   - Pay special attention to similar-looking characters
4. Member Type must be exactly "Retail Customer" or "Wholesale Customer" or "Wellness Advocate"
5. Extract country code (ITA, FRA, DEU, POL, etc.)
6. Extract ALL visible rows
7. Double-check emails before finalizing - this is CRITICAL
8. Return valid JSON only, no markdown, no explanation

SPECIAL ATTENTION: Email addresses are critical. Read them character by character. Do not add extra digits.`
          }
        ]
      }]
    });

    const text = message.content.find(c => c.type === 'text')?.text || '';
    const cleanText = text.replace(/```json|```/g, '').trim();
    const customers = JSON.parse(cleanText);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customers })
    };

  } catch (error) {
    console.error('Extract error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Extraction failed', 
        message: error.message 
      })
    };
  }
}
