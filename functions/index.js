const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Define a secret parameter for the Gemini API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.checkQuestionWithAgent = onCall(
  { secrets: [geminiApiKey], region: "us-central1" },
  async (request) => {
    try {
      const data = request.data;
      if (!data || !data.type) {
        throw new HttpsError("invalid-argument", "Missing question data");
      }

      let textToCheck = "";
      if (data.type === 'trivia') {
          textToCheck = `Question: ${data.text}\nOptions: ${data.options.join(', ')}`;
      } else if (data.type === 'hangman') {
          textToCheck = `Word/Phrase: ${data.word}`;
      } else if (data.type === 'match_pair') {
          textToCheck = `Pairs:\n${data.pairs.map(p => p.left + " - " + p.right).join('\n')}`;
      }

      const prompt = `Analyze the following user-submitted content for a trivia/party game. If it contains inappropriate content, such as slurs, hate speech, sexual/18+ content, or extreme violence, respond with exactly 'REJECT'. Otherwise, respond with exactly 'APPROVE'.\n\nContent:\n${textToCheck}`;

      // Initialize the GenAI SDK with the secret key
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const result = await model.generateContent(prompt);
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
      
      const isMatch = (data.password === adminPassword.value());
      return { success: isMatch };
    } catch (error) {
      console.error("Password verify error:", error);
      return { success: false };
    }
  }
);
