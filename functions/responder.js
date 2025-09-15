const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
        responseTone: "Warm, friendly, and sincere",
        styleGuideExamples: [
            "Thank you for the kind review Carolyn! always such a pleasure seeing you and your family :) Thanks again, Orchard Dental Care Team",
            "Thank you for the kind review Nojan! it is always such a pleasure having you in the office, we're just as happy you found us as well :)Thanks again,Orchard Dental CareTeam",
            "Such a kind review! thank you so much for acknowledging all our hard work, we all take pride in our work. It was such a pleasure seeing you in the office :) thank you for trusting 2000 Yonge Dental with your dental care :) Thanks again, Orchard Dental Care Team",
            "Thank you so much for choosing Orchard Dental Care, we all take pride in our work at the office and it is always such a pleasure seeing you! Thanks again, Orchard Dental CareT eam",
            "Thank you for such a kind review Phil, Alex and the rest of the staff always enjoy seeing you in the office, and we're happy you enjoy our mascots just as much as we do :) Thanks again, Orchard Dental Care Team"
        ],
        serviceRecoveryOffer: "a complimentary cleaning on your next visit"
    };
}

function buildSystemPrompt(context, review) {
    const formattedExamples = context.styleGuideExamples.map((ex, index) => `${index + 1}. ${ex}`).join('\n');
    return `You are a sophisticated AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Persona & Goal:**
    Your primary goal is to write a short, sincere, and human-sounding reply that perfectly matches the business's brand voice.

    **CRITICAL Style Guide (This is the most important rule):**
    Your response MUST match the overall style, tone, and vocabulary of the following real response examples, which were provided by the business owner. Do not copy them directly, but capture their essence.

    **Real Response Examples:**
    ${formattedExamples}

    **Your Thought Process (Follow Strictly):**
    1.  **Analyze the Review:** Determine the sentiment (Positive, Negative, Mixed) and identify the SINGLE most important point the customer made.
    2.  **Draft the Reply:** Write a short, conversational reply that thanks the customer and ONLY mentions the single most important point you identified. Do NOT list multiple points from the review.

    **CRITICAL Rules for Your Response:**
    -   **TONE:** The tone must be ${context.responseTone}.
    -   **WORDS TO AVOID:** Do NOT use overly formal or robotic business phrases like: "Dear valued patient", "Thank you for taking the time", "We are thrilled to hear".
    -   **SIGN-OFF:** Always sign off with: "- ${context.responderName}".

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
        temperature: 0.75,
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
