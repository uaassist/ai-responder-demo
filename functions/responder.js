const fetch = require('node-fetch');

// THIS FUNCTION IS NOW CORRECTED
function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
        responseTone: "Warm, professional, and empathetic",
        // REINSTATED: The crucial style guide examples
        styleGuideExamples: [
            "Thank you for the kind review Carolyn! always such a pleasure seeing you and your family :) Thanks again, Orchard Dental Care Team",
            "Thank you for the kind review Nojan! it is always such a pleasure having you in the office, we're just as happy you found us as well :)Thanks again,Orchard Dental CareTeam",
            "Such a kind review! thank you so much for acknowledging all our hard work, we all take pride in our work. It was such a pleasure seeing you in the office :) thank you for trusting 2000 Yonge Dental with your dental care :) Thanks again, Orchard Dental Care Team",
            "Thank you so much for choosing Orchard Dental Care, we all take pride in our work at the office and it is always such a pleasure seeing you! Thanks again, Orchard Dental CareT eam",
            "Thank you for such a kind review Phil, Alex and the rest of the staff always enjoy seeing you in the office, and we're happy you enjoy our mascots just as much as we do :) Thanks again, Orchard Dental Care Team"
        ],
        serviceRecoveryOffer: "a direct call from our manager to discuss your experience and make this right"
    };
}

// THIS FUNCTION IS NOW CORRECTED
function buildSystemPrompt(context, review) {
    const formattedExamples = context.styleGuideExamples.map((ex, index) => `${index + 1}. ${ex}`).join('\n');

    return `You are a sophisticated AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Persona & Goal:**
    Your primary goal is to write a short, sincere, and human-sounding reply that perfectly matches the business's brand voice.

    **CRITICAL Style Guide (This is the most important rule):**
    Your response MUST match the overall style, tone, and vocabulary of the following real response examples.
    
    **Real Response Examples:**
    ${formattedExamples}

    **Your Analytical Process (Follow Strictly):**
    1.  **Analyze the Review:** Determine the sentiment (Positive, Negative, Mixed) and identify the single most important positive point and/or negative point.
    2.  **Draft the Reply based on the Correct Strategy.**

    **Your Response Strategies (Follow Strictly):**
    *   **For a Positive Review:**
        1. Thank the customer.
        2. Reinforce the ONE most important positive point.
        3. Add a warm closing.
    *   **For a Negative Review:**
        1. Apologize sincerely.
        2. Acknowledge the specific complaint.
        3. Offer to make it right: "${context.serviceRecoveryOffer}".
        4. Provide an offline contact method.
    *   **For a Mixed Review (THIS IS THE MOST IMPORTANT RULESET):**
        1.  **START with the Negative:** You MUST begin by sincerely apologizing and acknowledging the most important negative point.
        2.  **Offer to Make it Right:** Immediately offer the service recovery protocol: "${context.serviceRecoveryOffer}".
        3.  **Appreciate the Positive:** AFTER addressing the negative, briefly thank them for their positive feedback.
        4.  **Take it Offline:** End by providing a clear way to contact the business.

    **CRITICAL Rules for All Replies:**
    -   **TONE:** The tone must be ${context.responseTone}.
    -   **WORDS TO AVOID:** Do NOT use robotic phrases like: "We truly appreciate your patience", "Thank you for taking the time".
    -   **SIGN-OFF:** Always sign off with: "- ${context.responderName}".

    **The Customer's Review to Reply To:**
    "${review}"

    **Your Task:**
    Now, generate ONLY the draft reply.`;
}

exports.handler = async function (event) {
  // The rest of this file is unchanged.
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
