import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function test() {
  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("No API key");
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Hello",
    });
    console.log(response.text);
  } catch (error) {
    console.error(error);
  }
}
test();
