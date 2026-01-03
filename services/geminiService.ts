
import { GoogleGenAI, Modality } from "@google/genai";

/**
 * ------------------------------------------------------------
 *  STEP 1: GET YOUR KEY from https://aistudio.google.com/
 *  STEP 2: REPLACE 'process.env.API_KEY' BELOW WITH YOUR KEY.
 *  
 *  IT MUST LOOK LIKE THIS:
 *  const ai = new GoogleGenAI({ apiKey: "AIzaSy..." });
 * ------------------------------------------------------------
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const speakArabic = async (text: string): Promise<void> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Recite slowly with perfect Tajweed rules: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) {
    console.error("Audio error:", error);
  }
};

export const getPronunciationGuide = async (arabicText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain the Tajweed rule in this snippet for an Iqra 6 student: "${arabicText}". Keep it to 2 short sentences. No bolding.`,
    });
    return response.text || "Listen carefully to the nasal merging sound.";
  } catch (error) {
    return "Check for merging and elongation.";
  }
};

export const getChatResponseStream = async (messages: {role: string, content: string}[]) => {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  return ai.models.generateContentStream({
    model: "gemini-3-pro-preview",
    contents: contents,
    config: {
      systemInstruction: "You are a warm, professional Quranic teacher (Ustadz). You help students with Iqra' 6. RULE 1: Use ONLY plain text. NO Markdown. RULE 2: Be brief and encouraging. Use simple English with occasional Arabic greetings like Assalamu'alaikum.",
    },
  });
};
