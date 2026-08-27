import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

const getSupportedMimeType = (mimeType: string): string | null => {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  const supported = [
    'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
    'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp'
  ];
  if (supported.includes(normalized)) return normalized;
  return null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formatErrorMessage(error: any): string {
  let raw = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed?.error?.message) {
      raw = parsed.error.message;
    }
  } catch {}

  if (typeof raw === 'string') {
    if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
      return "Сервер ШІ тимчасово перевантажений. Будь ласка, зачекайте кілька секунд і надішліть запит знову.";
    }
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota') || raw.includes('Too Many Requests')) {
      const match = raw.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i) || raw.match(/retryDelay["']?\s*:\s*["']?(\d+)/i);
      if (match && match[1]) {
        const secs = Math.ceil(parseFloat(match[1]));
        return `Перевищено ліміт запитів безкоштовного тарифу (Free Tier Quota). Будь ласка, зачекайте ${secs} сек. або оберіть іншу модель у Налаштуваннях.`;
      }
      return "Перевищено ліміт запитів або токенів безкоштовного тарифу. Будь ласка, зачекайте кілька секунд і спробуйте знову.";
    }
  }
  return String(raw || "Помилка з'єднання з ШІ.");
}

async function generateStreamWithFallback(
  ai: GoogleGenAI, 
  primaryModel: string, 
  configPayload: any, 
  enableSearch: boolean = true
) {
  // Ordered fallback models prioritising robust, modern models
  const candidateModels = [
    primaryModel,
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite'
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  let lastError: any = null;

  for (const model of candidateModels) {
    const configForModel: any = { ...configPayload.config };

    // Build tools for the model
    const tools: any[] = [];
    if (enableSearch && (model === 'gemini-3.5-flash' || model === 'gemini-3.7-flash' || model === 'gemini-flash-latest' || model === 'gemini-3.1-pro-preview')) {
      tools.push({ googleSearch: {} });
    }
    tools.push({
      functionDeclarations: [{
        name: 'generate_image',
        description: 'Generates an image based on a detailed text prompt. Use this when the user asks to draw, create, or generate an image or picture.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING, description: 'Detailed prompt for the image generation in English.' }
          },
          required: ['prompt']
        }
      }]
    });
    configForModel.tools = tools;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const stream = await ai.models.generateContentStream({
          ...configPayload,
          model,
          config: configForModel
        });
        return { stream, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || '');
        console.warn(`Model ${model} attempt ${attempt} failed:`, msg);

        // Check if error is 429 quota exhaustion or long delay
        const isQuotaHardLimit = msg.includes('PerDay') || msg.includes('RESOURCE_EXHAUSTED') || (msg.includes('retry in') && parseFloat((msg.match(/retry in ([0-9.]+)s/)?.[1] || '0')) > 8);
        if (isQuotaHardLimit) {
          // Immediately switch to next candidate model
          break;
        }

        const isTransient = msg.includes('503') || msg.includes('429') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('Too Many Requests');
        if (isTransient && attempt < 2) {
          await sleep(800 * attempt + Math.floor(Math.random() * 300));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

// Gemini Stream API Endpoint
app.post('/api/gemini/stream', async (req, res) => {
  try {
    const {
      messages = [],
      newPrompt = '',
      attachments = [],
      contextFiles = [],
      projectStructure = '',
      language = 'EN',
      settings = {},
      editHistory = ''
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ error: 'GEMINI_API_KEY is not configured in the environment.' })}\n\n`);
      res.end();
      return;
    }

    const ai = getAi();

    let systemInstruction = `Your name is Code-Lert (CodeLert AI 3.0). You are an expert programming assistant capable of analyzing up to 2 million lines of code.
Спілкуйся тією ж мовою, якою до тебе звертається користувач (автоматично визначай мову з його повідомлень).

ПРАВИЛА ПОВЕДІНКИ:
1. Надавай чіткі та зрозумілі відповіді. Пояснюй свій код, але уникай надмірної "води". Твої відповіді мають бути інформативними, але структурованими.
2. НІКОЛИ НЕ ЗМІНЮЙ КОД БЕЗ ДОЗВОЛУ. Ти лише пропонуєш код, користувач сам вирішує, чи застосовувати його.
3. НІКОЛИ не вибачайся. Якщо ти зробив помилку, просто напиши "Моя помилка - зараз виправлю..." і відразу надай виправлений варіант.

УМОВНІ ПОЗНАЧЕННЯ ВІД КОРИСТУВАЧА (МАКРОСИ):
Якщо користувач використовує ці символи у своєму повідомленні, виконуй відповідні дії:
"@@@" - замінюй не весь код, а тільки ту частину коду, яку потрібно змінити (ОБОВ'ЯЗКОВО використовуй блок [REPLACE: шлях]).
"%%%" - перевір виконані зміни, чи застосувався код, чи все вірно в файлі, який ми змінили, та чи немає дублюючого коду та помилок.
"(0_0)" - перествори свій запит таким чином щоб це відповідало завданню, а помилки при застосуванню коду були виправлені.

ФОРМАТУВАННЯ КОДУ ТА ЗМІН (КРИТИЧНО ВАЖЛИВО):
Щоб створити новий файл або повністю перезаписати існуючий, використовуй ТІЛЬКИ такий формат (спеціальний тег [FILE: шлях], а одразу під ним блок коду). НАВІТЬ ЯКЩО ФАЙЛ ПУСТИЙ, блок коду є ОБОВ'ЯЗКОВИМ:

[FILE: шлях/до/файлу.ext]
\`\`\`мова
повний код файлу... (або порожньо, якщо файл має бути пустим)
\`\`\`
БЕЗ ЖОДНИХ СЛІВ між тегом [FILE: ...] та блоком коду \`\`\`!

Щоб змінити лише частину існуючого файлу (точкові зміни), використовуйте такий формат:
[REPLACE: шлях/до/файлу.ext]
\`\`\`text
<<<<
точний старий код, який потрібно замінити (має збігатися символ в символ)
====
новий код, яким потрібно замінити
>>>>
\`\`\`

Щоб зберегти прикріплений користувачем файл (наприклад, зображення) у структуру проекту, використовуй команду:
[SAVE_ATTACHMENT: назва_прикріпленого_файлу.ext -> шлях/куди/зберегти/назва.ext]
ТИ МОЖЕШ ЗБЕРІГАТИ ЗОБРАЖЕННЯ ТА ІНШІ ФАЙЛИ, використовуючи цю команду! Не кажи, що не можеш.

КРИТИЧНО ВАЖЛИВО: НІКОЛИ не використовуйте коментарі типу "// решта коду залишається без змін" або "// ...". ВИ ПОВИННІ ПИСАТИ ПОВНИЙ, АБСОЛЮТНО ВЕСЬ КОД ФАЙЛУ ВІД ПОЧАТКУ ДО КІНЦЯ у блоці коду (або використовувати REPLACE блок).
КРИТИЧНО ВАЖЛИВО: При оновленні коду переконайся, що ти не видаляєш існуючі функціональні елементи, імпорти чи стилі, якщо про це прямо не просив користувач. Завжди зберігай цілісність програми.
НІКОЛИ не використовуйте JSON блоки, \`file-op\` або інші формати для коду. Пишіть ПОВНИЙ код у звичайних markdown блоках \`\`\` після тегу [FILE: ...] або [REPLACE: ...].
НІКОЛИ не згадуйте про 'file-op', JSON-блоки або інші внутрішні механізми. Якщо ви надаєте код для збереження, просто скажіть користувачу: "Натисніть кнопку 'Застосувати всі зміни в коді' під цим повідомленням, щоб зберегти файли."

ІНШІ КОМАНДИ (використовуй тільки якщо користувач прямо попросив):
[RENAME: старий_шлях.ext -> новий_шлях.ext]
[DELETE: шлях/до/файлу.ext]
[CREATE_FOLDER: шлях/до/папки]

ОБОВ'ЯЗКОВО використовуйте емодзі у тексті!
ОБОВ'ЯЗКОВО використовуйте форматування: **жирний**, *курсив*, <u>підкреслений</u> (через HTML тег <u>).
НІКОЛИ не згадуйте про папку .temp або session.json. Ігноруйте їх існування.

УВАГА ЩОДО КОНТЕКСТУ:
Ви завжди бачите структуру проекту. Але ви бачите ВМІСТ файлів ТІЛЬКИ якщо користувач увімкнув контекст і виділив їх.

УВАГА ЩОДО ЗОБРАЖЕНЬ:
Якщо користувач просить згенерувати зображення, ОБОВ'ЯЗКОВО використовуйте інструмент \`generate_image\`.`;

    if (settings?.aiModeStepByStep) {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: "По-кроково". Виконуй лише ОДНУ дію (зміну одного файлу або одну логічну операцію) за одне повідомлення. Не пиши багато коду одразу.`;
    }
    if (settings?.aiModeLineReplace !== false) {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: "Конкретна заміна рядків". МАКСИМАЛЬНО шукай шляхи як замінити, редагувати або видалити ТІЛЬКИ потрібні рядки в коді за допомогою блоку [REPLACE: шлях], замість того щоб переписувати весь код файлу. Обов'язково проаналізуй поточний стан файлу перед внесенням змін, щоб блок REPLACE точно збігався з існуючим кодом.`;
    } else {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: Повне перезаписування. Для редагування файлів завжди виводь повний код файлу через блок [FILE: шлях].`;
    }

    if (editHistory && editHistory !== '[]') {
      systemInstruction += `\n\nІСТОРІЯ ОСТАННІХ ЗМІН (для уникнення дублювання):\nОсь останні правки, які ти вже вніс. Не повторюй їх:\n${editHistory}\n`;
    }

    if (projectStructure) {
      systemInstruction += `\n\nОсь поточна структура файлів та папок проекту:\n${projectStructure}\n`;
    }

    const currentParts: any[] = [];

    if (contextFiles.length > 0) {
      systemInstruction += '\n\nОсь поточний контекст проекту (вміст файлів):\n';
      contextFiles.forEach((f: any) => {
        if (f.isImage && f.content) {
          const parts = f.content.split(',');
          const base64 = parts[1];
          const rawMime = parts[0]?.split(';')[0]?.split(':')[1] || 'image/png';
          const mimeType = getSupportedMimeType(rawMime);

          if (mimeType && base64) {
            currentParts.push({
              inlineData: { data: base64, mimeType }
            });
            systemInstruction += `\n--- Файл: ${f.name} (Медіафайл додано до запиту) ---\n`;
          } else {
            systemInstruction += `\n--- Файл: ${f.name} (Формат ${rawMime} не підтримується ШІ) ---\n`;
          }
        } else {
          let fileText = String(f.content || '');
          if (fileText.length > 50000) {
            fileText = fileText.slice(0, 50000) + '\n... [Вміст обрізано для оптимізації розміру токенів]';
          }
          systemInstruction += `\n--- Файл: ${f.name} ---\n${fileText}\n`;
        }
      });
    }

    const recentMessages = messages.length > 12 ? messages.slice(-12) : messages;

    const contents: any[] = recentMessages.map((msg: any) => {
      const parts: any[] = [];
      let text = msg.text || ' ';

      if (msg.role === 'model' && msg.applied) {
        text += '\n\n[SYSTEM: Користувач успішно застосував ці зміни до проекту.]';
      }

      if (text.trim() !== '') {
        parts.push({ text });
      } else {
        parts.push({ text: ' ' });
      }

      if (msg.attachments) {
        msg.attachments.forEach((att: any) => {
          if (att.data) {
            const base64 = att.data.split(',')[1];
            const mimeType = getSupportedMimeType(att.mimeType);
            if (mimeType && base64) {
              parts.push({ inlineData: { data: base64, mimeType } });
            }
          }
        });
      }
      return { role: msg.role === 'model' ? 'model' : 'user', parts };
    });

    let attachmentsText = '';
    if (attachments.length > 0) {
      attachments.forEach((att: any) => {
        if (att.text) {
          attachmentsText += `\n--- Прикріплений файл: ${att.name} ---\n${att.text}\n`;
        } else if (att.data) {
          const base64 = att.data.split(',')[1];
          const mimeType = getSupportedMimeType(att.mimeType);
          if (mimeType && base64) {
            currentParts.push({
              inlineData: { data: base64, mimeType }
            });
          } else {
            attachmentsText += `\n--- Прикріплений файл: ${att.name} (Формат ${att.mimeType} не підтримується ШІ) ---\n`;
          }
        }
      });
    }

    const finalPrompt = attachmentsText ? `${newPrompt}\n\n${attachmentsText}` : newPrompt;
    currentParts.push({ text: finalPrompt && finalPrompt.trim() !== '' ? finalPrompt : ' ' });

    contents.push({
      role: 'user',
      parts: currentParts
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Determine target primary model
    let chosenModel = 'gemini-3.5-flash';
    if (settings?.aiModel === 'gemini-3.1-pro-preview') {
      chosenModel = 'gemini-3.1-pro-preview';
    } else if (settings?.aiModel === 'gemini-3.1-flash-lite') {
      chosenModel = 'gemini-3.1-flash-lite';
    } else if (settings?.aiModel === 'gemini-3.5-flash') {
      chosenModel = 'gemini-3.5-flash';
    } else {
      // Auto selection: if prompt indicates complex coding/math/architecture
      const isComplexTask = newPrompt.length > 2500 || /refactor|architect|algorithm|performance|optimize|security audit/i.test(newPrompt);
      chosenModel = isComplexTask ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
    }

    const enableSearch = settings?.enableSearchGrounding !== false;

    const { stream: responseStream, modelUsed } = await generateStreamWithFallback(
      ai,
      chosenModel,
      {
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          maxOutputTokens: 8192,
        }
      },
      enableSearch
    );

    res.write(`data: ${JSON.stringify({ modelUsed })}\n\n`);

    for await (const chunk of responseStream) {
      // Stream Google Search grounding citations if present
      if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const sources = chunk.candidates[0].groundingMetadata.groundingChunks
          .map((c: any) => c.web ? { title: c.web.title || c.web.uri, uri: c.web.uri } : null)
          .filter(Boolean);
        if (sources.length > 0) {
          res.write(`data: ${JSON.stringify({ groundingSources: sources })}\n\n`);
        }
      }

      if (chunk.functionCalls && chunk.functionCalls.length > 0) {
        const call = chunk.functionCalls[0];
        if (call.name === 'generate_image') {
          const prompt = call.args?.prompt as string;
          res.write(`data: ${JSON.stringify({ text: `\n\n⏳ *Генерую зображення за запитом: "${prompt}"*...\n\n` })}\n\n`);
          try {
            let dataUrl: string | null = null;
            
            // Try nano banana models first (gemini-3.1-flash-lite-image, gemini-3.1-flash-image)
            const imgModels = ['gemini-3.1-flash-lite-image', 'gemini-3.1-flash-image'];
            for (const m of imgModels) {
              try {
                const response = await ai.models.generateContent({
                  model: m,
                  contents: {
                    parts: [{ text: prompt }]
                  }
                });
                if (response.candidates?.[0]?.content?.parts) {
                  for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                      const mime = part.inlineData.mimeType || 'image/png';
                      dataUrl = `data:${mime};base64,${part.inlineData.data}`;
                      break;
                    }
                  }
                }
                if (dataUrl) break;
              } catch (modelErr: any) {
                console.warn(`Model ${m} failed for image gen:`, modelErr?.message || modelErr);
              }
            }

            // Fallback to generateImages
            if (!dataUrl) {
              try {
                const imgRes = await ai.models.generateImages({
                  model: 'imagen-3.0-generate-002',
                  prompt: prompt,
                  config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' }
                });
                const base64 = imgRes.generatedImages?.[0]?.image?.imageBytes;
                if (base64) {
                  dataUrl = `data:image/jpeg;base64,${base64}`;
                }
              } catch (imagenErr: any) {
                console.warn('generateImages fallback failed:', imagenErr?.message || imagenErr);
              }
            }

            if (dataUrl) {
              res.write(`data: ${JSON.stringify({ text: `![${prompt}](${dataUrl})\n` })}\n\n`);
            } else {
              throw new Error('Не вдалося згенерувати зображення жодною моделлю.');
            }
          } catch (e: any) {
            res.write(`data: ${JSON.stringify({ text: `\n❌ *Помилка генерації зображення: ${e.message}*\n` })}\n\n`);
          }
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }
      }
      if (chunk.text) {
        if (!chunk.text.startsWith('QB`[{') && !chunk.text.includes('"thoughtSignature"')) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Server Gemini Stream Error:', error);
    const errMsg = formatErrorMessage(error);
    if (!res.headersSent) {
      res.status(500).json({ error: errMsg });
    } else {
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.end();
    }
  }
});

// Upscale Image API Endpoint
app.post('/api/gemini/upscale', async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'base64Data is required' });
    }
    const ai = getAi();
    const models = ['gemini-3.7-flash', 'gemini-flash-latest'];
    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            role: 'user',
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType || 'image/png' } },
              { text: 'Upscale this image, enhance quality, make it high resolution HDR, improve details.' }
            ]
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return res.json({ imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No image returned by model');
  } catch (e: any) {
    console.error('Upscale error:', e);
    return res.status(500).json({ error: e.message || 'Failed to upscale image' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Code-Lert server running on http://localhost:${PORT}`);
  });
}

startServer();
