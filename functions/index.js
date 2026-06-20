const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
                        mimeType: mimeType
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
  { secrets: [geminiApiKey], region: "us-central1" },
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

      const promptText = `Analyze the following user-submitted content (including any attached images) for a trivia/party game. The target audience is children aged 12 and up. If it contains inappropriate content for a 12-year-old, such as slurs, hate speech, sexual content, adult themes, excessive violence, profanity, or references to drugs/alcohol, respond with exactly 'REJECT'. Otherwise, respond with exactly 'APPROVE'.\n\nContent:\n${textToCheck}`;
      
      const contents = [promptText, ...imageParts];

      // Initialize the GenAI SDK with the secret key
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent(contents);
      const response = await result.response;
      const reply = response.text() || "APPROVE";
      
      return { status: reply.includes("REJECT") ? "REJECT" : "APPROVE" };
    } catch (error) {
      console.error("AI check error:", error);
      return { status: "APPROVE" }; // Fail open
    }
  }
);

const adminPassword = defineSecret("ADMIN_PASSWORD");

exports.verifyAdminPassword = onCall(
  { secrets: [adminPassword], region: "us-central1" },
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
