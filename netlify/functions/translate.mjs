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
    const { template, name, language, subject } = JSON.parse(event.body);
    
    // Extract FIRST NAME only (not surname)
    // Handle formats like "Brozzi, Alessandro" or "Alessandro Brozzi"
    let firstName = name;
    
    if (name.includes(',')) {
      // Format: "Surname, Name" -> take second part
      firstName = name.split(',')[1].trim().split(/\s+/)[0];
    } else {
      // Format: "Name Surname" -> take first part
      firstName = name.split(/\s+/)[0];
    }

    // Clean subject - remove emoji encoding issues
    let cleanSubject = subject || 'Welcome to the doTERRA Team!';
    // Remove problematic characters like Ã°ÂŸÂŒÂ¿
    cleanSubject = cleanSubject.replace(/Ã°[^\s]+/g, '').trim();
    // Add personalization: "Welcome to the doTERRA Team! Alessandro Brozzi | +39 3662156309"
    cleanSubject = `${cleanSubject} Alessandro Brozzi | +39 3662156309`;

    // If English, just replace the name and fix spacing
    if (language === 'English') {
      const formattedEmail = template
        .replace(/\[name\]/g, firstName)
        .replace(/\n([A-Z])/g, '\n\n$1'); // Add double newlines before sentences
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          translatedEmail: formattedEmail,
          subject: cleanSubject
        })
      };
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Translate this email to ${language}. 

CRITICAL RULES:
1. Keep the exact same tone, links, and meaning
2. Replace [name] with "${firstName}" (just first name, not surname)
3. Add blank lines between paragraphs for better readability
4. Return ONLY the translated email body, nothing else
5. Do NOT include any preamble or explanation

Email to translate:
${template}

Return ONLY the translated email.`
      }]
    });

    const translatedEmail = message.content.find(c => c.type === 'text')?.text || template.replace(/\[name\]/g, firstName);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        translatedEmail,
        subject: cleanSubject
      })
    };

  } catch (error) {
    console.error('Translation error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Translation failed', 
        message: error.message 
      })
    };
  }
}
