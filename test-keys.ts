import "dotenv/config";
console.log(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "no GEMINI_API_KEY");
console.log(process.env.API_KEY ? process.env.API_KEY.substring(0, 5) : "no API_KEY");
