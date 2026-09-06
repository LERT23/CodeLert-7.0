import React, { useRef } from 'react';
import { Upload, Download, Save, HelpCircle, FileArchive, Layers, CheckCircle2, Sparkles } from 'lucide-react';
import { ThemeSettings, ProjectState, ThemeColor } from '../types.ts';
import { exportProjectState, parseImportedZip } from '../services/fileService.ts';
import { t } from '../i18n.ts';
import { FlagUA, FlagGB } from './Common/Flags.tsx';

interface SettingsProps {
  settings: ThemeSettings;
  setSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  projectState: ProjectState;
  onImportState: (state: ProjectState) => void;
  onImportZip: (files: any[]) => void;
  lang: 'UA' | 'EN';
  onOpenOnboarding?: () => void;
}

const themesList: { id: ThemeColor; name: string; color: string; text?: string }[] = [
  { id: 'brown', name: 'Coffee Life', color: '#3e2723' },
  { id: 'black', name: 'Black', color: '#111111' },
  { id: 'white', name: 'White', color: '#f3f4f6', text: '#1f2937' },
  { id: 'green', name: 'Green', color: '#064e3b' },
  { id: 'blue', name: 'Blue', color: '#0f172a' },
  { id: 'orange', name: 'Orange', color: '#7c2d12' }
];

