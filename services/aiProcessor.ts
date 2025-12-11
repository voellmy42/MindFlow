import { GoogleGenAI, Type } from "@google/genai";
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { StagingItem } from '../types';

// Helper: Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Unified Processing Helper
const processWithGemini = async (
  input: { type: 'audio', data: Blob } | { type: 'text', data: string },
  contextTasks: any[] = []
) => {
  const isRefinement = contextTasks.length > 0;

  // Request notification permission if not already granted
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const now = new Date();

    let userPromptPart;
    if (input.type === 'audio') {
      const base64Audio = await blobToBase64(input.data);
      userPromptPart = {
        inlineData: {
          mimeType: input.data.type || 'audio/webm',
          data: base64Audio
        }
      };
    } else {
      userPromptPart = { text: `User Refinement Instruction: "${input.data}"` };
    }

    const systemPrompt = `
      Current Date: ${now.toString()}.
      Mode: ${isRefinement ? "REFINEMENT / EDITING" : "NEW CAPTURE"}.
      
      Existing Context (JSON): ${JSON.stringify(contextTasks)}
      
      Instructions:
      1. Analyze the user's input (${input.type}).
      2. If New Capture: Extract tasks.
      3. If Refinement: Modify the "Existing Context" list based on user instructions. You can add, remove, or update properties of tasks.
      4. Return the Final complete List of tasks.
      
      Output JSON Schema:
      {
          "summary": "Brief, friendly text summary (e.g. 'Found 3 tasks' or 'Updated to due tomorrow').",
          "tasks": [
              { "content": "Actionable Title", "dueAt": "ISO Date String or null", "responsible": "Name or null", "notes": "Details" }
          ]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  dueAt: { type: Type.STRING },
                  responsible: { type: Type.STRING },
                  notes: { type: Type.STRING }
                },
                required: ["content"]
              }
            }
          }
        }
      },
      contents: {
        parts: [
          { text: systemPrompt },
          userPromptPart
        ]
      }
    });

    const result = JSON.parse(response.text || '{}');

    if (result.tasks) {
      const stagingItem: StagingItem = {
        createdAt: Date.now(),
        summary: result.summary || "Processed",
        tasks: result.tasks.map((t: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          content: t.content,
          dueAt: t.dueAt ? new Date(t.dueAt).getTime() : undefined,
          responsible: t.responsible,
          notes: t.notes
        }))
      };

      if (auth.currentUser) {
        await addDoc(collection(db, 'staging'), {
          ...stagingItem,
          ownerId: auth.currentUser.uid
        });
      }

      // Trigger Notification
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
        new Notification("MindFlow", {
          body: `${result.summary}`,
          icon: '/icon-192.png'
        });
      }
    }

  } catch (error) {
    console.error("AI Processing Error", error);
  }
};

export const processVoiceMemo = async (audioBlob: Blob, contextTasks: any[] = []) => {
  return processWithGemini({ type: 'audio', data: audioBlob }, contextTasks);
};

export const processTextRefinement = async (text: string, contextTasks: any[]) => {
  return processWithGemini({ type: 'text', data: text }, contextTasks);
};
