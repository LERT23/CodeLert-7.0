import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Square, Reply, Trash2, Loader2, FolderPlus, FileCode, HelpCircle, Eye, Sparkles } from 'lucide-react';
import { ChatMessage, ChatAttachment, FileNode, FileChange, ContextFile, User, ThemeSettings } from '../types.ts';
import { generateChatStreamResponse } from '../services/geminiService.ts';
import { fileToDataURL, fileToText, generateId, getMimeTypeAndIsText, shouldIgnoreFile, parseExcelDataUrlToText } from '../services/fileService.ts';
import { t } from '../i18n.ts';
import { ChatMessageBubble } from './Chat/ChatMessageBubble.tsx';
import { parseChangesFromText } from './Chat/utils.ts';
import { MatrixRain } from './Chat/MatrixRain.tsx';
import { AttachmentPreviewModal } from './Chat/AttachmentPreviewModal.tsx';

interface ChatProps {
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  projectFiles: FileNode[];
  onPreviewCode: (code: string, lang: string) => void;
  includeContext: boolean;
  onApplyCode: (changes: FileChange[]) => Promise<{success: boolean, errors: string[]}>;
  lang: 'UA' | 'EN';
  fontSize: number;
  fontFamily: string;
  selectedFileIds: Set<string>;
  user: User | null;
  onAddTempFile: (filename: string, content: string) => void;
  contextMode?: 'adaptive' | 'full' | 'selected' | 'all';
  settings: ThemeSettings;
}

