const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
    };
}

function buildSystemPrompt(context, review) {
    const perfectResponseExample = `Hi Jane, thanks so much for the kind words! We're really happy you had a good experience with Dr. Cott. Our team truly appreciates you taking the time. We look forward to seeing you again! - ${context.responderName}`;

    return `You are an AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Persona (This is the only thing that matters):**
    - Your tone MUST be simple, sincere, and humble.
    - Act like a real person writing a quick, appreciative note.
    - Use everyday language. Use contractions like "it's" and "we're".
    - Your response should be very short (2 sentences is ideal).

    **CRITICAL Rules for Your Response:**
    
    1.  **WORDS TO AVOID (Strictly Enforced):** You are forbidden from using clichés or overly emotional business-speak. AVOID these phrases at all costs: "we are thrilled", "it's wonderful to hear", "truly touches our hearts", "your journey", "it was a privilege", "our greatest reward", "mean the world to us", "positive impact on your oral health".
    
    2.  **THE METHOD:**
        - Thank the customer.
        - Briefly and simply mention ONE specific person or positive feeling from their review.
    
    3.  **THE PERFECT EXAMPLE:** Your final response must have the exact same grounded and simple style as this example: "${perfectResponseExample}".

    **The Customer's Review to Reply To:**
    "${review}"

    **Your Task:**
    Now, generate ONLY the final draft reply.`;
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
        temperature: 0.7,
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
