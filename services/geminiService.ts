import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import { StoryPage } from "../types";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const storyGenerationModel = 'gemini-2.5-flash';
const imageGenerationModel = 'imagen-4.0-generate-001';
const ttsModel = 'gemini-2.5-flash-preview-tts';
const chatModel = 'gemini-2.5-flash';

const storySchema = {
  type: Type.OBJECT,
  properties: {
    pages: {
      type: Type.ARRAY,
      description: "An array of pages for the story. Each page should be a short paragraph.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The text content of the story page. Should be 1-3 sentences.",
          },
          imagePrompt: {
            type: Type.STRING,
            description: "A detailed, descriptive prompt for an image generator, based on the page's text. Should describe a scene in a children's book illustration style.",
          },
        },
        required: ["text", "imagePrompt"],
      },
    },
  },
  required: ["pages"],
};

export async function generateStory(prompt: string): Promise<Omit<StoryPage, 'imageUrl'>[]> {
  const result = await ai.models.generateContent({
    model: storyGenerationModel,
    contents: `Create a short, simple children's story based on this idea: "${prompt}". The story should have between 4 and 6 pages.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: storySchema,
    },
  });

  const jsonString = result.text;
  const parsed = JSON.parse(jsonString);
  return parsed.pages;
}

export async function generateStoryIdea(): Promise<string> {
    const result = await ai.models.generateContent({
        model: storyGenerationModel,
        contents: "Generate a single, one-sentence, whimsical and fun story idea for a children's book. The idea should be creative and spark imagination. Do not include any quotation marks.",
    });
    return result.text.trim();
}


export async function generateImage(prompt: string): Promise<string> {
  const response = await ai.models.generateImages({
    model: imageGenerationModel,
    prompt: `${prompt}, delightful children's book illustration, vibrant colors, friendly characters`,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/png',
      aspectRatio: '1:1',
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  }
  throw new Error("Image generation failed");
}


export async function generateSpeech(text: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: ttsModel,
      contents: [{ parts: [{ text: `Read this in a gentle, friendly storyteller voice for a child: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
        return base64Audio;
    }
    throw new Error("Text-to-Speech generation failed");
}

let chatInstance: Chat | null = null;

export function getChatInstance(): Chat {
    if(!chatInstance) {
        chatInstance = ai.chats.create({
            model: chatModel,
            config: {
                systemInstruction: 'You are a friendly and curious robot friend for a young child. Keep your answers very short, simple, and cheerful. Use simple words. Ask questions back to them.',
            },
        });
    }
    return chatInstance;
}

export async function sendChatMessage(message: string): Promise<string> {
    const chat = getChatInstance();
    const response = await chat.sendMessage({ message });
    return response.text;
}