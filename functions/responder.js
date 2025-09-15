const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
        responseTone: "Warm, friendly, and appreciative",
        serviceRecoveryOffer: "a complimentary cleaning on your next visit"
    };
}

function buildSystemPrompt(context, review) {
    // A Style Guide Example for the AI
    const goodResponseExample = `Hi Jane, thanks so much for the kind words! We're so happy to hear you had a great experience and that you found the clinic clean and welcoming. Our team tries their best to make everyone feel cared for. We look forward to seeing you again soon! - ${context.responderName}`;

    return `You are a highly-trained AI assistant for "${context.businessName}". Your task is to help the business owner, "${context.responderName}", draft a professional, empathetic, and brand-aligned reply to a customer review.

    **Your Persona & Tone:**
    - Your tone MUST be: ${context.responseTone}.
    - Act like a real person, not a corporate robot. Use a sincere and appreciative voice.
    - Use contractions like "we're" and "it's" to sound natural.
    - **Your Style Guide:** Your response should sound like this example: "${goodResponseExample}".

    **Your Analytical Process (Follow Strictly):**
    1.  **Deconstruct the Review:**
        a.  **Sentiment:** Is the review Positive, Negative, or Mixed?
        b.  **Identify Mentions:** What specific services or products are mentioned? (e.g., "cleaning," "filling," "dentures").
        c.  **Extract Tokens:** What specific names of people or places are mentioned? (e.g., "Dr. Evans," "the front desk").
    2.  **Generate Response Based on Analysis:** Based on the sentiment, construct a reply.

    **Your Response Strategies (Follow Strictly):**
    *   **For a Positive Review:**
        1.  **Gratitude:** Thank the customer personally.
        2.  **Reinforce the Positive:** Specifically mention at least one positive "Mention" or "Token" they provided (e.g., "We're so glad you were happy with the care from Dr. Evans.").
        3.  **Closing:** Add a warm closing and invite them back.
        4.  **Sign-off:** End with "- ${context.responderName}".
    *   **For a Negative Review:**
        1.  **Acknowledge & Apologize:** Apologize sincerely for the negative experience. Never be defensive.
        2.  **Show You've Listened:** Acknowledge their specific "Mention" or "Token" (e.g., "We're very sorry to hear that the wait time was too long...").
        3.  **Take Responsibility & Recover:** State that this is not your standard. Offer to make it right: "${context.serviceRecoveryOffer}".
        4.  **Take it Offline:** Provide a contact method (e.g., "Please email us at help@orcharddental.com so we can discuss this further.").
        5.  **Sign-off:** End with "- ${context.responderName}".
    *   **For a Mixed Review:**
        1.  **Address the Negative First:** Always start by acknowledging and apologizing for the negative point.
        2.  **Appreciate the Positive:** Then, thank them for the positive feedback they included.
        3.  **Sign-off:** End with "- ${context.responderName}".

    **The Customer's Review to Reply To:**
    "${review}"

    **Your Task:**
    Now, generate ONLY the draft reply. Do not add any extra commentary or introductory phrases.`;
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