export const Chat: React.FC<ChatProps> = ({ 
  history, 
  setHistory, 
  projectFiles, 
  onPreviewCode, 
  includeContext,
  onApplyCode,
  lang,
  fontSize,
  fontFamily,
  selectedFileIds,
  user,
  onAddTempFile,
  contextMode,
  settings
}) => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [inputHeight, setInputHeight] = useState(140);
  const [isDragOverInput, setIsDragOverInput] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopGenerationRef = useRef(false);
  const wasGenerating = useRef(false);

  // Project statistics calculation moved to Chat Header for cleaner Sidebar
  const getStats = (nodes: FileNode[]) => {
    let fileCount = 0;
    let folderCount = 0;
    let lineCount = 0;

    const traverse = (n: FileNode[]) => {
      n.forEach(node => {
        if (node.name === '.temp') return;
        if (node.isFolder) {
          folderCount++;
          if (node.children) traverse(node.children);
        } else {
          fileCount++;
          if (node.content && !node.content.startsWith('data:')) {
            lineCount += node.content.split('\n').length;
          }
        }
      });
    };
    traverse(nodes);
    return { fileCount, folderCount, lineCount };
  };

  const stats = getStats(projectFiles);
  const maxLines = 100000;
  const optimalLines = 70000;
  const linePercentage = Math.min(100, (stats.lineCount / maxLines) * 100);
  let progressColor = 'bg-green-500';
  if (stats.lineCount > optimalLines) progressColor = 'bg-yellow-500';
  if (stats.lineCount > maxLines) progressColor = 'bg-red-500';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isGenerating, isVerifying]);

  useEffect(() => {
    if (wasGenerating.current && !isGenerating && !isVerifying) {
      const lastMsg = history[history.length - 1];
      if (lastMsg && lastMsg.role === 'model' && !lastMsg.isError) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
          console.error(e);
        }
      }
    }
    wasGenerating.current = isGenerating || isVerifying;
  }, [isGenerating, isVerifying, history]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | FileList) => {
    const files = e instanceof FileList ? e : e.target.files;
    if (!files) return;

    const newAttachments: ChatAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > 5 * 1024 * 1024) {
        alert(`Файл ${file.name} занадто великий (більше 5MB).`);
        continue;
      }

      try {
        const { isText, category } = getMimeTypeAndIsText(file.name, file.type);
        
        if (isText) {
          const text = await fileToText(file);
          newAttachments.push({
            name: file.name,
            text: text,
            mimeType: file.type || 'text/plain'
          });
          onAddTempFile(`uploads/${file.name}`, text);
        } else if (category === 'excel') {
          const dataUrl = await fileToDataURL(file);
          const text = parseExcelDataUrlToText(dataUrl);
          newAttachments.push({
            name: file.name,
            text: text,
            mimeType: file.type || 'text/csv'
          });
          onAddTempFile(`uploads/${file.name}`, dataUrl);
        } else if (category === 'image') {
          const dataUrl = await fileToDataURL(file);
          newAttachments.push({
            name: file.name,
            data: dataUrl,
            mimeType: file.type
          });
          onAddTempFile(`uploads/${file.name}`, dataUrl);
        } else {
          alert(`Файл ${file.name} не підтримується для аналізу ШІ (тільки текст, таблиці та зображення).`);
        }
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const newAttachments: ChatAttachment[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            const dataUrl = await fileToDataURL(file);
            const name = `pasted_image_${Date.now()}.png`;
            newAttachments.push({
              name,
              data: dataUrl,
              mimeType: file.type
            });
            onAddTempFile(`uploads/${name}`, dataUrl);
          } catch (err) {
            console.error('Error pasting image:', err);
          }
        }
      }
    }
    
    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const flattenProjectFiles = (nodes: FileNode[], currentPath: string = ''): { node: FileNode; fullPath: string }[] => {
    let result: { node: FileNode; fullPath: string }[] = [];
    nodes.forEach(node => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      if (shouldIgnoreFile(fullPath)) return;
      if (!node.isFolder && node.content !== undefined) {
        result.push({ node, fullPath });
      }
      if (node.isFolder && node.children) {
        result = result.concat(flattenProjectFiles(node.children, fullPath));
      }
    });
    return result;
  };

  const getAdaptiveContextFiles = (promptText: string): ContextFile[] => {
    const allFiles = flattenProjectFiles(projectFiles);
    if (allFiles.length === 0) return [];

    const isFullMode = contextMode === 'full' || contextMode === 'all';
    
    // In Full mode, include all project files
    if (isFullMode) {
      return allFiles.map(({ node, fullPath }) => {
        if (node.content && node.content.startsWith('data:')) {
          const { category } = getMimeTypeAndIsText(node.name);
          if (category === 'excel') {
            return { name: fullPath, content: parseExcelDataUrlToText(node.content) };
          }
          return { name: fullPath, content: node.content, isImage: true };
        }
        return { name: fullPath, content: node.content || '' };
      });
    }

    // In Adaptive mode:
    const promptLower = promptText.toLowerCase();
    
    // Score each file to prioritize what the AI needs to inspect
    const scoredFiles = allFiles.map(item => {
      let score = 0;
      const lowerPath = item.fullPath.toLowerCase();
      const lowerName = item.node.name.toLowerCase();
      const nameWithoutExt = lowerName.split('.')[0];

      // A. User explicitly selected this file in UI
      if (selectedFileIds.has(item.node.id)) {
        score += 2000;
      }

      // B. Directly mentioned in prompt by full path or file name
      if (promptLower.includes(lowerPath)) {
        score += 1000;
      } else if (promptLower.includes(lowerName)) {
        score += 800;
      } else if (nameWithoutExt.length > 2 && promptLower.includes(nameWithoutExt)) {
        score += 500;
      }

      // C. Key architectural entry points get high baseline priority
      if (['app.tsx', 'app.jsx', 'main.tsx', 'main.jsx', 'index.html', 'server.ts', 'types.ts', 'package.json'].includes(lowerName)) {
        score += 300;
      }

      // D. Code files (.ts, .tsx, .js, .jsx, .py, .css, .html)
      const ext = lowerName.split('.').pop() || '';
      if (['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'html', 'py', 'java', 'sql'].includes(ext)) {
        score += 100;
      }

      const len = item.node.content ? item.node.content.length : 0;
      if (len > 0 && len < 45000) {
        score += 50;
      }

      return { ...item, score, length: len };
    });

    // Sort by score descending
    scoredFiles.sort((a, b) => b.score - a.score);

    // Budget up to 200,000 characters for adaptive context
    const MAX_BUDGET = 200000;
    let currentBudget = 0;
    const result: ContextFile[] = [];

    for (const item of scoredFiles) {
      if (currentBudget >= MAX_BUDGET) break;
      const { node, fullPath } = item;
      if (node.content && node.content.startsWith('data:')) {
        const { category } = getMimeTypeAndIsText(node.name);
        if (category === 'excel') {
          const text = parseExcelDataUrlToText(node.content);
          currentBudget += text.length;
          result.push({ name: fullPath, content: text });
        } else if (node.content.length < 1000000) {
          result.push({ name: fullPath, content: node.content, isImage: true });
        }
      } else {
        const text = node.content || '';
        currentBudget += text.length;
        result.push({ name: fullPath, content: text });
      }
    }

    return result;
  };

  const getProjectStructureString = (nodes: FileNode[], indent = ''): string => {
    let result = '';
    nodes.forEach(node => {
      if (shouldIgnoreFile(node.name)) return;
      result += `${indent}- ${node.name}${node.isFolder ? '/' : ''}\n`;
      if (node.isFolder && node.children) {
        result += getProjectStructureString(node.children, indent + '  ');
      }
    });
    return result;
  };

  const handleSend = async (overrideInput?: string) => {
    let textToSend = overrideInput || input;
    if (!textToSend.trim() && attachments.length === 0) return;

    if (replyTo) {
      textToSend = `> ${replyTo.text.substring(0, 100).replace(/\n/g, ' ')}...\n\n${textToSend}`;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: textToSend,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      replyToId: replyTo?.id
    };

    const modelMessageId = generateId();
    const initialModelMessage: ChatMessage = {
      id: modelMessageId,
      role: 'model',
      text: '',
      isTyping: true
    };

    setHistory(prev => [...prev, userMessage, initialModelMessage]);
    if (!overrideInput) setInput('');
    setAttachments([]);
    setReplyTo(null);
    setIsGenerating(true);
    stopGenerationRef.current = false;

    let finalModelText = '';

    try {
      const projectStructure = getProjectStructureString(projectFiles);
      const contextFiles: ContextFile[] = getAdaptiveContextFiles(userMessage.text);

      let editHistoryStr = '';
      const tempFolder = projectFiles.find(f => f.name === '.temp' && f.isFolder);
      if (tempFolder && tempFolder.children) {
        const histFile = tempFolder.children.find(f => f.name === 'edit_history.json');
        if (histFile && histFile.content) {
          try {
            const histArr = JSON.parse(histFile.content);
            const lastTwo = histArr.slice(-2);
            editHistoryStr = JSON.stringify(lastTwo, null, 2);
          } catch(e) {}
        }
      }

      const stream = generateChatStreamResponse(
        history, 
        userMessage.text, 
        userMessage.attachments,
        contextFiles,
        projectStructure,
        lang,
        settings,
        editHistoryStr
      );

      for await (const chunk of stream) {
        if (stopGenerationRef.current) {
          break;
        }

        if (chunk.error) {
          finalModelText = chunk.error;
          setHistory(prev => prev.map(m => m.id === modelMessageId ? { 
            ...m, 
            text: chunk.error!, 
            isError: true, 
            isTyping: false,
            retryAfter: chunk.retryAfter 
          } : m));
          return;
        }

        if (chunk.modelUsed) {
          setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, modelUsed: chunk.modelUsed } : m));
        }

        if (chunk.status || chunk.detail) {
          setHistory(prev => prev.map(m => m.id === modelMessageId ? {
            ...m,
            aiStatus: {
              step: (chunk.status as any) || m.aiStatus?.step || 'thinking',
              detail: chunk.detail || m.aiStatus?.detail,
              searchQueries: chunk.searchQueries || m.aiStatus?.searchQueries
            }
          } : m));
        }

        if (chunk.searchQueries && chunk.searchQueries.length > 0) {
          setHistory(prev => prev.map(m => m.id === modelMessageId ? {
            ...m,
            searchQueries: Array.from(new Set([...(m.searchQueries || []), ...chunk.searchQueries!]))
          } : m));
        }

        if (chunk.groundingSources && chunk.groundingSources.length > 0) {
          setHistory(prev => prev.map(m => m.id === modelMessageId ? { 
            ...m, 
            groundingSources: [...(m.groundingSources || []), ...chunk.groundingSources!] 
          } : m));
        }

        if (chunk.text) {
          finalModelText += chunk.text;
          setHistory(prev => prev.map(m => m.id === modelMessageId ? { 
            ...m, 
            text: finalModelText,
            aiStatus: m.aiStatus?.step === 'generating' ? m.aiStatus : { step: 'generating', detail: 'Генерація коду та відповіді...' }
          } : m));
          
          const imgMatch = chunk.text.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/);
          if (imgMatch) {
            onAddTempFile(`generated/image_${Date.now()}.jpg`, imgMatch[1]);
          }
        }
      }
      
      setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, isTyping: false } : m));

      // --- VERIFICATION STEP (Optimized to prevent 429 Rate Limits) ---
      if (settings.enableAiVerification && !stopGenerationRef.current && finalModelText.trim().length > 0) {
        setIsVerifying(true);
        
        try {
          const verifyPrompt = `Проаналізуй свою попередню відповідь.
1. Якщо ти мав надати код, чи використав ти правильний формат [FILE: шлях] або [REPLACE: шлях]?
2. Чи немає в коді явних синтаксичних помилок?
3. Чи не видалив ти випадково важливий функціонал при застосуванні змін?
Якщо є помилки, відсутній правильний формат, або втрачено функціонал, напиши повну виправлену фінальну відповідь з правильними тегами.
Якщо все абсолютно ідеально і виправлень не потрібно, напиши ТІЛЬКИ слово 'ALL_OK' без жодних інших символів.`;

          // Lean verification context to stay strictly within free-tier quota limits
          const verifyHistory = [
            userMessage,
            { ...initialModelMessage, text: finalModelText, isTyping: false }
          ];

          const verifyStream = generateChatStreamResponse(
            verifyHistory,
            verifyPrompt,
            [],
            [], // Minimal context files to avoid quota exhaustion
            '',
            lang,
            settings,
            editHistoryStr
          );

          let verifyText = '';
          let isAllOk = false;
          let isReplacingOriginal = false;

          for await (const chunk of verifyStream) {
            if (stopGenerationRef.current) break;
            const textChunk = chunk.text || '';
            verifyText += textChunk;
            
            if (!isReplacingOriginal) {
              if (verifyText.length >= 8) {
                if (verifyText.trim().toUpperCase().includes('ALL_OK')) {
                  isAllOk = true;
                  break;
                } else {
                  // Found mistakes, start replacing the model message text in place
                  isReplacingOriginal = true;
                  setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: verifyText, isTyping: true } : m));
                }
              }
            } else {
              setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: verifyText } : m));
            }
          }

          if (isReplacingOriginal || (!isAllOk && !verifyText.trim().toUpperCase().includes('ALL_OK') && verifyText.trim().length > 0)) {
            finalModelText = verifyText;
            setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: verifyText, isTyping: false } : m));
          } else {
            setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, isTyping: false } : m));
          }

          if (finalModelText.includes('[AUTO_APPLY]')) {
            const changes = parseChangesFromText(finalModelText);
            if (changes.length > 0) {
              onApplyCode(changes);
              setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, applied: true } : m));
            }
          }
        } catch (verifyError) {
          console.warn("Verification non-fatal notice (skipping self-check):", verifyError);
          // Keep original response intact if verification runs into a quota or network issue
          setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, isTyping: false } : m));
        } finally {
          setIsVerifying(false);
        }
      } else if (!stopGenerationRef.current && finalModelText.includes('[AUTO_APPLY]')) {
        // If verification is disabled, just apply the first message
        const changes = parseChangesFromText(finalModelText);
        if (changes.length > 0) {
          onApplyCode(changes);
          setHistory(prev => prev.map(m => m.id === modelMessageId ? { ...m, applied: true } : m));
        }
      }

    } catch (error: any) {
      const msgStr = error?.message || String(error);
      const match = msgStr.match(/retry in ([0-9]+(?:\.[0-9]+)?)s/i) || msgStr.match(/зачекайте ([0-9]+) сек/i);
      const retrySecs = match && match[1] ? Math.ceil(parseFloat(match[1])) : undefined;
      setHistory(prev => prev.map(m => m.id === modelMessageId ? { 
        ...m, 
        text: msgStr.startsWith('Помилка:') ? msgStr : `Помилка: ${msgStr}`, 
        isError: true,
        isTyping: false,
        retryAfter: retrySecs
      } : m));
      setIsVerifying(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = (errorPrompt: string) => {
    handleSend(errorPrompt);
  };

  const handleStop = () => {
    stopGenerationRef.current = true;
    setIsGenerating(false);
    setIsVerifying(false);
    setHistory(prev => {
      const newHistory = [...prev];
      const lastMsg = newHistory[newHistory.length - 1];
      if (lastMsg && lastMsg.role === 'model' && lastMsg.isTyping) {
        lastMsg.isTyping = false;
        if (!lastMsg.text.includes(t[lang].waitingNewRequest)) {
          lastMsg.text += t[lang].waitingNewRequest;
        }
      }
      return newHistory;
    });
  };

  useEffect(() => {
    if (window.CodeLertAPI) {
      window.CodeLertAPI.sendMessageToAI = (msg: string) => {
        handleSend(msg);
      };
    }
  }, [history, projectFiles, includeContext, selectedFileIds, contextMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    setHistory(prev => prev.filter(m => m.id !== msgId));
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = inputHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      setInputHeight(Math.max(100, Math.min(startHeight + deltaY, window.innerHeight * 0.8)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleInputDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverInput(true);
  };

  const handleInputDragLeave = () => {
    setIsDragOverInput(false);
  };

  const handleInputDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverInput(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full h-full bg-theme-base flex flex-col relative min-w-0">
      {isGenerating && settings.enableAnimations !== false && <MatrixRain />}
      
      <div className="px-4 py-2.5 border-b border-theme-border flex flex-wrap items-center justify-between gap-3 bg-theme-header relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-theme-accent animate-pulse"></span>
          <span className="text-sm font-bold text-theme-text">{t[lang].chat}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-panel text-theme-accent border border-theme-border font-mono font-bold">
            CodeLert 7.0
          </span>
        </div>

        {/* Project Statistics Metrics Bar */}
        <div className="flex items-center gap-3 bg-theme-panel/70 px-3 py-1 rounded-lg border border-theme-border text-xs">
          <div className="flex items-center gap-2 text-theme-muted font-medium">
            <span>Файлів: <strong className="text-theme-text">{stats.fileCount}</strong></span>
            <span className="text-theme-border">|</span>
            <span>Папок: <strong className="text-theme-text">{stats.folderCount}</strong></span>
            <span className="text-theme-border">|</span>
            <span>Рядків: <strong className="text-theme-text">{stats.lineCount.toLocaleString()}</strong> / 100k</span>
          </div>

          <div className="w-16 sm:w-24 bg-theme-base rounded-full h-1.5 overflow-hidden border border-theme-border shrink-0" title={`${linePercentage.toFixed(1)}% заповнення ліміту`}>
            <div 
              className={`h-full transition-all duration-300 ${progressColor}`} 
              style={{ width: `${linePercentage}%` }}
            ></div>
          </div>
        </div>

        <button 
          onClick={() => setShowClearChatConfirm(true)}
          className="p-1.5 text-theme-muted hover:text-red-400 hover:bg-theme-hover rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          title={t[lang].clearChat}
        >
          <Trash2 size={15} />
          <span className="hidden sm:inline">{t[lang].clearChat}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 flex flex-col items-center min-w-0 smooth-scroll" style={{ fontSize: `${fontSize}px` }}>
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-theme-text w-full max-w-2xl mx-auto" style={{ fontFamily }}>
            <img src={settings.theme === 'white' ? 'https://i.postimg.cc/2ym1J8xp/lipinsky-sign.png' : 'https://i.postimg.cc/BbgjG9hG/lipinsky-sign-white.png'} alt="Logo" className="w-32 h-auto mb-6 opacity-90" />
            <h2 className="text-2xl font-bold mb-4">{t[lang].welcomeTitle}</h2>
            <p className="text-theme-muted mb-8 leading-relaxed">
              {t[lang].welcomeDescFull}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => document.getElementById('folder-upload-input')?.click()} className="px-4 py-2 bg-theme-panel border border-theme-border rounded-lg hover:bg-theme-hover transition-colors flex items-center gap-2 text-sm shadow-sm">
                <FolderPlus size={16} /> {t[lang].addProjectFolder}
              </button>
              <button onClick={() => document.getElementById('file-upload-input')?.click()} className="px-4 py-2 bg-theme-panel border border-theme-border rounded-lg hover:bg-theme-hover transition-colors flex items-center gap-2 text-sm shadow-sm">
                <FileCode size={16} /> {t[lang].addCodeFile}
              </button>
              <button onClick={() => handleSend(t[lang].whatCanYouDoPrompt)} className="px-4 py-2 bg-theme-panel border border-theme-border rounded-lg hover:bg-theme-hover transition-colors flex items-center gap-2 text-sm shadow-sm">
                <HelpCircle size={16} /> {t[lang].whatCanYouDo}
              </button>
            </div>
          </div>
        )}
        
        {history.map((msg, index) => (
          <div key={msg.id} className="w-full flex justify-center min-w-0">
            <ChatMessageBubble 
              msg={msg} 
              onApplyCode={onApplyCode} 
              onPreviewCode={onPreviewCode} 
              onReply={setReplyTo}
              onRegenerate={handleRegenerate}
              onQuickReply={handleSend}
              onDeleteMessage={handleDeleteMessage}
              onPreviewAttachment={setPreviewAttachment}
              lang={lang} 
              fontFamily={fontFamily} 
              user={user}
              historyLength={history.length}
              isLastMessage={index === history.length - 1}
              settings={settings}
            />
          </div>
        ))}
        
        {isVerifying && (
          <div className="flex justify-center mt-2 relative z-10 w-full">
            <div className="flex items-center gap-2 text-theme-muted text-sm animate-pulse bg-theme-panel px-4 py-2 rounded-full border border-theme-border shadow-lg">
              <Loader2 size={16} className="animate-spin text-theme-accent" />
              {t[lang].verifyingResponse}
            </div>
          </div>
        )}

        {isGenerating && !isVerifying && (
          <div className="flex justify-center mt-4 relative z-10 w-full">
            <button 
              onClick={handleStop} 
              className="flex items-center gap-2 bg-red-900/80 hover:bg-red-800 text-red-200 px-4 py-2 rounded-full text-sm transition-colors shadow-lg"
            >
              <Square size={14} fill="currentColor" />
              {t[lang].stopGeneration}
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-theme-border bg-theme-header relative flex flex-col shrink-0 z-10" style={{ height: `${inputHeight}px` }}>
        <div 
          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize bg-theme-border hover:bg-theme-accent transition-colors z-10"
          onMouseDown={handleResizeMouseDown}
        />
        
        <div className="p-4 flex-1 flex flex-col overflow-hidden mt-1">
          {replyTo && (
            <div className="flex items-center justify-between bg-theme-panel p-2 rounded mb-2 border border-theme-border shrink-0">
              <div className="flex items-center gap-2 text-xs text-theme-muted truncate">
                <Reply size={14} />
                <span className="truncate">{t[lang].replyingTo}: {replyTo.text.substring(0, 50)}...</span>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-theme-muted hover:text-red-400">
                <X size={14} />
              </button>
            </div>
          )}

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 shrink-0 overflow-y-auto max-h-20">
              {attachments.map((att, i) => (
                <div 
                  key={i} 
                  onClick={() => setPreviewAttachment(att)}
                  className="flex items-center gap-1.5 bg-theme-panel hover:bg-theme-hover text-theme-text px-2.5 py-1 rounded-lg text-xs border border-theme-border max-w-full cursor-pointer transition-colors group/datt shadow-2xs"
                  title="Натисніть для попереднього перегляду"
                >
                  <Eye size={12} className="text-theme-accent shrink-0 group-hover/datt:scale-110 transition-transform" />
                  <span className="truncate max-w-[160px]">{att.name}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(i);
                    }} 
                    className="hover:text-red-400 ml-1 p-0.5 rounded shrink-0 transition-colors"
                    title="Видалити"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div 
            className={`flex items-end gap-3 bg-theme-base p-2 rounded-xl border ${isDragOverInput ? 'border-theme-accent bg-theme-hover/30' : 'border-theme-border'} focus-within:border-theme-accent transition-colors shadow-inner flex-1 overflow-hidden`}
            onDragOver={handleInputDragOver}
            onDragLeave={handleInputDragLeave}
            onDrop={handleInputDrop}
          >
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              id="file-upload-input"
            />
            <input 
              type="file" 
              className="hidden" 
              ref={folderInputRef}
              onChange={handleFileSelect}
              id="folder-upload-input"
              {...{ webkitdirectory: "", directory: "" } as any} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-theme-muted hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors shrink-0 mb-1"
              title="Додати файл"
            >
              <Paperclip size={18} />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={t[lang].askAI}
              className="flex-1 h-full bg-transparent text-theme-text text-sm resize-none outline-none py-2"
              style={{ fontFamily }}
            />
            
            <button 
              onClick={() => handleSend()}
              disabled={isGenerating || (!input.trim() && attachments.length === 0)}
              className="p-2 bg-theme-accent text-white hover:bg-theme-accentHover disabled:bg-theme-panel disabled:text-theme-muted rounded-lg transition-colors shrink-0 mb-1"
              title={t[lang].send}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {showClearChatConfirm && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-theme-panel p-6 rounded-xl border border-theme-border shadow-2xl max-w-md w-full">
            <h3 className="text-lg font-bold text-theme-text mb-4">{t[lang].clearChat}?</h3>
            <p className="text-theme-muted mb-6">{t[lang].confirmClearChat}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowClearChatConfirm(false)} className="px-4 py-2 rounded bg-theme-base text-theme-text hover:bg-theme-hover transition-colors">{t[lang].cancel}</button>
              <button onClick={() => {
                setHistory([]);
                setShowClearChatConfirm(false);
              }} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500 transition-colors">{t[lang].confirm}</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal 
        attachment={previewAttachment} 
        onClose={() => setPreviewAttachment(null)} 
      />
    </div>
  );
};
