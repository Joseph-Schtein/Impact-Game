const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Define a secret parameter for the Gemini API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

async function urlToBase64Part(url) {
  if (!url) return null;
  if (url.startsWith('data:')) {
    // e.g. data:image/jpeg;base64,/9j/...
    const match = url.match(/^data:(image\/[a-zA-Z0-9.+]+);base64,(.+)$/);
    if (match) {
      return {
        inlineData: {
          data: match[2],
          mimeType: match[1]
        }
      };
    }
  } else if (url.startsWith('http')) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: mimeType.split(';')[0].trim() // clean up mime type
          }
        };
      }
    } catch (e) {
      console.error("Error fetching image URL:", e);
    }
  }
  return null;
}

exports.checkQuestionWithAgent = onCall(
  { secrets: [geminiApiKey], region: "us-central1", invoker: "public" },
  async (request) => {
    try {
      const data = request.data;
      if (!data || !data.type) {
        throw new HttpsError("invalid-argument", "Missing question data");
      }

      let textToCheck = "";
      let imageParts = [];

      if (data.type === 'trivia') {
        textToCheck = `Question: ${data.text}\nOptions: ${data.options.join(', ')}`;
        if (data.mediaUrl) {
          const part = await urlToBase64Part(data.mediaUrl);
          if (part) imageParts.push(part);
        }
      } else if (data.type === 'hangman') {
        textToCheck = `Word/Phrase: ${data.word}`;
        if (data.mediaUrl) {
          const part = await urlToBase64Part(data.mediaUrl);
          if (part) imageParts.push(part);
        }
      } else if (data.type === 'match_pair') {
        textToCheck = `Pairs:\n`;
        for (const p of data.pairs) {
          textToCheck += `${p.left || '[image]'} - ${p.right || '[image]'}\n`;
          if (p.leftImg) {
            const part = await urlToBase64Part(p.leftImg);
            if (part) imageParts.push(part);
          }
          if (p.rightImg) {
            const part = await urlToBase64Part(p.rightImg);
            if (part) imageParts.push(part);
          }
        }
      }

      const promptText = `You are a strict content moderator for a mobile trivia/word game targeting children aged 10 and above (10+). Your job is to review user-submitted content (text and/or images) and decide whether it is appropriate for this audience.

STRICT RULES – REJECT if ANY of the following apply:
- Profanity, curse words, slurs, or offensive language in ANY language. For Hebrew, specifically check for slang and profanity (e.g., קללות, מילות גנאי, שפה בוטה).
- Sexual content, nudity, adult themes, or suggestive material
- Graphic violence, gore, or disturbing imagery
- Hate speech, discrimination, or harmful stereotypes
- Drug, alcohol, or substance references
- Double entendres or hidden offensive meanings
- Anything clearly inappropriate for children aged 10+

Important: You must internally translate the text if it is in Hebrew, Arabic, or Russian to evaluate the true meaning before making your decision.

Content submitted for review:
${textToCheck}

${imageParts.length > 0 ? 'Images are also attached – check them for inappropriate visual content.' : ''}

Respond with ONLY one word: either APPROVE or REJECT.
Do NOT explain your reasoning. Do NOT add any other text.`;

      // Build the parts array correctly: text first, then any image parts
      const parts = [
        { text: promptText },
        ...imageParts
      ];

      // Initialize the GenAI SDK with the secret key
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
        ]
      });

      const result = await model.generateContent({ contents: [{ role: "user", parts }] });
      const response = result.response;

      // Check finish reason – if blocked by safety, treat as REJECT
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
        console.log("Content blocked by safety filters – REJECT");
        return { status: "REJECT" };
      }

      let reply = "";
      try {
        reply = response.text().trim().toUpperCase();
      } catch (textErr) {
        // response.text() throws if content was blocked
        console.log("response.text() threw – treating as REJECT:", textErr.message);
        return { status: "REJECT" };
      }

      console.log("AI filter reply:", reply);
      // Only approve if the reply is EXPLICITLY "APPROVE". Any other response → REJECT.
      return { status: reply === "APPROVE" ? "APPROVE" : "REJECT" };

    } catch (error) {
      console.error("AI check error:", error);
      // Fail CLOSED – any unexpected error means we cannot verify the content, so REJECT.
      return { status: "REJECT" };
    }
  }
);

const adminPassword = defineSecret("ADMIN_PASSWORD");

exports.verifyAdminPassword = onCall(
  { secrets: [adminPassword], region: "us-central1", invoker: "public" },
  async (request) => {
    try {
      const data = request.data;
      if (!data || !data.password) {
        return { success: false };
      }

      const isMatch = (data.password.trim() === adminPassword.value().trim());
      return { success: isMatch };
    } catch (error) {
      console.error("Password verify error:", error);
      return { success: false };
    }
  }
);
