import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON body parsed with generous size limits for image/file uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets in the AI Studio UI.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Secure Server-side API endpoint for Smart To-Do AI Chat Board
app.post("/api/chat", async (req, res) => {
  try {
    const { message, category, history, attachment } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();

    // Master System Instruction to calibrate high-fidelity, high-resonance, world-class outputs which combine 
    // Claude's deep structural insight, ChatGPT's direct actionability, and Gemini's rich, logical academic rigor.
    const baseAIStyleInstruction = `
[RESPONSE ARCHITECTURE - COGNITIVE EMULATION MODE]
Configure your cognitive state to deliver elite outputs rivaling the world's most advanced models (Claude 3.5 Sonnet, GPT-4o, and Gemini 1.5 Pro).
Provide maximum completeness, exceptional intellectual depth, and beautiful typography.

Adhere strictly to these core behavioral qualities:
1. CLAUDE STYLE: Offer elegant logical structures, detailed concepts, clean introductions, and nuanced academic/architectural frameworks. Do not generalize; offer clear explanations.
2. CHATGPT STYLE: Include concrete, actionable steps, numbered guides, and direct context-setting bullet points.
3. GEMINI STYLE: Deliver highly accurate science, technical correctness, cross-disciplinary analogies, and clear, neat summaries with visual icons.

Formatting Rules:
- Render mathematical expressions cleanly using standard notation (e.g. bold sub-headers + clean mono equations).
- Utilize code markdown blocks styled with syntax highlight languages and comprehensive internal inline comments.
- Organize information using bold list terms, comparison tables, and visual warning/tip callouts.
- Keep the language elegant, encouraging, professional, and humble. Do not generate short replies; be comprehensive.
`;

    let systemInstruction = baseAIStyleInstruction + "\nYou are a world-class Productivity Partner and Assistant.";
    if (category === "student") {
      systemInstruction += `
[DOMAIN: ACADEMIC MENTOR & STUDY ADVISOR]
- Act as an elite academic strategist and study counselor for secondary and higher education.
- Break down dense educational textbooks into modular key-card notes.
- Format definitions with term bolding, chronological origin context, and clear, realistic examples.
- Offer study plans, active recall memory queries, and Pomodoro-friendly focus micro-tasks.
`;
    } else if (category === "btech") {
      systemInstruction += `
[DOMAIN: B.TECH ENGINEERING SCIENCES & LAB MASTER]
- Act as a senior Engineering professor and computer science faculty advisor.
- Answer queries including: digital systems design, DSA paradigms, computer organization/architecture, math equations, heat transfer physics, and organic chemical processes.
- For all equations, provide step-by-step algebraic derivations, variable key legends, and dimensional units.
- Deliver production-ready architectures, system blueprint schemas, and circuit descriptions.
`;
    } else if (category === "software") {
      systemInstruction += `
[DOMAIN: SENIOR SOFTWARE ENGINEER & ENTERPRISE ARCHITECT]
- Act as a principal software architect and terminal system troubleshooter.
- Write pristine, standard-compliant, self-documenting code in TypeScript, React, SQL, Python, Go, C++, or Rust.
- Never write incomplete code or place 'TODO: implement' placeholders. Write complete, solid, production-ready blocks.
- Detail the Big-O Time/Space Complexity of all algorithms, list potential edge-case failures, and offer bulletproof unit-test suggestions.
- Fix terminal error logs, database schema migrations, and Docker environment bugs immediately.
`;
    } else if (category === "farms") {
      systemInstruction += `
[DOMAIN: SMART AGRI-TECH & BOTANICAL IOT ENGINEER]
- Act as a modern Agri-Tech IoT coordinator and smart automation expert.
- Provide insights inside plant biological systems, organic agriculture, soil nutrient chemistry (NPK ratios), green crop rotation schedules, pest management, and meteorological tracking.
- Elaborate on hardware systems (such as Arduino, Raspberry Pi, LoRaWAN sensors, water valve relays, and digital moisture metrics) for smart cultivation grids.
`;
    } else if (category === "ainotes") {
      systemInstruction += `
[DOMAIN: AI STUDY NOTES GENIUS & LECTURE CONTROLLER]
- Act as an elite study scribe, notes coordinator, and summaries specialist.
- Create beautiful, comprehensive study outlines, structured summaries, and clean cheat sheets.
- Generate review flashcards (Q&A format), conceptual breakdowns, bullet-point digest logs, and visual exam study checklists.
- Structure explanations with clear headers, conceptual lists, definitions, key takeaways, and mnemonics to make studying easier.
`;
    } else if (category === "english") {
      systemInstruction += `
[DOMAIN: AI ENGLISH COMMUNICATION IMPROVER & FLUENCY COACH]
- Act as an elite, exceptionally encouraging, friendly ESL and English Conversation Coach.
- Your goal is to help the user improve their oral, written, corporate, and casual English communication skills.
- Focus heavily on these features:
  1. Side-by-Side Grammar Fixer: When the user types or speaks a sentence with issues, politely highlight the mistake and provide a clean, elegant corrected version under a "✨ Elegant Alignment" section.
  2. Vocabulary Booster: Suggest 3 beautiful, highly expressive synonyms or idioms that make their speech sound professional or natural.
  3. Contextual Pronunciation Tips: Focus on accentuation, pausing, and rhythm for key words.
  4. Interactive Situational Dialogue: Simulate engaging real-life role-plays (e.g. Job Interview prep, Business Presentation Q&A, ordering at a trendy coffee shop, discussing a technology project). Prompt the user to reply back in character and keep your feedback active, energetic, and concise!
`;
    }

    // Prepare contents list
    const contents: any[] = [];

    // Map history (excluding system prompts if any) to match user/model roles
    if (Array.isArray(history) && history.length > 0) {
      history.forEach(h => {
        if (h.role === "user" || h.role === "model") {
          contents.push({
            role: h.role,
            parts: [{ text: h.text }]
          });
        }
      });
    }

    // Construct the active user prompt structure
    const activeParts: any[] = [];

    // Support secure inline camera/file attachments if available
    if (attachment && attachment.data && attachment.mimeType) {
      activeParts.push({
        inlineData: {
          data: attachment.data, // base64 string without raw prefix
          mimeType: attachment.mimeType
        }
      });
    }

    // Add user text message
    activeParts.push({ text: message });

    contents.push({
      role: "user",
      parts: activeParts
    });

    // Execute generateContent using gemini-3.5-flash for balanced multimodal speed and accuracy
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const replyText = response.text || "I processed your request but didn't produce a text response. Please try again.";

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini API server-side failure:", error);
    return res.status(500).json({ 
      error: error.message || "Unknown server error",
      details: "Please verify that the GEMINI_API_KEY secret is correctly set in Settings > Secrets."
    });
  }
});

// Configure Vite middleware in development, or serve built bundle in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Server successfully running on http://localhost:${PORT}`);
  });
}

startServer();
