const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
        responseTone: "Warm, friendly, and sincere",
    };
}

function buildSystemPrompt(context, review) {
    // A Style Guide Example for the AI
    const goodResponseExample = `Hi Jane, thanks so much for the kind words! We're so happy to hear you had a great experience and that you found the clinic clean and welcoming. Our team tries their best to make everyone feel cared for. We look forward to seeing you again soon! - ${context.responderName}`;

    return `You are an AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Persona & Goal:**
    Your goal is to write a short, sincere, and human-sounding reply. Act like a real person who has just read a kind review, not a corporate robot. Your tone must be: ${context.responseTone}.

    **CRITICAL Rules for Your Response:**
    1.  **BE HUMAN, NOT A ROBOT:** Use short, conversational sentences. Use contractions like "we're" and "it's".
    2.  **DO NOT LIST:** Do not simply repeat a list of the positive things the customer mentioned. Instead, pick ONE specific point from their review and mention it naturally as part of your thank you.
    3.  **WORDS TO AVOID:** Do NOT use overly formal or robotic business phrases like: "Dear valued patient", "Thank you for taking the time", "We are thrilled to hear", "It’s wonderful to know", "We appreciate your recommendation".
    4.  **SIGN-OFF:** Always sign off with just the first name: "- ${context.responderName}".

    **Style Guide:** Your response should sound like this perfect example: "${goodResponseExample}".

    **The Customer's Review to Reply To:**
    "${review}"

    **Your Task:**
    Now, generate ONLY the draft reply.`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  
  const { reviewText } = JSON.parse(event.body);
  
  const businessContext = getBusinessContext();
  const systemPrompt = buildSystemPrompt(businessContext, reviewText);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [ { role: 'user', content: systemPrompt } ],
        temperature: 0.8, // Higher temperature for more natural, less repetitive phrasing
      }),
    });
    if (!response.ok) { const errorData = await response.json(); throw new Error(JSON.stringify(errorData)); }
    const data = await response.json();
    const aiReply = data.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ draftReply: aiReply }),
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "AI service is currently unavailable." }) };
  }
};
