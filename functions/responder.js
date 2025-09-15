const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
    };
}

function buildSystemPrompt(context, review) {
    // --- A PERFECT EXAMPLE OF THE DESIRED TONE ---
    const perfectResponseExample = `Hi Jane, thank you so much for the kind words! We're so happy to hear you had a great experience and that our team made you feel welcome and cared for. It means a lot to us. We look forward to seeing you again soon! - ${context.responderName}`;

    return `You are a helpful and friendly assistant for "${context.responderName}" at "${context.businessName}". Your ONLY job is to help draft a reply to a customer review.

    **CRITICAL INSTRUCTIONS (MUST be followed):**
    
    1.  **YOUR PERSONA:** Your tone MUST be warm, sincere, humble, and casual, like a real person writing a quick, appreciative note. Use simple, everyday language. Use contractions like "it's" and "we're".
    
    2.  **THE GOAL:** Your reply should make the customer feel heard and appreciated.
    
    3.  **THE METHOD:**
        - Thank the customer.
        - Briefly mention ONE specific point they made in their review to show you read it.
        - Keep the entire reply short (2-3 sentences is best).
    
    4.  **WORDS TO AVOID:** Absolutely NO corporate jargon or overly emotional clichés. AVOID phrases like: "We are thrilled", "It's genuinely heartwarming", "truly touches our hearts", "your journey", "it was a privilege", "our greatest reward".
    
    5.  **THE PERFECT EXAMPLE:** Your final response should have the exact same style and feel as this example: "${perfectResponseExample}".

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
        temperature: 0.8, // Allow for a more natural, less rigid feel
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
