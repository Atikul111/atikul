
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSignalOutcome = async (
  pair: string,
  type: string,
  entry: number,
  close: number,
  reason: string
) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this binary trade outcome:
        Pair: ${pair}
        Trade Type: ${type}
        Entry: ${entry}
        Close: ${close}
        Technical Reason for Signal: ${reason}
        
        Provide a very brief 1-sentence expert analysis of why this trade won or lost based on typical OTC market volatility.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed", error);
    return "Market volatility fluctuated outside predicted technical bounds.";
  }
};

export const generateMarketInsight = async (marketData: any[]) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on these live OTC market prices: ${JSON.stringify(marketData)}, which asset looks most trending for a 1-minute reversal? Provide a short professional tip for the user.`,
    });
    return response.text;
  } catch (error) {
    return "Monitor EMA crosses on Volatility indices for high-probability setups.";
  }
}
