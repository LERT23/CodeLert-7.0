import { ChatMessage, ChatAttachment, ContextFile, ThemeSettings, GroundingSource } from '../types.ts';

export interface StreamChunk {
  text?: string;
  groundingSources?: GroundingSource[];
  modelUsed?: string;
}

export const upscaleImage = async (base64Data: string, mimeType: string): Promise<string> => {
  try {
    const res = await fetch('/api/gemini/upscale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Upscale failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data.imageUrl) {
      return data.imageUrl;
    }
    throw new Error('No image returned');
  } catch (e: any) {
    console.error('Upscale error:', e);
    throw new Error(e.message || 'Failed to upscale image');
  }
};

export const generateChatStreamResponse = async function* (
  messages: ChatMessage[],
  newPrompt: string,
  attachments: ChatAttachment[] = [],
  contextFiles: ContextFile[] = [],
  projectStructure: string = '',
  language: 'UA' | 'EN' = 'EN',
  settings?: ThemeSettings,
  editHistory?: string
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    const response = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        newPrompt,
        attachments,
        contextFiles,
        projectStructure,
        language,
        settings,
        editHistory
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = '';
      try {
        parsedErr = JSON.parse(errText).error;
      } catch {
        parsedErr = errText;
      }
      throw new Error(parsedErr || `Request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.substring(6);

        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text || parsed.groundingSources || parsed.modelUsed) {
            yield {
              text: parsed.text,
              groundingSources: parsed.groundingSources,
              modelUsed: parsed.modelUsed
            };
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('JSON')) {
            throw e;
          }
        }
      }
    }

    if (buffer.trim().startsWith('data: ')) {
      const dataStr = buffer.trim().substring(6);
      if (dataStr !== '[DONE]') {
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.text || parsed.groundingSources || parsed.modelUsed) {
            yield {
              text: parsed.text,
              groundingSources: parsed.groundingSources,
              modelUsed: parsed.modelUsed
            };
          }
        } catch {}
      }
    }
  } catch (error: any) {
    console.error('Gemini Stream Error:', error);
    let errMsg = error?.message || "Помилка з'єднання з ШІ.";
    try {
      if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) {
          errMsg = parsed.error.message;
        } else if (parsed?.error) {
          errMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
        }
      }
    } catch {}
    throw new Error(errMsg);
  }
};
