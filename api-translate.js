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
    const { template, name, language } = req.body;

    const firstName = name.split(/[,\s]+/)[0] || name;

    if (language === 'English') {
      return res.status(200).json({ 
        translatedEmail: template.replace('[name]', firstName) 
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Translate this email to ${language}. Keep the exact same tone, links, and emojis. Replace [name] with "${firstName}":\n\n${template}\n\nReturn ONLY the translated email, nothing else.`
      }]
    });

    const translatedEmail = message.content.find(c => c.type === 'text')?.text || template.replace('[name]', firstName);

    return res.status(200).json({ translatedEmail });

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ 
      error: 'Translation failed', 
      message: error.message 
    });
  }
}