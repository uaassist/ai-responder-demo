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
    Your goal is to generate a short, sincere, and human-sounding reply. To do this, you will first analyze the review and then draft a reply based on that analysis. You MUST respond with a valid JSON object containing your analysis and the final draft.

    **JSON Output Structure:**
    {
      "analysis": {
        "sentiment": "Positive, Negative, or Mixed",
        "all_points": ["A list of all key points mentioned in the review."],
        "main_point_selection": "Explain which point you chose as the main theme and WHY you chose it based on the selection criteria."
      },
      "draft": "The final, human-sounding reply text."
    }

    **Your Thought Process & Rules:**

    **Part 1: The "analysis" object**
    1.  **Sentiment:** Determine the overall sentiment.
    2.  **all_points:** List every distinct positive or negative point made by the customer.
    3.  **main_point_selection:** This is the most critical step. From your list of points, you MUST select the SINGLE most specific and valuable point to be the theme of the reply.
        -   **SELECTION CRITERIA:** Prioritize specific comments about treatments, unique facility features (e.g., "calm and pleasant"), or unexpectedly smooth processes (like "insurance") over generic compliments (like "friendly staff" or "nice"). You must briefly state your reasoning.

    **Part 2: The "draft" object**
    1.  **DO NOT LIST:** Your draft must not be a list of all the points. It must focus ONLY on the "main_point" you selected in your analysis.
    2.  **HUMAN TONE:** Use a casual, grounded, and sincere tone. Use contractions. AVOID robotic phrases like "We are thrilled to hear".
    3.  **SIGN-OFF:** Always sign off with: "- ${context.responderName}".

    **The Customer's Review to Analyze:**
    "${review}"

    **Example of a Perfect JSON Output:**
    {
      "analysis": {
        "sentiment": "Positive",
        "all_points": ["great experience", "calm and pleasant facility", "welcoming and professional staff", "smooth treatment and insurance process"],
        "main_point_selection": "I chose 'calm and pleasant facility' as the main point because it is a specific and valuable compliment about the atmosphere, which is more unique than general comments about staff."
      },
      "draft": "Hi there, thank you for the wonderful review! We work hard to make our facility feel calm and pleasant, so it means a lot to hear that you had a great experience. We look forward to seeing you again soon! - Sarah"
    }

    Now, generate the JSON object for the review provided.`;
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
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) { const errorData = await response.json(); throw new Error(JSON.stringify(errorData)); }
    const data = await response.json();
    
    const aiJsonResponse = JSON.parse(data.choices[0].message.content);
    
    // --- THIS IS THE NEW LINE FOR DEBUGGING ---
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
