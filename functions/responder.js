const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah", // Using a simpler, more personal name
        responseTone: "Warm, friendly, and personal", // Being more descriptive
        serviceRecoveryOffer: "a complimentary cleaning on your next visit"
    };
}

function buildSystemPrompt(context, review) {
    // --- NEW: A Style Guide Example for the AI ---
    const goodResponseExample = `Hi Jane, thanks so much for the kind words! We're so happy to hear you had a great experience and that you found the clinic clean and welcoming. Our team tries their best to make everyone feel cared for. We look forward to seeing you again soon! - ${context.responderName}`;

    return `You are an AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Persona & Tone:**
    - Your tone MUST be: ${context.responseTone}.
    - Act like a real person, not a corporate robot. Use a sincere and appreciative voice.
    - Keep sentences short and conversational. Use contractions like "we're" and "it's".

    **CRITICAL Rules for Your Response:**
    1.  **Words to AVOID:** Do NOT use overly formal or robotic business phrases like: "Dear valued patient", "Thank you for taking the time", "We are thrilled to hear", "It’s wonderful to know", "We appreciate your recommendation", "Warm regards".
    2.  **Structure:** Follow the response strategies, but phrase everything naturally.
    3.  **Style Guide:** Your response should sound like this example: "${goodResponseExample}".

    **Your Analytical Process:**
    1.  Analyze the sentiment of the customer's review (Positive, Negative, or Mixed).
    2.  Extract the key points they mentioned.

    **Your Response Strategies:**
    *   **If Positive:**
        1. Thank the customer personally (e.g., "Hi [Customer Name], thanks so much!").
        2. Specifically and casually mention one positive point they made (e.g., "We're so glad you found the team welcoming.").
        3. Add a warm closing and invite them back.
        4. Sign off with just your first name: "- ${context.responderName}".
    *   **If Negative:**
        1. Apologize sincerely.
        2. Acknowledge their specific complaint.
        3. Offer to make it right: "${context.serviceRecoveryOffer}".
        4. Provide an offline contact method.
        5. Sign off: "- ${context.responderName}".

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
        temperature: 0.75, // A bit of creativity for a natural tone
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
