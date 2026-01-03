
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  BookOpen, Volume2, ChevronLeft, ChevronRight, 
  CheckCircle2, Home, Book, Trophy, Info, Sparkles, 
  Loader2, Trash2, LogOut, LogIn, UserPlus, MessageCircle, Send, Info as InfoIcon,
  HelpCircle, Star, Search
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import confetti from 'canvas-confetti';

// --- TYPES ---
interface LessonPart {
  id: string;
  arabic: string;
  transliteration?: string;
  meaning?: string;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  parts: LessonPart[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- DATA: IQRA 6 LESSONS ---
const IQRA_6_LESSONS: Lesson[] = [
  {
    id: 1,
    title: "Idgham Ma'al Ghunnah (Ya & Waw)",
    description: "Merging Noon Sakinah or Tanween into 'Ya' or 'Waw' with a nasal sound (2 counts).",
    parts: [
      { id: "1-1", arabic: "مَنْ يَّـقُـوْلُ", transliteration: "man yaqulu" },
      { id: "1-2", arabic: "خَـيْـرًا يَّـرَهٗ", transliteration: "khayran yarahu" },
      { id: "1-3", arabic: "مِـنْ وَّرَآئِـهِـمْ مُّـحِـيْـطٌ", transliteration: "min wara'ihim muheet" },
      { id: "1-4", arabic: "زَجْـرَةٌ وَّاحِـدَةٌ", transliteration: "zajratun wahidah" }
    ]
  },
  {
    id: 2,
    title: "Practice Page 2 & 3",
    description: "Extended merging practice with Tanween and Noon Sakinah.",
    parts: [
      { id: "2-1", arabic: "نُـوحٍ وَّعَادٍ وَّثَمُودَ", transliteration: "nuhin wa 'adin wa thamuda" },
      { id: "2-2", arabic: "تَـوَّابًا رَّحِـيْـمًا", transliteration: "tawwaban rahima" },
      { id: "2-3", arabic: "وَفَـاكِـهَـةً وَّأَبًّـا", transliteration: "wa fakihatan wa abba" }
    ]
  },
  {
    id: 3,
    title: "Stopping Rules (Waqf)",
    description: "Learning where to pause and how to end words during recitation.",
    parts: [
      { id: "3-1", arabic: "وَأَنَّ اللّٰهَ قَدْ أَحَاطَ بِكُلِّ شَيْءٍ عِلْمًا", transliteration: "wa annallaha qad ahata..." },
      { id: "3-2", arabic: "إِنَّ وَعْدَ اللّٰهِ حَقٌّ", transliteration: "inna wa'dallahi haqqun" }
    ]
  },
  {
    id: 4,
    title: "Iqlab (Noon to Meem)",
    description: "Changing the sound when Noon meets Ba.",
    parts: [
      { id: "4-1", arabic: "مِـنْۢ بَـعْـضِ", transliteration: "mim ba'di" },
      { id: "4-2", arabic: "لَـطِـيْـفٌۢ بِـعِـبَـادِهِ", transliteration: "latifun bi 'ibadihi" }
    ]
  },
  {
    id: 5,
    title: "Ikhfa' (The Hiding)",
    description: "Softening the Noon sound.",
    parts: [
      { id: "5-1", arabic: "أَنْ كَانَ", transliteration: "an kana" },
      { id: "5-2", arabic: "خَلَقَ الْإِنْسَانَ", transliteration: "khalaqal insan" }
    ]
  }
];

// --- AI SERVICE ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const speakArabic = async (text: string): Promise<void> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Recite slowly with perfect Tajweed rules: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) { console.error("Audio error:", error); }
};

const getPronunciationGuide = async (arabicText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explain the Tajweed rule in this snippet for an Iqra 6 student: "${arabicText}". Keep it to 2 short sentences. No bolding.`,
    });
    return response.text || "Listen carefully to the nasal merging sound.";
  } catch (error) { return "Check for merging and elongation."; }
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('iqra_current_user'));
  const [loginInput, setLoginInput] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<string[]>(JSON.parse(localStorage.getItem('iqra_registered_users') || '[]'));
  const [loginError, setLoginError] = useState<string | null>(null);

  const [view, setView] = useState<'lesson' | 'history' | 'library' | 'help' | 'chat'>('lesson');
  const [currentLessonId, setCurrentLessonId] = useState<number>(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedPart, setSelectedPart] = useState<LessonPart | null>(null);
  const [pronunciationGuide, setPronunciationGuide] = useState<string | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentLesson = IQRA_6_LESSONS.find(l => l.id === currentLessonId) || IQRA_6_LESSONS[0];

  useEffect(() => {
    if (currentUser) {
      const prog = localStorage.getItem(`iqra_progress_${currentUser}`);
      if (prog) {
        const p = JSON.parse(prog);
        setCompletedLessons(p.completedLessons || []);
        setCurrentLessonId(p.currentLessonId || 1);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`iqra_progress_${currentUser}`, JSON.stringify({ completedLessons, currentLessonId }));
    }
  }, [completedLessons, currentLessonId, currentUser]);

  const handleAction = (action: 'login' | 'signup') => {
    const user = loginInput.trim().toLowerCase();
    if (!user) return;
    const exists = registeredUsers.includes(user);
    if (action === 'login') {
      if (!exists) { setLoginError("User not found."); return; }
      setCurrentUser(user);
      localStorage.setItem('iqra_current_user', user);
    } else {
      if (exists) { setLoginError("User already exists."); return; }
      const nl = [...registeredUsers, user];
      setRegisteredUsers(nl);
      localStorage.setItem('iqra_registered_users', JSON.stringify(nl));
      setCurrentUser(user);
      localStorage.setItem('iqra_current_user', user);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;
    const txt = chatInput;
    setChatInput('');
    const msgs: ChatMessage[] = [...chatMessages, { role: 'user', content: txt }];
    setChatMessages(msgs);
    setIsChatting(true);
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3-pro-preview",
        contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        config: { systemInstruction: "You are a professional Quranic teacher. Use plain text only. Be brief." }
      });
      setChatMessages(p => [...p, { role: 'assistant', content: '' }]);
      let full = '';
      for await (const chunk of stream) {
        full += chunk.text;
        setChatMessages(p => { const n = [...p]; n[n.length - 1].content = full; return n; });
      }
    } catch (e) { setChatMessages(p => [...p, { role: 'assistant', content: "Maafe, connection error." }]);
    } finally { setIsChatting(false); }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
          <div className="bg-emerald-700 p-10 text-center text-white">
            <BookOpen className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Iqra' 6 Digital</h1>
            <p className="opacity-70 text-xs mt-1 uppercase tracking-widest font-bold">Tajweed Learning</p>
          </div>
          <div className="p-8 space-y-6">
            <input value={loginInput} onChange={e => { setLoginInput(e.target.value); setLoginError(null); }} placeholder="Username" className="w-full p-4 bg-slate-50 border rounded-2xl focus:outline-none" />
            {loginError && <p className="text-red-500 text-xs font-bold text-center uppercase">{loginError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleAction('login')} className="bg-emerald-700 text-white p-4 rounded-2xl font-bold">Login</button>
              <button onClick={() => handleAction('signup')} className="bg-slate-800 text-white p-4 rounded-2xl font-bold">Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-emerald-700 p-4 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2" onClick={() => setView('lesson')}><BookOpen className="w-6 h-6" /><span className="font-bold">Iqra' 6</span></div>
          <button onClick={() => { localStorage.removeItem('iqra_current_user'); setCurrentUser(null); }} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        {showCelebration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-emerald-500 text-center animate-celebrate">
              <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4 fill-yellow-400" />
              <h2 className="text-3xl font-bold text-emerald-800">Alhamdulillah!</h2>
              <p className="text-emerald-600 font-bold uppercase text-xs">Lesson Mastered</p>
            </div>
          </div>
        )}

        {view === 'lesson' && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Lesson {currentLessonId}</span>
              <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{currentLesson.title}</h2>
              <p className="text-slate-500 text-sm mt-1">{currentLesson.description}</p>
            </div>
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-14 space-y-14 shadow-sm border border-slate-100 mb-10 overflow-hidden">
              {currentLesson.parts.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-8 border-b border-slate-50 pb-12 last:border-0 last:pb-0">
                  <div className="text-center">
                    <p className="arabic-font text-5xl sm:text-7xl leading-[1.8] text-slate-800 cursor-pointer hover:text-emerald-600 transition-colors" dir="rtl" onClick={() => speakArabic(p.arabic)}>{p.arabic}</p>
                    <p className="text-emerald-600 font-bold italic text-lg mt-4">{p.transliteration}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => speakArabic(p.arabic)} className="bg-emerald-50 text-emerald-700 px-8 py-3 rounded-2xl font-bold flex items-center gap-3">
                      <Volume2 className="w-5 h-5" /> Listen
                    </button>
                    <button onClick={async () => { setSelectedPart(p); setShowGuideModal(true); setIsLoadingGuide(true); setPronunciationGuide(await getPronunciationGuide(p.arabic)); setIsLoadingGuide(false); }} className="bg-blue-50 text-blue-700 px-8 py-3 rounded-2xl font-bold flex items-center gap-3">
                      <InfoIcon className="w-5 h-5" /> Guide
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center gap-3">
              <button disabled={currentLessonId === 1} onClick={() => setCurrentLessonId(c => c-1)} className="flex-1 bg-white border p-4 rounded-2xl font-bold text-[10px] uppercase">Prev</button>
              <button onClick={() => { if (!completedLessons.includes(currentLessonId)) { setCompletedLessons(p => [...p, currentLessonId]); setShowCelebration(true); setTimeout(() => setShowCelebration(false), 3000); confetti(); } }} className={`flex-1 p-5 rounded-2xl font-bold text-xs uppercase shadow-xl ${completedLessons.includes(currentLessonId) ? 'bg-slate-100 text-slate-400' : 'bg-emerald-700 text-white'}`}>{completedLessons.includes(currentLessonId) ? 'Mastered' : 'Complete'}</button>
              <button disabled={currentLessonId === IQRA_6_LESSONS.length} onClick={() => setCurrentLessonId(c => c+1)} className="flex-1 bg-white border p-4 rounded-2xl font-bold text-[10px] uppercase">Next</button>
            </div>
          </div>
        )}

        {view === 'library' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {IQRA_6_LESSONS.map(l => (
              <div key={l.id} onClick={() => { setCurrentLessonId(l.id); setView('lesson'); }} className="bg-white p-6 rounded-[2rem] border shadow-sm cursor-pointer flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${completedLessons.includes(l.id) ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-300'}`}>{l.id}</div>
                <div><h3 className="font-bold text-slate-800 text-lg">{l.title}</h3><p className="text-[10px] uppercase font-bold text-slate-400">{completedLessons.includes(l.id) ? 'Status: Mastered' : 'Status: Pending'}</p></div>
              </div>
            ))}
          </div>
        )}

        {view === 'chat' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[600px] animate-fade-in border">
            <div className="bg-emerald-700 p-6 text-white">
              <h3 className="font-bold">Ask Ustadz</h3>
              <p className="text-[9px] opacity-70 uppercase font-bold tracking-widest">Tajweed AI Tutor</p>
            </div>
            <div className="flex-1 p-6 space-y-5 overflow-y-auto bg-slate-50">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none shadow-sm'}`}>{m.content}</div>
                </div>
              ))}
              {isChatting && <div className="text-[10px] font-bold text-emerald-600 animate-pulse uppercase">Ustadz is thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-5 border-t bg-white flex gap-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type your Tajweed question..." className="flex-1 p-4 bg-slate-50 rounded-2xl focus:outline-none" />
              <button type="submit" disabled={!chatInput.trim() || isChatting} className="bg-emerald-700 text-white p-4 rounded-2xl"><Send className="w-6 h-6" /></button>
            </form>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-2xl p-2 rounded-full shadow-2xl border flex gap-1 z-50">
        {[
          { id: 'lesson', icon: Home, label: 'Learn' },
          { id: 'library', icon: Book, label: 'Book' },
          { id: 'history', icon: Trophy, label: 'Stats' },
          { id: 'help', icon: Info, label: 'Help' },
          { id: 'chat', icon: Search, label: 'Ask' }
        ].map(n => (
          <button key={n.id} onClick={() => setView(n.id as any)} className={`flex flex-col items-center p-3 px-6 rounded-full transition-all ${view === n.id ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>
            <n.icon className="w-5 h-5" /><span className="text-[8px] font-bold uppercase mt-1 tracking-widest">{n.label}</span>
          </button>
        ))}
      </nav>

      {showGuideModal && selectedPart && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up">
            <div className="bg-emerald-700 p-8 text-white text-center">
              <p className="arabic-font text-5xl mb-1" dir="rtl">{selectedPart.arabic}</p>
              <p className="text-emerald-200 font-bold italic text-sm">{selectedPart.transliteration}</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <p className="text-xs font-semibold text-blue-900 leading-relaxed">{isLoadingGuide ? "Ustadz is reviewing..." : pronunciationGuide}</p>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
