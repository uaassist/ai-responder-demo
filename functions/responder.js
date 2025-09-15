const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
        responseTone: "Warm, friendly, and sincere",
    };
}

function buildSystemPrompt(context, review) {
    const goodResponseExample = `Hi Jane, thanks for the kind words! We're so glad you had a great experience and that the team made you feel welcome. We look forward to seeing you again soon! - ${context.responderName}`;

    return `You are an AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review. Your goal is to write a short, sincere, and human-sounding reply.

    **Your Thought Process (You MUST follow these steps):**
    1.  **Analyze the Review:** Read the customer's review and identify all the positive points they mentioned.
    2.  **Select ONE Point:** From the list of positive points, you MUST choose only the SINGLE most personal and important one to focus on. For a dental clinic, "welcoming team" or "caring dentist" is more personal than "clean facility" or "central location."
    3.  **Draft the Reply:** Write a short, conversational reply that thanks the customer and ONLY mentions the single point you selected in step 2.
    4.  **Final Check:** Review your draft. Does it sound like a real person? Does it avoid listing multiple points? If not, rewrite it until it does.

    **CRITICAL Rules for the Final Output:**
    -   **DO NOT LIST:** The final output must not list multiple positive points. This is the most important rule.
    -   **TONE:** The tone must be ${context.responseTone}. Use contractions.
    -   **WORDS TO AVOID:** Do not use robotic phrases like "Thank you for taking the time", "We are thrilled to hear", "It’s wonderful to know".
    -   **SIGN-OFF:** Always sign off with: "- ${context.responderName}".

    **Style Guide (A Perfect Response):** "${goodResponseExample}"

    **The Customer's Review to Reply To:**
    "${review}"

    **Your Task:**
    Now, provide ONLY the final draft reply. Do not show your thought process, just the final result.`;
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
        temperature: 0.7, // Lowering temperature to make it follow the strict rules more closely
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
