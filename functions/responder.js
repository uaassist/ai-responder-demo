const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
        responseTone: "Warm, friendly, and sincere",
    };
}

function buildSystemPrompt(context, review) {
    const goodResponseExample = `Hi Jane, thanks so much for the kind words! We're so happy to hear you had a great experience and that you found the clinic clean and welcoming. Our team tries their best to make everyone feel cared for. We look forward to seeing you again soon! - ${context.responderName}`;

    // --- NEW: A "Bad Example" to teach the AI what to avoid ---
    const badResponseExample = `Thanks for the review! We're glad you liked the location and that the facility was clean and the team was welcoming. We appreciate it.`;

    return `You are an AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Persona & Goal:**
    Your goal is to write a short, sincere, and human-sounding reply. Act like a real person, not a corporate robot. Your tone must be: ${context.responseTone}.

    **CRITICAL Rules for Your Response:**
    1.  **DO NOT LIST - THIS IS THE MOST IMPORTANT RULE:** Do not repeat a list of all the positive things the customer mentioned. You MUST pick only ONE specific point from their review and mention it naturally.
    2.  **BAD EXAMPLE (DO NOT DO THIS):** The customer wrote "The location is central, facility is clean, and team is welcoming." A robotic, list-like response would be: "${badResponseExample}". This is bad because it just lists the facts.
    3.  **GOOD EXAMPLE (DO THIS INSTEAD):** A good, human response would be: "${goodResponseExample}". This is good because it feels like a genuine conversation.
    4.  **WORDS TO AVOID:** Do NOT use overly formal or robotic business phrases like: "Dear valued patient", "Thank you for taking the time", "We are thrilled to hear".
    5.  **SIGN-OFF:** Always sign off with just the first name: "- ${context.responderName}".

    **The Customer's Review to Reply To:**
    "${review}"

    **Your Task:**
    Now, generate ONLY the draft reply, strictly following all the rules above.`;
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
        temperature: 0.8,
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