const fontsList = [
  { id: 'sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'System Default' },
  { id: '"Fira Code", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Fira Code' },
  { id: '"Consolas", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Consolas' },
  { id: '"Roboto Mono", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Roboto Mono' },
  { id: '"Courier New", monospace, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Courier New' },
  { id: 'Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', name: 'Arial' }
];

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  setSettings,
  projectState,
  onImportState,
  onImportZip,
  lang,
  onOpenOnboarding
}) => {
  const stateInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const uiFontSize = settings.fontSizeUI ?? 13;
  const textFontSize = settings.fontSizeText ?? settings.fontSize ?? 15;

  const handleExportState = () => {
    exportProjectState(projectState);
  };

  const handleStateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const state = JSON.parse(event.target?.result as string) as ProjectState;
        if (state.files && state.chatHistory) {
          onImportState(state);
        } else {
          alert('Невірний формат файлу стану.');
        }
      } catch (err) {
        alert('Помилка читання файлу стану.');
      }
    };
    reader.readAsText(file);
    if (stateInputRef.current) stateInputRef.current.value = '';
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const files = await parseImportedZip(file);
      onImportZip(files);
    } catch (err) {
      console.error(err);
    }
    if (zipInputRef.current) zipInputRef.current.value = '';
  };

  return (
    <div className="w-full h-full bg-theme-base flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-theme-border">
        <h2 className="text-base font-bold text-theme-text flex items-center gap-2">
          <span>⚙️</span> {t[lang].settings}
        </h2>
        <div className="flex items-center gap-2">
          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="px-2.5 py-1 rounded bg-theme-accent/20 hover:bg-theme-accent/35 text-theme-accent text-xs font-semibold flex items-center gap-1.5 transition-colors border border-theme-accent/30"
              title={lang === 'UA' ? 'Пройти початкове налаштування' : 'Start onboarding setup'}
            >
              <Sparkles size={13} />
              <span>{lang === 'UA' ? 'Гід ШІ' : 'Tour'}</span>
            </button>
          )}
          <span className="text-xs px-2 py-0.5 rounded bg-theme-header text-theme-accent font-mono font-semibold border border-theme-border">
            CodeLert 7.0
          </span>
        </div>
      </div>
      
      <div className="space-y-5 text-xs sm:text-sm">
        {/* AI Modes with Hover Tooltips */}
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border space-y-2.5">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-1">
            {t[lang].aiModel || 'Модель ШІ'} & {t[lang].searchGrounding || 'Google Search'}
          </div>

          {/* AI Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-theme-text mb-1">
              {t[lang].aiModel || 'Модель ШІ / AI Model'}
            </label>
            <select
              value={settings.aiModel || 'auto'}
              onChange={(e) => setSettings({ ...settings, aiModel: e.target.value as any })}
              className="w-full bg-theme-header border border-theme-border text-theme-text rounded p-2 outline-none focus:border-theme-accent text-xs"
            >
              <option value="auto">✨ {t[lang].modelAuto || 'Автоматичний вибір (Рекомендовано - захист від квот)'}</option>
              <option value="gemini-3.8-flash">⚡ {t[lang].modelFlash || 'gemini-3.8-flash (Швидка та збалансована)'}</option>
              <option value="gemini-flash-latest">🚀 {t[lang].modelFlashLatest || 'gemini-flash-latest (Найновіша Flash)'}</option>
              <option value="gemini-3.1-flash-lite">🔥 {t[lang].modelLite || 'gemini-3.1-flash-lite (Максимальна квота та швидкість)'}</option>
              <option value="gemini-3.1-pro-preview">🧠 {t[lang].modelPro || 'gemini-3.1-pro-preview (Потрібен Pro / Платний тариф)'}</option>
            </select>
          </div>

          {/* Google Search Grounding Toggle */}
          <div className="flex items-center justify-between group pt-1 border-t border-theme-border/50">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.enableSearchGrounding !== false}
                onChange={(e) => setSettings({ ...settings, enableSearchGrounding: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span className="text-blue-400 font-semibold">{t[lang].searchGrounding || 'Google Search Web Grounding'}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-blue-400 hover:text-blue-300 transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].searchGroundingTooltip || 'ШІ використовує актуальні дані з інтернету через Google Search. Якщо квоту веб-пошуку вичерпано (429), система автоматично продовжує генерацію коду без переривань.'}
              </div>
            </div>
          </div>

          {/* AI Deep Thinking & Analysis Pause */}
          <div className="flex items-center justify-between group">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.aiDeepThinking !== false}
                onChange={(e) => setSettings({ ...settings, aiDeepThinking: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span className="text-purple-400 font-semibold">Глибокий аналіз та пауза ШІ</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-purple-400 hover:text-purple-300 transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                Дає ШІ додатковий час для аналізу структури проекту, пошуку та побудови архітектурного рішення перед видачею відповіді.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between group pt-1 border-t border-theme-border/50">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.aiModeStepByStep || false}
                onChange={(e) => setSettings({ ...settings, aiModeStepByStep: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span>{t[lang].aiModeStepByStep}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].stepByStepTooltip}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between group">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.aiModeLineReplace !== false}
                onChange={(e) => setSettings({ ...settings, aiModeLineReplace: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span>{t[lang].aiModeLineReplace}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].lineReplaceTooltip}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between group">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.enableAiVerification || false}
                onChange={(e) => setSettings({ ...settings, enableAiVerification: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span className="text-amber-400 font-semibold">{t[lang].enableAiVerification}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-amber-400 hover:text-amber-300 transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-64 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].aiVerificationTooltip}
              </div>
            </div>
          </div>
        </div>

        {/* System & Visual Options with Tooltips */}
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border space-y-2.5">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-1">
            Системні опції / Options
          </div>

          {/* Auto Backup */}
          <div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
                <input 
                  type="checkbox" 
                  checked={settings.autoBackup || false}
                  onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                  className="accent-theme-accent w-4 h-4 cursor-pointer"
                />
                <span>{t[lang].autoBackup}</span>
              </label>
              <div className="relative group/tooltip">
                <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
                <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                  {t[lang].autoBackupTooltip}
                </div>
              </div>
            </div>
            {settings.autoBackup && (
              <select 
                value={settings.autoBackupInterval || 30}
                onChange={(e) => setSettings({ ...settings, autoBackupInterval: parseInt(e.target.value) })}
                className="w-full mt-2 bg-theme-header border border-theme-border text-theme-text rounded p-1.5 outline-none focus:border-theme-accent text-xs"
              >
                <option value={20}>20 {t[lang].minutes}</option>
                <option value={30}>30 {t[lang].minutes}</option>
                <option value={60}>60 {t[lang].minutes}</option>
              </select>
            )}
          </div>

          {/* New Year Mode */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.newYearMode || false}
                onChange={(e) => setSettings({ ...settings, newYearMode: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span>{t[lang].newYearMode}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].newYearTooltip}
              </div>
            </div>
          </div>

          {/* Custom Cursor */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.useCustomCursor !== false}
                onChange={(e) => setSettings({ ...settings, useCustomCursor: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span>{t[lang].customCursor}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].customCursorTooltip}
              </div>
            </div>
          </div>

          {/* Animations */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-medium text-theme-text cursor-pointer hover:text-theme-accent transition-colors">
              <input 
                type="checkbox" 
                checked={settings.enableAnimations !== false}
                onChange={(e) => setSettings({ ...settings, enableAnimations: e.target.checked })}
                className="accent-theme-accent w-4 h-4 cursor-pointer"
              />
              <span>{t[lang].enableAnimations}</span>
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].animationsTooltip}
              </div>
            </div>
          </div>
        </div>

        {/* Context Mode */}
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider">
              {t[lang].contextMode}
            </label>
            <div className="relative group/tooltip">
              <HelpCircle size={14} className="text-theme-muted hover:text-theme-accent transition-colors cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-60 p-2.5 bg-theme-header text-theme-text text-xs rounded-md shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 border border-theme-border leading-snug">
                {t[lang].contextTooltip}
              </div>
            </div>
          </div>
          <select 
            value={settings.contextMode || 'adaptive'}
            onChange={(e) => setSettings({ ...settings, contextMode: e.target.value as 'adaptive' | 'full' | 'selected' | 'all' })}
            className="w-full bg-theme-header border border-theme-border text-theme-text rounded p-2 outline-none focus:border-theme-accent text-xs font-medium"
          >
            <option value="adaptive">{lang === 'UA' ? '⚡ Адаптивний (Розумний вибір файлів ШІ)' : '⚡ Adaptive (AI smart file selection)'}</option>
            <option value="full">{lang === 'UA' ? '📦 Повний (Вміст усіх файлів проекту)' : '📦 Full (All project files content)'}</option>
            <option value="selected">{lang === 'UA' ? '🎯 Тільки обрані файли (Ручний вибір)' : '🎯 Selected files only (Manual)'}</option>
          </select>
        </div>

        {/* Workspace Mode / Information only */}
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider">
              Робоча зона / Workspace
            </label>
            <span className="text-[10px] px-2 py-0.5 rounded bg-theme-accent/20 text-theme-accent font-bold">
              {lang === 'UA' ? 'МАКСИМАЛЬНИЙ' : 'MAXIMAL'}
            </span>
          </div>
          <p className="text-xs text-theme-muted leading-relaxed">
            {lang === 'UA'
              ? 'Робочий простір закріплено в максимальному режимі без мертвих зон для максимального огляду коду. Бічні панелі можна вільно згортати або розширювати, потягнувши мишею за їхні вертикальні межі за необхідності.'
              : 'Workspace is fixed in maximal mode with zero dead zones for full code immersion. Sidebars can be freely resized by dragging their borders as needed.'}
          </p>
        </div>

        {/* Dual Font Size Sliders (UI Font Size & Text/Code Font Size) */}
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border space-y-3.5">
          <div className="text-xs font-bold text-theme-muted uppercase tracking-wider mb-1">
            Масштаб шрифтів / Font Sizes
          </div>

          {/* 1. UI Font Size Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-theme-text">
                {t[lang].fontSizeUI}
              </label>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-theme-header text-theme-accent border border-theme-border font-bold">
                {uiFontSize}px
              </span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="18" 
              value={uiFontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSettings({ ...settings, fontSizeUI: val });
              }}
              className="w-full accent-theme-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-theme-muted mt-0.5">
              <span>Компактний (10px)</span>
              <span>Звичайний (13px)</span>
              <span>Великий (18px)</span>
            </div>
          </div>

          {/* 2. Text & Code Font Size Slider */}
          <div className="pt-2 border-t border-theme-border/60">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-theme-text">
                {t[lang].fontSizeText}
              </label>
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-theme-header text-theme-accent border border-theme-border font-bold">
                {textFontSize}px
              </span>
            </div>
            <input 
              type="range" 
              min="11" 
              max="24" 
              value={textFontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setSettings({ ...settings, fontSizeText: val, fontSize: val });
              }}
              className="w-full accent-theme-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-theme-muted mt-0.5">
              <span>Дрібний (11px)</span>
              <span>Стандарт (15px)</span>
              <span>Максимум (24px)</span>
            </div>
          </div>
        </div>

        {/* Theme Palette */}
        <div>
          <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">
            {t[lang].theme}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {themesList.map(theme => (
              <button 
                key={theme.id}
                onClick={() => setSettings({ ...settings, theme: theme.id })}
                className={`h-9 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all hover:scale-[1.02] ${settings.theme === theme.id ? 'border-theme-accent shadow-md' : 'border-transparent'}`}
                style={{ backgroundColor: theme.color, color: theme.text || '#fff' }}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">
            {t[lang].fontFamily}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {fontsList.map(font => (
              <button 
                key={font.id}
                onClick={() => setSettings({ ...settings, fontFamily: font.id })}
                className={`p-2 rounded-lg border flex items-center justify-center transition-colors relative group ${settings.fontFamily === font.id ? 'border-theme-accent bg-theme-hover' : 'border-theme-border bg-theme-panel hover:bg-theme-hover'}`}
                style={{ fontFamily: font.id }}
                title={font.name}
              >
                <span className="text-lg font-bold text-theme-text">Tt</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-theme-panel text-theme-text text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-theme-border">
                  {font.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language Switcher with Flags */}
        <div>
          <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider mb-2">
            {t[lang].language}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setSettings({ ...settings, language: 'UA' })}
              className={`flex items-center justify-center gap-2.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${settings.language === 'UA' ? 'bg-theme-accent border-theme-accentHover text-white shadow-md' : 'bg-theme-header border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'}`}
            >
              <FlagUA size={20} />
              <span>Українська (UA)</span>
            </button>
            <button 
              onClick={() => setSettings({ ...settings, language: 'EN' })}
              className={`flex items-center justify-center gap-2.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${settings.language === 'EN' ? 'bg-theme-accent border-theme-accentHover text-white shadow-md' : 'bg-theme-header border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-hover'}`}
            >
              <FlagGB size={20} />
              <span>English (EN)</span>
            </button>
          </div>
        </div>

        {/* Compact & Structured Project State Management Card */}
        <div className="p-3 bg-theme-panel rounded-lg border border-theme-border space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-theme-muted uppercase tracking-wider">
              {t[lang].projectManagement}
            </h3>
            <span className="text-[10px] text-green-400 font-mono flex items-center gap-1">
              <CheckCircle2 size={10} /> Auto-Sync
            </span>
          </div>
          
          <input type="file" accept=".codelert" ref={stateInputRef} onChange={handleStateFileChange} className="hidden" />
          <input type="file" accept=".zip" ref={zipInputRef} onChange={handleZipFileChange} className="hidden" />

          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => zipInputRef.current?.click()} 
              className="flex items-center justify-between bg-theme-header hover:bg-theme-hover text-theme-text p-2 rounded border border-theme-border transition-colors text-xs font-medium"
            >
              <span className="flex items-center gap-2">
                <Upload size={14} className="text-theme-accent" /> {t[lang].importZip}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-theme-base text-theme-muted border border-theme-border">
                .ZIP
              </span>
            </button>
            
            <button 
              onClick={() => stateInputRef.current?.click()} 
              className="flex items-center justify-between bg-theme-header hover:bg-theme-hover text-theme-text p-2 rounded border border-theme-border transition-colors text-xs font-medium"
            >
              <span className="flex items-center gap-2">
                <Download size={14} className="text-sky-400" /> {t[lang].loadState}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-theme-base text-theme-muted border border-theme-border">
                .CODELERT
              </span>
            </button>
            
            <button 
              onClick={handleExportState} 
              className="flex items-center justify-between bg-theme-accent/20 hover:bg-theme-accent/30 text-theme-text p-2 rounded border border-theme-accent/40 transition-colors text-xs font-bold" 
              title="Зберігає файли, повну історію чату та всі налаштування проекту"
            >
              <span className="flex items-center gap-2">
                <Save size={14} className="text-theme-accent" /> {t[lang].saveState}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-accent text-white font-mono">
                Код + Чат
              </span>
            </button>
          </div>
        </div>

        {/* Logic Bible 7-Step Summary Card */}
        <div className="p-3 bg-purple-950/20 rounded-lg border border-purple-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📖</span> {lang === 'UA' ? 'Біблія логіки відповідей ШІ' : 'AI Logic Bible'}
            </h3>
            <span className="text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">
              7 {lang === 'UA' ? 'кроків' : 'steps'}
            </span>
          </div>
          <p className="text-[11px] text-theme-muted leading-snug">
            {lang === 'UA' 
              ? 'Кожна генерація ШІ обов\'язково проходить 7 обов\'язкових етапів: від аналізу механік та структури до точкової заміни [REPLACE] та фінальної перевірки.'
              : 'Every AI generation executes 7 mandatory steps: from mechanic analysis and tree inspection to targeted [REPLACE] and self-verification.'}
          </p>
          <div className="text-[11px] text-purple-200/90 font-mono space-y-0.5 pt-1 border-t border-purple-500/20">
            <div>1. {lang === 'UA' ? 'Аналіз запитання користувача' : 'Prompt Analysis'}</div>
            <div>2. {lang === 'UA' ? 'План механік та архітектури' : 'Mechanics & Architecture Plan'}</div>
            <div>3. {lang === 'UA' ? 'Інтернет-пошук (Google Search)' : 'Google Search Grounding'}</div>
            <div>4. {lang === 'UA' ? 'Аналіз структури та коду проекту' : 'Codebase Structure Inspection'}</div>
            <div>5. {lang === 'UA' ? 'Виявлення подібних файлів' : 'Related Files Discovery'}</div>
            <div>6. {lang === 'UA' ? 'Безпечна генерація (REPLACE / FILE)' : 'Safe Code Generation (REPLACE/FILE)'}</div>
            <div>7. {lang === 'UA' ? 'Автоматична перевірка та валідація' : 'Automatic Self-Verification'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
