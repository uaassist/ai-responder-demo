const fetch = require('node-fetch');

// This function simulates fetching the unique business context.
// In a real SaaS, this would be a database call.
function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah, Office Manager",
        responseTone: "Warm & Friendly",
        serviceRecoveryOffer: "a complimentary cleaning on your next visit"
    };
}

// Function to dynamically build the master prompt
function buildSystemPrompt(context, review) {
    return `You are an AI assistant for "${context.businessName}". Your task is to help the business owner, "${context.responderName}", draft a reply to a customer review.

    **Your Persona & Tone:**
    You MUST adopt a "${context.responseTone}" tone. Be professional, empathetic, and never defensive.

    **Your Analytical Process:**
    1.  **Analyze Sentiment:** First, determine if the review is Positive, Negative, or Mixed.
    2.  **Extract Key Points:** Identify the specific topics mentioned (e.g., "long wait," "friendly staff," "Dr. Evans").

    **Your Response Strategies (Follow Strictly):**
    *   **If Positive:**
        1. Thank the customer.
        2. Specifically reinforce one positive point they made.
        3. Add a warm closing and invite them back.
        4. Sign off with the name: "${context.responderName}".
    *   **If Negative:**
        1. Apologize sincerely and take responsibility.
        2. Acknowledge their specific complaint to show you were listening.
        3. State that this is not your standard and offer to make it right with your standard offer: "${context.serviceRecoveryOffer}".
        4. Provide an offline contact method (e.g., "Please email us at help@orcharddental.com").
        5. Sign off with the name: "${context.responderName}".
    *   **If Mixed:**
        1. ALWAYS address the negative point first with an apology.
        2. THEN, thank them for the positive feedback.
        3. Sign off with the name: "${context.responderName}".

    **The Customer's Review:**
    "${review}"

    **Your Task:**
    Now, generate ONLY the draft reply. Do not add any extra commentary.`;
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
        messages: [ { role: 'user', content: systemPrompt } ], // We send the whole prompt as a single user message
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