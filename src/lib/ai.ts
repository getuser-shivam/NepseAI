import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import Groq from "groq-sdk";
import { AnalysisResult, MarketSentiment, Stock, ChatMessage } from "../types";

// The API keys are managed by the platform or user secrets
const geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const groqAi = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY, dangerouslyAllowBrowser: true }) : null;

export type AiProvider = "gemini" | "groq";

export function getPreferredProvider(): AiProvider {
  const saved = localStorage.getItem("nepse_ai_provider") as AiProvider;
  if (saved === "groq" && !groqAi) return "gemini";
  if (saved && (saved === "gemini" || saved === "groq")) return saved;
  return "gemini";
}

export function setPreferredProvider(provider: AiProvider) {
  localStorage.setItem("nepse_ai_provider", provider);
}

const SYSTEM_PROMPT = `
You are a CFA-level analyst and NEPSE market expert. Nepal context:

MARKET STRUCTURE:
- NEPSE (Nepal Stock Exchange) — only stock exchange in Nepal
- Regulator: SEBON (Securities Board of Nepal)
- Trading days: Sunday to Thursday
- Market hours: 11:00 AM – 3:00 PM Nepal Time (UTC+5:45)
- Settlement: T+3 rolling
- Circuit breaker: ±10% daily per stock
- Minimum lot: 10 shares

KEY SECTORS: Commercial Banks, Hydropower, Life Insurance, Development Banks, Microfinance, Non-Life Insurance, Manufacturing, Hotels, Finance Companies, Trading.

NEPAL-SPECIFIC FACTORS:
1. Remittance inflows (~25% GDP) drive retail investor liquidity.
2. NRB (Nepal Rastra Bank) policy rate affects bank stocks and margin lending.
3. Monsoon season affects hydropower revenue (June-Sept = high, Oct-May = lean).
4. Bonus shares and Rights issues are frequent price correction triggers.
5. NRB margin lending: 50% LTV cap.

OUTPUT: Always return valid JSON only for structured analysis. For chat, be professional and concise.
`;

export async function analyzeStock(stock: Stock): Promise<AnalysisResult | null> {
  const provider = getPreferredProvider();
  
  try {
    if (provider === "groq" && groqAi) {
      if (!process.env.GROQ_API_KEY) throw new Error("Groq API Key missing");
      const completion = await groqAi.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze this NEPSE stock and return ONLY valid JSON:
            Symbol: ${stock.symbol}
            Name: ${stock.name}
            LTP: ${stock.ltp}
            Change: ${stock.changePercent}%
            Volume: ${stock.volume}
            Turnover: ${stock.turnover}
            High/Low: ${stock.high}/${stock.low}` }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return { ...result, provider: "Groq (Llama 3.3 70B)" };
    }

    // Default to Gemini (Fast Analysis using flash-lite)
    const response = await geminiAi.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Analyze this NEPSE stock:
      Symbol: ${stock.symbol}
      Name: ${stock.name}
      LTP: ${stock.ltp}
      Change: ${stock.changePercent}%
      Volume: ${stock.volume}
      Turnover: ${stock.turnover}
      High/Low: ${stock.high}/${stock.low}
      
      Provide a detailed analysis.`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signal: { type: Type.STRING, enum: ["strongBuy", "buy", "hold", "sell", "strongSell"] },
            targetPrice: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            confidenceScore: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            catalysts: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            timeHorizon: { type: Type.STRING, enum: ["shortTerm", "mediumTerm", "longTerm"] },
            nepaleseContext: { type: Type.STRING }
          },
          required: ["signal", "targetPrice", "stopLoss", "confidenceScore", "reasoning", "catalysts", "risks", "timeHorizon", "nepaleseContext"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return { ...result, provider: "Gemini 3.1 Flash Lite" };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return null;
  }
}

export async function analyzeMarket(summary: any, topStocks: Stock[]): Promise<MarketSentiment | null> {
  const provider = getPreferredProvider();

  try {
    if (provider === "groq" && groqAi) {
      const completion = await groqAi.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyze the current NEPSE market sentiment and return ONLY valid JSON:
            Index: ${summary.index}
            Change: ${summary.change} (${summary.percentChange})
            Turnover: ${summary.turnover}
            Top Stocks: ${topStocks.slice(0, 5).map(s => `${s.symbol} (${s.changePercent}%)`).join(", ")}` }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content || "{}");
    }

    // Fast Analysis using flash-lite
    const response = await geminiAi.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Analyze the current NEPSE market sentiment:
      Index: ${summary.index}
      Change: ${summary.change} (${summary.percentChange})
      Turnover: ${summary.turnover}
      Top Stocks: ${topStocks.slice(0, 5).map(s => `${s.symbol} (${s.changePercent}%)`).join(", ")}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
            phase: { type: Type.STRING, enum: ["Accumulation", "Markup", "Distribution", "Decline"] },
            topSectorsToBuy: { type: Type.ARRAY, items: { type: Type.STRING } },
            topSectorsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
            keyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ["sentiment", "phase", "topSectorsToBuy", "topSectorsToAvoid", "keyRisks", "summary"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Market Analysis Error:", error);
    return null;
  }
}

export async function deepResearch(query: string): Promise<string> {
  const provider = getPreferredProvider();

  try {
    if (provider === "groq" && groqAi) {
      const completion = await groqAi.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\nPerform deep research and provide a comprehensive, structured report in Markdown format." },
          { role: "user", content: query }
        ],
        model: "llama-3.3-70b-versatile"
      });
      return completion.choices[0].message.content || "No research findings available.";
    }

    // Complex Task using Pro with High Thinking
    const response = await geminiAi.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: query,
      config: {
        systemInstruction: SYSTEM_PROMPT + "\nPerform deep research and provide a comprehensive, structured report in Markdown format.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
      }
    });
    return response.text || "No research findings available.";
  } catch (error) {
    console.error("Deep Research Error:", error);
    return "Failed to perform deep research.";
  }
}

export async function chatWithAi(history: ChatMessage[], message: string): Promise<string> {
  const provider = getPreferredProvider();

  try {
    if (provider === "groq" && groqAi) {
      const completion = await groqAi.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\nYou are the NEPSE AI Assistant. Help users with their queries about the Nepal Share Market." },
          ...history.map(m => ({ role: m.role === "model" ? "assistant" : "user" as any, content: m.text })),
          { role: "user", content: message }
        ],
        model: "llama-3-8b-8192"
      });
      return completion.choices[0].message.content || "I'm sorry, I couldn't process that.";
    }

    // General Task using Flash with Search Grounding
    const response = await geminiAi.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT + "\nYou are the NEPSE AI Assistant. Help users with their queries about the Nepal Share Market. Use search to provide up-to-date information.",
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "An error occurred during our conversation.";
  }
}

export async function analyzeImage(base64Image: string, mimeType: string, prompt: string): Promise<string> {
  try {
    const response = await geminiAi.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt || "Analyze this image in the context of the Nepal stock market or finance." }
        ]
      },
      config: {
        systemInstruction: SYSTEM_PROMPT
      }
    });
    return response.text || "Could not analyze the image.";
  } catch (error) {
    console.error("Image Analysis Error:", error);
    return "An error occurred while analyzing the image.";
  }
}

export async function generateMarketImage(prompt: string, aspectRatio: string, size: string, quality: "standard" | "high"): Promise<string | null> {
  try {
    const model = quality === "high" ? "gemini-3-pro-image-preview" : "gemini-3.1-flash-image-preview";
    
    const response = await geminiAi.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: size as any
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Generation Error:", error);
    return null;
  }
}
