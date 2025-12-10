import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../db';
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

export const processVoiceMemo = async (audioBlob: Blob, contextTasks: any[] = []) => {
  const isRefinement = contextTasks.length > 0;
  
  // Request notification permission if not already granted
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const now = new Date();
    const base64Audio = await blobToBase64(audioBlob);

    const systemPrompt = `
      Current Date: ${now.toString()}.
      Mode: ${isRefinement ? "REFINEMENT / EDITING" : "NEW CAPTURE"}.
      
      Existing Context (JSON): ${JSON.stringify(contextTasks)}
      
      Instructions:
      1. Analyze the user's input (Audio).
      2. If New Capture: Extract tasks.
      3. If Refinement: Modify the "Existing Context" list based on user instructions.
      4. Return the Final List of tasks.
      
      Output JSON Schema:
      {
          "summary": "Brief, friendly text summary (e.g. 'Found 3 tasks' or 'Updated time').",
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
                {
                    inlineData: {
                        mimeType: audioBlob.type || 'audio/webm',
                        data: base64Audio
                    }
                }
            ]
        }
    });

    const result = JSON.parse(response.text || '{}');

    if (result.tasks) {
      const stagingItem: StagingItem = {
        createdAt: Date.now(),
        summary: result.summary || "Processed voice memo",
        tasks: result.tasks.map((t: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          content: t.content,
          dueAt: t.dueAt ? new Date(t.dueAt).getTime() : undefined,
          responsible: t.responsible,
          notes: t.notes
        }))
      };

      // If refinement, we might want to update an existing staging item, but for now we append new results.
      // A more complex app would manage session IDs. Here, we just add to the queue.
      await db.staging.add(stagingItem);

      // Trigger Notification
      if (Notification.permission === 'granted' && document.hidden) {
        new Notification("MindFlow", {
            body: `${result.summary}`,
            icon: '/icon-192.png' // Assumes manifest icon path
        });
      }
    }

  } catch (error) {
    console.error("AI Processing Error", error);
    // Optionally save an error state to DB so UI can show it
  }
};
