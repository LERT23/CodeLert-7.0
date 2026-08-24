import React, { useState } from 'react';
import { Loader2, Download, Save, Check, Sparkles, FolderPlus } from 'lucide-react';
import { upscaleImage } from '../../services/geminiService.ts';

export const GeneratedImage: React.FC<{ src: string; alt: string; onSave: (src: string) => void }> = ({ src, alt, onSave }) => {
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleHdr = async () => {
    if (isUpscaling) return;
    setIsUpscaling(true);
    try {
      const base64Data = currentSrc.split(',')[1];
      const mimeType = currentSrc.split(';')[0].split(':')[1];
      const newSrc = await upscaleImage(base64Data, mimeType);
      setCurrentSrc(newSrc);
    } catch (e: any) {
      alert('Помилка покращення: ' + e.message);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleSaveToProject = () => {
    onSave(currentSrc);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="my-4 p-3 bg-theme-panel rounded-xl border border-theme-border inline-block shadow-lg relative z-10 max-w-full group">
      
      {/* Relative container for image with top-right corner action button */}
      <div className="relative overflow-hidden rounded-lg">
        <img 
          src={currentSrc} 
          alt={alt} 
          className="max-w-full h-auto rounded-lg transition-transform duration-300 group-hover:scale-[1.01]" 
        />

        {/* Top-Right Corner Floating Save Button Badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
          <button
            onClick={handleSaveToProject}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg backdrop-blur-md transition-all ${
              saved 
                ? 'bg-green-600 text-white' 
                : 'bg-black/70 hover:bg-theme-accent text-white border border-white/20'
            }`}
            title="Зберегти в проект (у папку проекту)"
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            <span>{saved ? 'Збережено' : 'Зберегти'}</span>
          </button>

          <a
            href={currentSrc}
            download="generated_image.png"
            className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-lg text-xs border border-white/20 shadow-lg backdrop-blur-md transition-colors"
            title="Завантажити на пристрій"
          >
            <Download size={14} />
          </a>
        </div>

        {/* Bottom image caption */}
        {alt && alt !== 'Згенероване зображення' && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-[11px] text-white/90 truncate">
            {alt}
          </div>
        )}
      </div>

      {/* Action Bar Below Image */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-theme-border/60">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleHdr} 
            disabled={isUpscaling} 
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs ${
              isUpscaling 
                ? 'bg-theme-muted text-theme-base cursor-not-allowed' 
                : 'bg-amber-600 text-white hover:bg-amber-500'
            }`}
            title="Покращити роздільну здатність та деталі через ШІ"
          >
            {isUpscaling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{isUpscaling ? 'Покращення...' : 'HDR Upscale'}</span>
          </button>

          <a 
            href={currentSrc} 
            download="generated_image.png" 
            className="px-3 py-1.5 bg-theme-base hover:bg-theme-hover text-theme-muted hover:text-theme-text rounded-lg text-xs font-bold border border-theme-border transition-colors flex items-center gap-1.5"
          >
            <Download size={13} /> Завантажити
          </a>
        </div>

        <button 
          onClick={handleSaveToProject} 
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
            saved 
              ? 'bg-green-600 text-white' 
              : 'bg-theme-accent hover:bg-theme-accentHover text-white'
          }`}
        >
          {saved ? <Check size={13} /> : <FolderPlus size={13} />}
          <span>{saved ? 'Збережено в проект' : 'Зберегти в проект'}</span>
        </button>
      </div>

    </div>
  );
};
