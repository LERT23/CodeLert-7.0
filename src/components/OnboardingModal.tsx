import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  Type, 
  Palette, 
  Sliders, 
  Search, 
  Cpu, 
  BookOpen, 
  Layers, 
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { ThemeSettings, ThemeColor } from '../types.ts';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ThemeSettings;
  setSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [deepAnalysisUnderstood, setDeepAnalysisUnderstood] = useState(true);

  if (!isOpen) return null;

  const currentLang = settings.language || 'UA';

  const themes: { id: ThemeColor; name: string; hex: string }[] = [
    { id: 'brown', name: currentLang === 'UA' ? 'Коричнева (Classic)' : 'Brown (Classic)', hex: '#b45309' },
    { id: 'black', name: currentLang === 'UA' ? 'Темна (OLED)' : 'Dark (OLED)', hex: '#18181b' },
    { id: 'white', name: currentLang === 'UA' ? 'Світла (Clean)' : 'Light (Clean)', hex: '#f4f4f5' },
    { id: 'green', name: currentLang === 'UA' ? 'Смарагд (Matrix)' : 'Emerald (Matrix)', hex: '#059669' },
    { id: 'blue', name: currentLang === 'UA' ? 'Океан (Cobalt)' : 'Ocean (Cobalt)', hex: '#2563eb' },
    { id: 'orange', name: currentLang === 'UA' ? 'Бурштин (Warm)' : 'Amber (Warm)', hex: '#ea580c' },
  ];

  const fonts = [
    { id: 'Fira Code', name: 'Fira Code' },
    { id: 'JetBrains Mono', name: 'JetBrains Mono' },
    { id: 'Source Code Pro', name: 'Source Code Pro' },
    { id: 'Inter', name: 'Inter' },
    { id: 'Roboto Mono', name: 'Roboto Mono' }
  ];

  const handleFinish = () => {
    localStorage.setItem('codelert_onboarding_completed', 'true');
    // Ensure workspace is maximal
    setSettings(prev => ({
      ...prev,
      workspaceMode: 'wide',
      contextMode: prev.contextMode || 'adaptive'
    }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-theme-panel border border-theme-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border bg-theme-header flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-theme-accent/20 flex items-center justify-center text-theme-accent">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text leading-tight">
                {currentLang === 'UA' ? 'Початкове налаштування Code-Lert AI' : 'Initial Code-Lert AI Setup'}
              </h2>
              <p className="text-xs text-theme-muted">
                {currentStep === 1 
                  ? (currentLang === 'UA' ? 'Крок 1 з 2: Персоналізація та зовнішній вигляд' : 'Step 1 of 2: Personalization & Appearance')
                  : (currentLang === 'UA' ? 'Крок 2 з 2: Ознайомлення з функціями та ШІ' : 'Step 2 of 2: AI Capabilities & Features')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-theme-base border border-theme-border text-theme-muted">
              {currentStep} / 2
            </span>
            <button 
              onClick={handleFinish}
              className="text-theme-muted hover:text-theme-text p-1 rounded-lg transition-colors"
              title={currentLang === 'UA' ? 'Закрити' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Language Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-theme-text uppercase tracking-wider mb-2.5">
                  <Globe size={14} className="text-theme-accent" />
                  <span>{currentLang === 'UA' ? '1. Оберіть мову інтерфейсу' : '1. Select Interface Language'}</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, language: 'UA' }))}
                    className={`p-3 rounded-xl border flex items-center justify-between text-sm font-medium transition-all ${
                      settings.language === 'UA'
                        ? 'border-theme-accent bg-theme-accent/15 text-theme-text ring-1 ring-theme-accent'
                        : 'border-theme-border bg-theme-base text-theme-muted hover:text-theme-text hover:border-theme-accent/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🇺🇦</span>
                      <span>Українська</span>
                    </span>
                    {settings.language === 'UA' && <Check size={16} className="text-theme-accent" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, language: 'EN' }))}
                    className={`p-3 rounded-xl border flex items-center justify-between text-sm font-medium transition-all ${
                      settings.language === 'EN'
                        ? 'border-theme-accent bg-theme-accent/15 text-theme-text ring-1 ring-theme-accent'
                        : 'border-theme-border bg-theme-base text-theme-muted hover:text-theme-text hover:border-theme-accent/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🇬🇧</span>
                      <span>English</span>
                    </span>
                    {settings.language === 'EN' && <Check size={16} className="text-theme-accent" />}
                  </button>
                </div>
              </div>

              {/* Font Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-theme-text uppercase tracking-wider mb-2.5">
                  <Type size={14} className="text-theme-accent" />
                  <span>{currentLang === 'UA' ? '2. Оберіть шрифт редактора та коду' : '2. Select Editor & Code Font'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {fonts.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, fontFamily: f.id }))}
                      className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-left truncate flex items-center justify-between ${
                        settings.fontFamily === f.id
                          ? 'border-theme-accent bg-theme-accent/15 text-theme-text'
                          : 'border-theme-border bg-theme-base text-theme-muted hover:text-theme-text'
                      }`}
                      style={{ fontFamily: f.id }}
                    >
                      <span className="truncate">{f.name}</span>
                      {settings.fontFamily === f.id && <Check size={14} className="text-theme-accent shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-theme-text uppercase tracking-wider mb-2.5">
                  <Palette size={14} className="text-theme-accent" />
                  <span>{currentLang === 'UA' ? '3. Оберіть кольорову тему' : '3. Select Color Theme'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {themes.map(th => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, theme: th.id }))}
                      className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-2.5 ${
                        settings.theme === th.id
                          ? 'border-theme-accent bg-theme-accent/15 text-theme-text ring-1 ring-theme-accent'
                          : 'border-theme-border bg-theme-base text-theme-muted hover:text-theme-text'
                      }`}
                    >
                      <span 
                        className="w-4 h-4 rounded-full shrink-0 border border-black/20 shadow-sm"
                        style={{ backgroundColor: th.hex }}
                      />
                      <span className="truncate">{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Parameters in One View */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-theme-text uppercase tracking-wider mb-2.5">
                  <Sliders size={14} className="text-theme-accent" />
                  <span>{currentLang === 'UA' ? '4. Додаткові параметри' : '4. Additional Options'}</span>
                </label>
                <div className="bg-theme-base border border-theme-border rounded-xl p-3.5 space-y-3">
                  
                  {/* Custom Cursor */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-theme-text">
                        {currentLang === 'UA' ? 'Кастомний курсор' : 'Custom Cursor'}
                      </div>
                      <div className="text-[11px] text-theme-muted">
                        {currentLang === 'UA' ? 'Стилізований неоновий покажчик миші' : 'Stylized glowing mouse pointer'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, useCustomCursor: !s.useCustomCursor }))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        settings.useCustomCursor !== false
                          ? 'bg-theme-accent text-white'
                          : 'bg-theme-header border border-theme-border text-theme-muted'
                      }`}
                    >
                      {settings.useCustomCursor !== false ? (currentLang === 'UA' ? 'Увімкнено' : 'Enabled') : (currentLang === 'UA' ? 'Вимкнено' : 'Disabled')}
                    </button>
                  </div>

                  {/* Animations */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-theme-border/60">
                    <div>
                      <div className="text-xs font-semibold text-theme-text">
                        {currentLang === 'UA' ? 'Плавні анімації' : 'Smooth Animations'}
                      </div>
                      <div className="text-[11px] text-theme-muted">
                        {currentLang === 'UA' ? 'Анімація розгортання повідомлень та вікон' : 'Smooth message and window transitions'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, enableAnimations: !s.enableAnimations }))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        settings.enableAnimations !== false
                          ? 'bg-theme-accent text-white'
                          : 'bg-theme-header border border-theme-border text-theme-muted'
                      }`}
                    >
                      {settings.enableAnimations !== false ? (currentLang === 'UA' ? 'Увімкнено' : 'Enabled') : (currentLang === 'UA' ? 'Вимкнено' : 'Disabled')}
                    </button>
                  </div>

                  {/* Auto-backup */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-theme-border/60">
                    <div>
                      <div className="text-xs font-semibold text-theme-text">
                        {currentLang === 'UA' ? 'Автозбереження коду' : 'Code Auto-Backup'}
                      </div>
                      <div className="text-[11px] text-theme-muted">
                        {currentLang === 'UA' ? 'Періодичне резервне збереження проекту' : 'Periodic project state snapshot'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(s => ({ ...s, autoBackup: !s.autoBackup }))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        settings.autoBackup
                          ? 'bg-theme-accent text-white'
                          : 'bg-theme-header border border-theme-border text-theme-muted'
                      }`}
                    >
                      {settings.autoBackup ? (currentLang === 'UA' ? 'Увімкнено' : 'Enabled') : (currentLang === 'UA' ? 'Вимкнено' : 'Disabled')}
                    </button>
                  </div>

                  {/* Workspace Mode Note (Fixed Maximal) */}
                  <div className="pt-2.5 border-t border-theme-border/60">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-theme-accent mb-1">
                      <Layers size={13} />
                      <span>{currentLang === 'UA' ? 'Робоча зона: Максимальний простір' : 'Workspace: Maximal View'}</span>
                    </div>
                    <p className="text-[11px] text-theme-muted leading-relaxed">
                      {currentLang === 'UA'
                        ? 'Робочу зону зафіксовано на повну ширину (без порожніх полів). Бічні панелі (структура проекту та налаштування) можна за необхідності вільно розширювати, потягнувши мишею за їхні вертикальні межі.'
                        : 'Workspace is locked to full viewport width. Both the file structure and settings sidebars can be freely expanded by dragging their border dividers.'}
                    </p>
                  </div>

                </div>
              </div>

            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-theme-muted">
                {currentLang === 'UA'
                  ? 'Ознайомтеся з 5 основними механіками роботи ШІ та оберіть їх статус. Ваші вибори автоматично запишуться в налаштування програми.'
                  : 'Review the 5 core AI mechanics and choose their status. Your choices will be automatically saved to application settings.'}
              </div>

              {/* 1. Google Search Grounding */}
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-base space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                      <Search size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-theme-text">
                        1. {currentLang === 'UA' ? 'Пошук в Інтернеті через Google Search' : 'Google Search Web Grounding'}
                      </h4>
                      <p className="text-[11px] text-theme-muted mt-0.5 leading-snug">
                        {currentLang === 'UA'
                          ? 'Дозволяє ШІ звертатися до актуальних веб-джерел, документації бібліотек та сучасних стандартів коду.'
                          : 'Enables AI to consult live web sources, official documentation, and modern code standards.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, enableSearchGrounding: true }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.enableSearchGrounding !== false
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>{currentLang === 'UA' ? 'Застосувати' : 'Enable'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, enableSearchGrounding: false }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.enableSearchGrounding === false
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <XCircle size={13} />
                    <span>{currentLang === 'UA' ? 'Відхилити' : 'Disable'}</span>
                  </button>
                </div>
              </div>

              {/* 2. Context Mode */}
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-base space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Cpu size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-theme-text">
                        2. {currentLang === 'UA' ? 'Режим контексту: Адаптивний чи Повний' : 'Context Mode: Adaptive or Full'}
                      </h4>
                      <p className="text-[11px] text-theme-muted mt-0.5 leading-snug">
                        {currentLang === 'UA'
                          ? 'Адаптивний: ШІ самостійно аналізує проект та відкриває необхідні файли за їхніми назвами. Повний: передає вміст абсолютно всіх файлів.'
                          : 'Adaptive: AI intelligently analyzes the project and inspects needed files by name. Full: passes all files content.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, contextMode: 'adaptive' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.contextMode !== 'full'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>{currentLang === 'UA' ? 'Застосувати (Адаптивний)' : 'Use Adaptive'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, contextMode: 'full' }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.contextMode === 'full'
                        ? 'bg-theme-accent text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <span>{currentLang === 'UA' ? 'Обрати Повний' : 'Use Full'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Line Replace Mode (1/2 Text Rule) */}
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-base space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-400">
                      <Layers size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-theme-text">
                        3. {currentLang === 'UA' ? 'Конкретна заміна рядків (REPLACE - 1/2 тексту)' : 'Targeted Line Replacement (REPLACE)'}
                      </h4>
                      <p className="text-[11px] text-theme-muted mt-0.5 leading-snug">
                        {currentLang === 'UA'
                          ? 'Якщо змінюється <=50% рядків у файлі, ШІ використовує точкову заміну [REPLACE] (до 3 блоків на файл). При зміні >50% файл переписується повністю.'
                          : 'If <=50% lines change, AI uses targeted [REPLACE] blocks (max 3 per file). Over 50% changes trigger full rewrite.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, aiModeLineReplace: true }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.aiModeLineReplace !== false
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>{currentLang === 'UA' ? 'Застосувати' : 'Enable'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, aiModeLineReplace: false }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.aiModeLineReplace === false
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <XCircle size={13} />
                    <span>{currentLang === 'UA' ? 'Відхилити' : 'Disable'}</span>
                  </button>
                </div>
              </div>

              {/* 4. Automatic Verification */}
              <div className="p-3.5 rounded-xl border border-theme-border bg-theme-base space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-theme-text">
                        4. {currentLang === 'UA' ? 'Автоматична перевірка відповідей ШІ (Самоаналіз)' : 'Automatic AI Response Verification'}
                      </h4>
                      <p className="text-[11px] text-theme-muted mt-0.5 leading-snug">
                        {currentLang === 'UA'
                          ? 'Останній 7-й крок аналізу: ШІ перевіряє свій код на помилки, відповідність синтаксису та цілісність перед завершенням.'
                          : 'Final 7th step of analysis: AI validates syntax, replace blocks, and integrity before completing.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, enableAiVerification: true }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      settings.enableAiVerification
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    <span>{currentLang === 'UA' ? 'Застосувати' : 'Enable'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(s => ({ ...s, enableAiVerification: false }))}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      !settings.enableAiVerification
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-theme-panel border border-theme-border text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    <XCircle size={13} />
                    <span>{currentLang === 'UA' ? 'Відхилити' : 'Disable'}</span>
                  </button>
                </div>
              </div>

              {/* 5. Deep Analysis (Base of AI - Already Enabled Advantage) */}
              <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/25 text-purple-300 shrink-0 mt-0.5">
                    <BookOpen size={17} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-purple-300">
                        5. {currentLang === 'UA' ? 'Глибокий аналіз (Базова перевага Code-Lert AI)' : 'Deep Analysis (Core Code-Lert AI Advantage)'}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                        {currentLang === 'UA' ? 'База роботи' : 'Core'}
                      </span>
                    </div>
                    <p className="text-[11px] text-theme-muted leading-relaxed">
                      {currentLang === 'UA'
                        ? 'Ця функція є фундаментальною основою роботи ШІ і завжди активна. Кожна відповідь проходить 7 обов\'язкових етапів Біблії логіки: аналіз запитання -> аналіз механік -> Google Search (за потреби) -> аналіз структури коду -> підбір подібних файлів -> генерація надійного коду -> самоперевірка.'
                        : 'This function is the fundamental foundation of Code-Lert AI. Every generation strictly executes the 7-step Logic Bible: prompt analysis -> response mechanics -> Google search -> structure analysis -> related files discovery -> code generation -> verification.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setDeepAnalysisUnderstood(true)}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>{currentLang === 'UA' ? 'Зрозуміло' : 'Understood'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border bg-theme-header flex items-center justify-between shrink-0">
          {currentStep === 1 ? (
            <div></div>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-theme-base border border-theme-border text-theme-text hover:bg-theme-hover transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>{currentLang === 'UA' ? 'Назад' : 'Back'}</span>
            </button>
          )}

          {currentStep === 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-theme-accent hover:bg-theme-accentHover text-white shadow-lg transition-all flex items-center gap-2"
            >
              <span>{currentLang === 'UA' ? 'Далі: Налаштування ШІ' : 'Next: AI Setup'}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center gap-2"
            >
              <Check size={15} />
              <span>{currentLang === 'UA' ? 'Розпочати роботу з Code-Lert' : 'Start using Code-Lert'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
