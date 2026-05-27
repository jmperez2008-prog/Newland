import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { encrypt, decrypt } from "./utils/crypto";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    next();
  });

  // API routes
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key missing" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Error in /api/gemini/analyze:", error);
      res.status(500).json({ error: "Error generating analysis" });
    }
  });

  app.post("/api/gemini/evaluate", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key missing" });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Error in /api/gemini/evaluate:", error);
      res.status(500).json({ error: "Error generating evaluation" });
    }
  });

  app.post("/api/save-email-config", async (req, res) => {
    try {
      const { userId, config } = req.body;
      if (!userId || !config) {
        return res.status(400).json({ error: "Missing userId or config" });
      }
      const encryptedPass = encrypt(config.smtp_pass);
      
      res.json({ 
        user_id: userId,
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user,
        smtp_pass: encryptedPass,
        smtp_secure: config.smtp_secure
      });
    } catch (error) {
      console.error("Error in save-email-config:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html, smtpConfig } = req.body;
      
      if (!smtpConfig || !smtpConfig.pass) {
        return res.status(400).json({ error: "Missing SMTP configuration" });
      }

      // Decrypt password
      const decryptedPass = decrypt(smtpConfig.pass);
      
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: decryptedPass,
        },
      });

      await transporter.sendMail({
        from: smtpConfig.user,
        to,
        subject,
        html,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static("dist"));
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(new URL('./dist/index.html', import.meta.url).pathname);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
