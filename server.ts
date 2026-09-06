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
      return "Сервери Google Gemini тимчасово перевантажені (High Demand). Зачекайте кілька секунд і надішліть запит знову.";
    }
    if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('quota') || raw.includes('Too Many Requests')) {
      const match = raw.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i) || raw.match(/retryDelay["']?\s*:\s*["']?(\d+)/i);
      if (match && match[1]) {
        const secs = Math.ceil(parseFloat(match[1]));
        return `Перевищено тимчасовий ліміт запитів безкоштовного тарифу (Free Tier Quota). Будь ласка, зачекайте ${secs} сек. (таймер активний нижче) або перемкніть модель на Gemini 3.1 Flash-Lite у Налаштуваннях.`;
      }
      return "Перевищено тимчасовий ліміт запитів безкоштовного тарифу (Free Tier Quota). Будь ласка, зачекайте кілька секунд і натисніть 'Спробувати знову' або оберіть Gemini 3.1 Flash-Lite у Налаштуваннях.";
    }
  }
  return String(raw || "Помилка з'єднання з ШІ.");
}

async function generateStreamWithFallback(
  ai: GoogleGenAI, 
  primaryModel: string, 
  configPayload: any, 
  enableSearch: boolean = true,
  onStatusUpdate?: (status: { step: string; detail: string }) => void
) {
  // Define candidate models in prioritized order based on user selection
  let candidateModels: string[];
  if (primaryModel === 'gemini-3.1-pro-preview') {
    candidateModels = ['gemini-3.1-pro-preview', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  } else if (primaryModel === 'gemini-3.1-flash-lite') {
    candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'];
  } else if (primaryModel === 'gemini-flash-latest') {
    candidateModels = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  } else if (primaryModel === 'gemini-3.6-flash') {
    candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  } else {
    // Default 'auto' or 'gemini-3.8-flash'
    candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
  }

  // Remove duplicates while preserving order
  candidateModels = candidateModels.filter((m, idx, arr) => arr.indexOf(m) === idx);

  let searchAllowed = enableSearch;
  let lastError: any = null;

  const imageDeclaration = {
    name: 'generate_image',
    description: 'Generates an image based on a detailed text prompt. Use this when the user asks to draw, create, or generate an image or picture.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'Detailed prompt for the image generation in English.' }
      },
      required: ['prompt']
    }
  };

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const model = candidateModels[mIdx];

    // For each model, first try with search (if enabled & not quota-exhausted), then without search
    const searchOptions = searchAllowed ? [true, false] : [false];

    for (const withSearch of searchOptions) {
      const configForModel: any = { ...configPayload.config };
      const tools: any[] = [];
      if (withSearch) {
        tools.push({ googleSearch: {} });
        tools.push({ functionDeclarations: [imageDeclaration] });
        configForModel.tools = tools;
        configForModel.toolConfig = { includeServerSideToolInvocations: true };
      } else {
        tools.push({ functionDeclarations: [imageDeclaration] });
        configForModel.tools = tools;
        delete configForModel.toolConfig;
      }

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
          console.warn(`Model ${model} (search: ${withSearch}, attempt: ${attempt}) notice:`, msg.substring(0, 180));

          // If Google Search was enabled and failed with 429 quota, immediately disable search and try without search
          if (withSearch && (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota'))) {
            searchAllowed = false;
            onStatusUpdate?.({ 
              step: 'searching', 
              detail: 'Квоту Google Search вичерпано. Перемикання на генерацію без веб-пошуку...' 
            });
            break; // Break attempt loop to move to withSearch = false
          }

          // If Pro model on free tier (limit: 0 or quota), immediately jump to flash model
          if (model === 'gemini-3.1-pro-preview' && (msg.includes('limit: 0') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429'))) {
            onStatusUpdate?.({ 
              step: 'thinking', 
              detail: 'gemini-3.1-pro-preview потребує платного тарифу. Перехід на Gemini Flash...' 
            });
            break;
          }

          // Check retry delay
          const match = msg.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i) || msg.match(/retryDelay["']?\s*:\s*["']?(\d+)/i);
          const retrySecs = match && match[1] ? parseFloat(match[1]) : 0;

          // If brief delay <= 2s and first attempt, back off and retry
          if (retrySecs > 0 && retrySecs <= 2 && attempt < 2) {
            await sleep(Math.ceil(retrySecs * 1000) + 200);
            continue;
          }

          // If 429 quota exhaustion on this model, inform user and advance to next candidate model
          if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('PerDay')) {
            if (mIdx < candidateModels.length - 1) {
              const nextModel = candidateModels[mIdx + 1];
              onStatusUpdate?.({ 
                step: 'thinking', 
                detail: `Модель ${model} тимчасово досягла ліміту. Перемикання на ${nextModel}...` 
              });
            }
            break;
          }

          const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE') || msg.includes('Too Many Requests');
          if (isTransient && attempt < 2) {
            await sleep(600 * attempt + Math.floor(Math.random() * 200));
            continue;
          }
          break;
        }
      }

      // If we broke out due to Pro model quota, stop trying other search options for this model
      if (model === 'gemini-3.1-pro-preview' && lastError && String(lastError.message).includes('429')) {
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

БІБЛІЯ ЛОГІКИ ВІДПОВІДЕЙ ШІ (ОСНОВА "ГЛИБОКОГО АНАЛІЗУ"):
Кожну відповідь ти зобов'язаний вибудовувати за цими 7 непорушними пунктами:
"1" Аналіз запитання: виділення суті завдання, вимог та цілей користувача;
"2" Аналіз наявних механік відповіді: підбір найкращих інструментів, алгоритмів та архітектурних рішень;
"3" Пошук в Інтернеті через Google Search якщо питання складне і потребує більшої кількості наявних варіантів вирішення або за проханням користувача при увімкненій функції;
"4" Аналіз структури (адаптивної чи повної), обдумування структурованості, чіткості, лаконічності й потреби наданого результату для користувача чи їх варіантів задля задоволення потреби та вирішення питання;
"5" Додатковий пошук подібних файлів коду для вирішення все тієї ж проблеми, перевірка імпортів та типів;
"6" Генерація самої відповіді (а також елементів коду якщо такі є);
"7" Функція перевірки наданих результатів (якщо увімкнена).

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

ПРАВИЛА КОНКРЕТНОЇ ЗАМІНИ РЯДКІВ ТА ПЕРЕЗАПИСУ (1/2 ТЕКСТУ І ЛІМІТИ):
1. Правило 1/2 тексту (50% відносно обсягу коду в файлі):
   - Якщо в коді замінюється менше або до 50% рядків (наприклад, якщо код на 500 рядків, а переписати потрібно 200 рядків) — ОБОВ'ЯЗКОВО виконуй точкову заміну потрібної частини через блок [REPLACE: шлях].
   - Якщо ж у файлі замінюється більше 50% тексту — переписуй весь код файлу повністю через блок [FILE: шлях].
2. Ліміт блоків REPLACE на один файл:
   - В одному повідомленні для одного файлу дозволено не більше 3 блоків [REPLACE: шлях].
   - Якщо таких поодиноких змін у різних частинах одного файлу більше 3 — переписуй код файлу повністю через блок [FILE: шлях].
3. Одночасні зміни у кількох файлах (3 і більше файлів):
   - Якщо ти одночасно вносиш зміни у 3 або більше файлів в одному повідомленні, ти ЗОБОВ'ЯЗАНИЙ спочатку (на початку відповіді, перед кодом) попередити користувача:
     "⚠️ **Увага:** заплановано зміни у [X] файлах: [список файлів]. Ви можете застосувати всі зміни одразу кнопкою нижче, або повідомте, якщо вам зручніше коригувати по 1-2 файлах покроково."

Щоб зберегти прикріплений користувачем файл (наприклад, зображення) у структуру проекту, використовуй команду:
[SAVE_ATTACHMENT: назва_прикріпленого_файлу.ext -> шлях/куди/зберегти/назва.ext]

КРИТИЧНО ВАЖЛИВО: НІКОЛИ не використовуйте коментарі типу "// решта коду залишається без змін" або "// ...". ВИ ПОВИННІ ПИСАТИ ПОВНИЙ КОД ФАЙЛУ ВІД ПОЧАТКУ ДО КІНЦЯ у блоці [FILE: ...] (або використовувати [REPLACE: ...] згідно з правилами).
КРИТИЧНО ВАЖЛИВО: При оновленні коду переконайся, що ти не видаляєш існуючі функціональні елементи, імпорти чи стилі, якщо про це прямо не просив користувач. Завжди зберігай цілісність програми.
НІКОЛИ не використовуйте JSON блоки, \`file-op\` або інші сторонні формати для коду.
Якщо ви надаєте код для збереження, нагадайте користувачу: "Натисніть кнопку 'Застосувати всі зміни в коді' під цим повідомленням, щоб зберегти файли."

ІНШІ КОМАНДИ:
[RENAME: старий_шлях.ext -> новий_шлях.ext]
[DELETE: шлях/до/файлу.ext]
[CREATE_FOLDER: шлях/до/папки]

ОБОВ'ЯЗКОВО використовуйте емодзі у тексті!
ОБОВ'ЯЗКОВО використовуйте форматування: **жирний**, *курсив*, <u>підкреслений</u> (через HTML тег <u>).
НІКОЛИ не згадуйте про папку .temp або session.json.

УВАГА ЩОДО АДАПТИВНОГО АНАЛІЗУ ТА КОНТЕКСТУ ФАЙЛІВ:
Ти маєш повний доступ до структури проекту та наданого вмісту файлів у блоці "Контекст проекту".
Спершу аналізуй назви та шляхи файлів у структурі проекту. Обирай саме ті файли, які потрібні для виконання запиту, уважно аналізуй їхній повний код, методи, змінні та імпорти, і на основі цього генеруй точні зміни. Якщо передано вміст файлів — ти бачиш його повністю, тому спирайся на конкретні рядки з них.

УВАГА ЩОДО ЗОБРАЖЕНЬ:
Якщо користувач просить намалювати чи згенерувати картинку, ОБОВ'ЯЗКОВО використовуйте інструмент \`generate_image\`.`;

    if (settings?.aiModeStepByStep) {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: "По-кроково". Виконуй лише ОДНУ дію (зміну одного файлу або одну логічну операцію) за одне повідомлення. Не пиши багато коду одразу.`;
    }
    if (settings?.aiModeLineReplace !== false) {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: "Конкретна заміна рядків". МАКСИМАЛЬНО шукай шляхи як замінити, редагувати або видалити ТІЛЬКИ потрібні рядки в коді за допомогою блоку [REPLACE: шлях], замість того щоб переписувати весь код файлу. Обов'язково проаналізуй поточний стан файлу перед внесенням змін, щоб блок REPLACE точно збігався з існуючим кодом.`;
    } else {
      systemInstruction += `\n\nРЕЖИМ РОБОТИ: Повне перезаписування. Для редагування файлів завжди виводь повний код файлу через блок [FILE: шлях].`;
    }

    if (editHistory && editHistory !== '[]') {
      const safeHistory = editHistory.length > 2000 ? editHistory.slice(0, 2000) + '\n... [історію скорочено]' : editHistory;
      systemInstruction += `\n\nІСТОРІЯ ОСТАННІХ ЗМІН (для уникнення дублювання):\nОсь останні правки, які ти вже вніс. Не повторюй їх:\n${safeHistory}\n`;
    }

    if (projectStructure) {
      const safeStructure = projectStructure.length > 2500 ? projectStructure.slice(0, 2500) + '\n... [структуру скорочено]' : projectStructure;
      systemInstruction += `\n\nОсь поточна структура файлів та папок проекту:\n${safeStructure}\n`;
    }

    const currentParts: any[] = [];

    if (contextFiles.length > 0) {
      systemInstruction += '\n\nОсь поточний контекст проекту (вміст файлів):\n';
      let totalContextChars = 0;
      const MAX_TOTAL_CONTEXT = 220000;
      const MAX_FILE_CHARS = 35000;

      for (const f of contextFiles) {
        if (totalContextChars >= MAX_TOTAL_CONTEXT) {
          systemInstruction += `\n[Примітка: інші файли не включено для економії токенів ШІ]\n`;
          break;
        }

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
          if (fileText.length > MAX_FILE_CHARS) {
            // Keep head and tail of file for context
            fileText = fileText.slice(0, 16000) + '\n\n... [частину коду пропущено для економії токенів ШІ] ...\n\n' + fileText.slice(-16000);
          }
          const remainingBudget = MAX_TOTAL_CONTEXT - totalContextChars;
          if (fileText.length > remainingBudget) {
            fileText = fileText.slice(0, remainingBudget) + '\n... [вміст скорочено за лімітом контексту]';
          }
          totalContextChars += fileText.length;
          systemInstruction += `\n--- Файл: ${f.name} ---\n${fileText}\n`;
        }
      }
    }

    // Keep conversation history compact to prevent exceeding 250k tokens/min limit
    const recentMessages = messages.length > 6 ? messages.slice(-6) : messages;

    const contents: any[] = recentMessages.map((msg: any, idx: number) => {
      const parts: any[] = [];
      let text = msg.text || ' ';

      // Prune massive code blocks from older assistant turns
      const isOlderAssistantTurn = msg.role === 'model' && idx < recentMessages.length - 2;
      if (isOlderAssistantTurn && text.length > 1500) {
        text = text.replace(/```[\s\S]*?```/g, (codeBlock: string) => {
          if (codeBlock.length > 400) {
            const lines = codeBlock.split('\n');
            const topLines = lines.slice(0, 4).join('\n');
            const bottomLines = lines.slice(-2).join('\n');
            return `${topLines}\n// ... [попередній код скорочено] ...\n${bottomLines}`;
          }
          return codeBlock;
        });
      }

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
          const safeText = att.text.length > 8000 ? att.text.slice(0, 8000) + '\n... [текст скорочено]' : att.text;
          attachmentsText += `\n--- Прикріплений файл: ${att.name} ---\n${safeText}\n`;
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

    // Determine target primary model:
    let chosenModel = 'gemini-3.8-flash';
    if (settings?.aiModel === 'gemini-3.1-pro-preview') {
      chosenModel = 'gemini-3.1-pro-preview';
    } else if (settings?.aiModel === 'gemini-3.1-flash-lite') {
      chosenModel = 'gemini-3.1-flash-lite';
    } else if (settings?.aiModel === 'gemini-flash-latest') {
      chosenModel = 'gemini-flash-latest';
    } else if (settings?.aiModel === 'gemini-3.6-flash') {
      chosenModel = 'gemini-3.6-flash';
    } else {
      // Auto selection uses gemini-3.8-flash by default (with auto-fallback to flash-latest & lite)
      chosenModel = 'gemini-3.8-flash';
    }

    const enableSearch = settings?.enableSearchGrounding !== false;

    // Send initial analytical status following the 7-step Logic Bible (Deep Analysis)
    res.write(`data: ${JSON.stringify({ 
      status: 'analyzing', 
      detail: '[1/7] Аналіз запитання та наявних механік відповіді...' 
    })}\n\n`);

    await sleep(250);

    res.write(`data: ${JSON.stringify({ 
      status: 'analyzing', 
      detail: '[2/7] Вибір архітектурного рішення та інструментів...' 
    })}\n\n`);

    await sleep(250);

    if (enableSearch) {
      res.write(`data: ${JSON.stringify({ 
        status: 'searching', 
        detail: '[3/7] Пошук в Інтернеті через Google Search...' 
      })}\n\n`);
      await sleep(300);
    }

    res.write(`data: ${JSON.stringify({ 
      status: 'thinking', 
      detail: contextFiles.length > 0 
        ? `[4/7 - 5/7] Аналіз структури та ${contextFiles.length} файлів коду проекту...`
        : '[4/7 - 5/7] Аналіз структури проекту та пошук подібних файлів...' 
    })}\n\n`);

    await sleep(250);

    res.write(`data: ${JSON.stringify({ 
      status: 'thinking', 
      detail: '[6/7] Генерація структурованої відповіді та коду...' 
    })}\n\n`);

    const onStatusUpdate = (status: { step: string; detail: string }) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          status: status.step,
          detail: status.detail
        })}\n\n`);
      }
    };

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
      enableSearch,
      onStatusUpdate
    );

    res.write(`data: ${JSON.stringify({ modelUsed })}\n\n`);

    for await (const chunk of responseStream) {
      // Stream Google Search grounding metadata & actual search queries if present
      const grounding = chunk.candidates?.[0]?.groundingMetadata;
      if (grounding) {
        const searchQueries: string[] = grounding.webSearchQueries || [];
        const sources = (grounding.groundingChunks || [])
          .map((c: any) => c.web ? { title: c.web.title || c.web.uri, uri: c.web.uri } : null)
          .filter(Boolean);

        if (searchQueries.length > 0 || sources.length > 0) {
          res.write(`data: ${JSON.stringify({ 
            status: 'search_completed',
            searchQueries, 
            groundingSources: sources,
            detail: searchQueries.length > 0 ? `Google Search: знайдено матеріали за запитом "${searchQueries[0]}"` : undefined
          })}\n\n`);
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
    const rawMsg = String(error?.message || error || '');
    const match = rawMsg.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i) || rawMsg.match(/retryDelay["']?\s*:\s*["']?(\d+)/i);
    const retrySecs = match && match[1] ? Math.ceil(parseFloat(match[1])) : undefined;
    const errMsg = formatErrorMessage(error);
    console.warn('Gemini Stream quota/connection notice:', errMsg);
    if (!res.headersSent) {
      res.status(500).json({ error: errMsg, retryAfter: retrySecs });
    } else {
      res.write(`data: ${JSON.stringify({ error: errMsg, retryAfter: retrySecs })}\n\n`);
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
