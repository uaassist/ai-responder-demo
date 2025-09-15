const fetch = require('node-fetch');

function getBusinessContext() {
    return {
        businessName: "Orchard Dental Care",
        responderName: "Sarah",
    };
}

function buildSystemPrompt(context, review) {
    return `You are a sophisticated AI assistant helping "${context.responderName}" from "${context.businessName}" draft a reply to a customer review.

    **Your Task:**
    Your goal is to generate a short, sincere, and human-sounding reply. You will first analyze the review and then draft a reply based on that analysis. You MUST respond with a valid JSON object.

    **JSON Output Structure:**
    {
      "analysis": { /* ... */ },
      "draft": "The final, human-sounding reply text."
    }

    **Your Thought Process & Rules:**

    **Part 1: The "analysis" object**
    1.  **Sentiment:** Determine the overall sentiment.
    2.  **all_points:** List every distinct positive or negative point made by the customer.
    3.  **main_point_selection:** This is the most critical step. From your list of points, you MUST select the SINGLE most valuable and personal point to be the theme of the reply.
        -   **SELECTION CRITERIA (in order of priority):**
            1.  **PRIORITY 1: Customer Loyalty:** First, look for any signs that the person is a repeat or long-term customer.
            2.  **PRIORITY 2: Specific, Emotional Impact:** If no loyalty is mentioned, look for specific, heartfelt, or transformative experiences.
            3.  **PRIORITY 3: General Compliments:** Only if there is nothing else, fall back on more generic compliments.
        - You must briefly state your reasoning for your choice.

    **Part 2: The "draft" object**
    1.  **DO NOT LIST:** Your draft must not be a list of all the points. It must focus ONLY on the "main_point" you selected.
    2.  **HUMAN TONE & WORD CHOICE:**
        - Your tone MUST be sincere and appreciative.
        - AVOID corporate jargon, therapy-speak, or clichés.
    3.  **PERSPECTIVE & HUMILITY (CRITICAL RULE):**
        - Focus on how the customer's kind words make YOUR TEAM feel (e.g., "Your review made our day," "It means so much to us that you felt cared for").
        - DO NOT use phrases that sound like you are patting yourself on the back or taking credit for their happiness (e.g., AVOID "We are so happy we could help you," "it was a privilege," "that is our greatest reward"). Keep the focus on your gratitude for their words.
    4.  **SIGN-OFF:** Always sign off with: "- ${context.responderName}".

    **The Customer's Review to Analyze:**
    "${review}"

    **Example of a Perfect JSON Output for a long, heartfelt review:**
    {
      "analysis": {
        "sentiment": "Positive",
        "all_points": ["long personal story", "lost confidence", "Dr. Cott was caring and explained everything", "transformed my life", "gave me my self-confidence back"],
        "main_point_selection": "I chose 'gave me my self-confidence back' as the main point because it's the most powerful and emotional outcome mentioned (Priority 2)."
      },
      "draft": "Hi Jane, we are speechless. Thank you so much for sharing your story with us. Reading that our team, especially Dr. Cott, could be a part of your journey to regain your confidence means the world to us. Your words are the biggest compliment we could ever receive. - Sarah"
    }

    Now, generate the JSON object for the review provided.`;
}

exports.handler = async function (event) {
  // ... (The rest of this file is unchanged)
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
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) { const errorData = await response.json(); throw new Error(JSON.stringify(errorData)); }
    const data = await response.json();
    const aiJsonResponse = JSON.parse(data.choices[0].message.content);
    console.log("AI Full Analysis:", JSON.stringify(aiJsonResponse.analysis, null, 2));
    const aiReply = aiJsonResponse.draft;
    return {
      statusCode: 200,
      body: JSON.stringify({ draftReply: aiReply }),
    };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "AI service is currently unavailable." }) };
  }
};
