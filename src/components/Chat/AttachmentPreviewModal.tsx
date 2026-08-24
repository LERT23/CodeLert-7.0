import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Image as ImageIcon, FileText, Music, Play, Eye } from 'lucide-react';
import { ChatAttachment } from '../../types.ts';

interface AttachmentPreviewModalProps {
  attachment: ChatAttachment | null;
  onClose: () => void;
}

export const AttachmentPreviewModal: React.FC<AttachmentPreviewModalProps> = ({ attachment, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!attachment) return null;

  const isImage = Boolean(attachment.data && (attachment.mimeType?.startsWith('image/') || attachment.data.startsWith('data:image/')));
  const isAudio = Boolean(attachment.mimeType?.startsWith('audio/') || (attachment.data && attachment.data.startsWith('data:audio/')));
  const isVideo = Boolean(attachment.mimeType?.startsWith('video/') || (attachment.data && attachment.data.startsWith('data:video/')));
  const hasText = Boolean(attachment.text !== undefined && attachment.text !== null && attachment.text !== '');

  const ext = attachment.name.split('.').pop()?.toLowerCase() || '';

  const handleCopyText = async () => {
    if (!attachment.text) return;
    try {
      await navigator.clipboard.writeText(attachment.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = attachment.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (attachment.data) {
      const a = document.createElement('a');
      a.href = attachment.data;
      a.download = attachment.name;
      a.click();
    } else if (attachment.text) {
      const blob = new Blob([attachment.text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const lines = attachment.text ? attachment.text.split('\n') : [];

  return (
    <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="bg-theme-panel border border-theme-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-header">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <ImageIcon size={18} className="text-green-400 shrink-0" />
            ) : isAudio ? (
              <Music size={18} className="text-purple-400 shrink-0" />
            ) : isVideo ? (
              <Play size={18} className="text-blue-400 shrink-0" />
            ) : (
              <FileCode size={18} className="text-theme-accent shrink-0" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-theme-text truncate">{attachment.name}</span>
              <span className="text-[11px] text-theme-muted">
                {attachment.mimeType || `Файл .${ext}`} {hasText ? `• ${lines.length} рядків • ${attachment.text!.length.toLocaleString()} симв.` : ''}
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {hasText && (
              <button
                onClick={handleCopyText}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'}`}
                title="Копіювати вміст файлу"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Скопійовано' : 'Копіювати'}
              </button>
            )}
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-theme-base hover:bg-theme-hover text-theme-muted hover:text-theme-text rounded-lg text-xs font-bold border border-theme-border flex items-center gap-1.5 transition-colors"
              title="Завантажити файл"
            >
              <Download size={14} /> Завантажити
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-theme-hover text-theme-muted hover:text-theme-text rounded-lg transition-colors ml-1"
              title="Закрити"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4 bg-theme-base flex items-center justify-center min-h-[250px]">
          {isImage && attachment.data ? (
            <div className="flex flex-col items-center justify-center w-full h-full max-h-[70vh]">
              <img 
                src={attachment.data} 
                alt={attachment.name} 
                className="max-h-[68vh] max-w-full object-contain rounded-lg shadow-lg border border-theme-border" 
              />
            </div>
          ) : isAudio && attachment.data ? (
            <div className="p-8 flex flex-col items-center justify-center gap-4 bg-theme-panel rounded-xl border border-theme-border">
              <Music size={48} className="text-theme-accent animate-pulse" />
              <audio controls src={attachment.data} className="w-full max-w-md" />
            </div>
          ) : isVideo && attachment.data ? (
            <div className="flex flex-col items-center justify-center w-full max-h-[70vh]">
              <video controls src={attachment.data} className="max-h-[65vh] max-w-full rounded-lg shadow-lg" />
            </div>
          ) : hasText ? (
            <div className="w-full h-full max-h-[70vh] bg-theme-panel border border-theme-border rounded-lg overflow-auto font-mono text-xs text-theme-text">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="w-12 py-0.5 px-2 text-right text-theme-muted select-none border-r border-theme-border bg-theme-base/50">
                        {idx + 1}
                      </td>
                      <td className="py-0.5 px-3 whitespace-pre-wrap break-all">
                        {line || ' '}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-theme-muted flex flex-col items-center gap-2">
              <FileText size={48} />
              <p className="text-sm font-medium">Бінарний файл: {attachment.name}</p>
              <p className="text-xs">Попередній перегляд недоступний для цього формату. Ви можете завантажити файл.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-theme-border bg-theme-header flex justify-between items-center text-xs text-theme-muted">
          <span>Прикріплено для аналізу ШІ CodeLert 7.0</span>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-theme-accent hover:bg-theme-accentHover text-white font-bold rounded-lg transition-colors"
          >
            Закрити перегляд
          </button>
        </div>

      </div>
    </div>
  );
};
