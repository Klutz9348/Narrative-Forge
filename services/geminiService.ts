import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key is missing.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDialogueVariations = async (
  characterName: string,
  currentLine: string,
  tone: string = "neutral"
): Promise<string[]> => {
  try {
    const ai = getAiClient();
    const prompt = `为角色 "${characterName}" 生成 3 个中文对话变体。
    当前台词是：“${currentLine}”。
    期望语气：${tone}。
    请保持适合游戏剧本的风格。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as string[];
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export const expandSceneDescription = async (
  locationName: string,
  baseDescription: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `为名为 "${locationName}" 的游戏场景写一段生动、有氛围的中文描述。
    基础背景：${baseDescription}。
    限制在 50 字以内。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "生成描述时出错。";
  }
};