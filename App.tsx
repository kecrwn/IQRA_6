
import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Volume2, ChevronLeft, ChevronRight, 
  CheckCircle2, Home, Book, Trophy, Info, Sparkles, 
  Loader2, Trash2, LogOut, LogIn, UserPlus, MessageCircle, Send, Info as InfoIcon,
  HelpCircle, Star, Search
} from 'lucide-react';
import { IQRA_6_LESSONS } from './data/lessons';
import { LessonPart } from './types';
import { speakArabic, getPronunciationGuide, getChatResponseStream } from './services/geminiService';
import confetti from 'canvas-confetti';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('iqra_current_user'));
  const [loginInput, setLoginInput] = useState('');
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);
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
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  useEffect(() => {
    const users = localStorage.getItem('iqra_registered_users');
    if (users) try { setRegisteredUsers(JSON.parse(users)); } catch (e) {}
    if (currentUser) {
      const prog = localStorage.getItem(`iqra_progress_${currentUser}`);
      if (prog) try {
        const p = JSON.parse(prog);
        setCompletedLessons(p.completedLessons || []);
        setCurrentLessonId(p.currentLessonId || 1);
      } catch (e) {}
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
      const stream = await getChatResponseStream(msgs);
      setChatMessages(p => [...p, { role: 'assistant', content: '' }]);
      let full = '';
      for await (const chunk of stream) {
        full += chunk.text;
        setChatMessages(p => {
          const n = [...p];
          n[n.length - 1].content = full;
          return n;
        });
      }
    } catch (e) {
      setChatMessages(p => [...p, { role: 'assistant', content: "Maafe, connection error." }]);
    } finally { setIsChatting(false); }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border border-slate-100">
          <div className="bg-emerald-700 p-10 text-center text-white">
            <BookOpen className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-3xl font-bold">Iqra' 6</h1>
            <p className="opacity-70 text-sm mt-1 uppercase tracking-widest font-bold">Digital Companion</p>
          </div>
          <div className="p-8 space-y-6">
            <input 
              value={loginInput} 
              onChange={e => { setLoginInput(e.target.value); setLoginError(null); }} 
              placeholder="Username" 
              className="w-full p-4 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              autoFocus
            />
            {loginError && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{loginError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleAction('login')} className="bg-emerald-700 text-white p-4 rounded-2xl font-bold hover:bg-emerald-800 transition-all flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Login
              </button>
              <button onClick={() => handleAction('signup')} className="bg-slate-800 text-white p-4 rounded-2xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Sign Up
              </button>
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('lesson')}>
            <BookOpen className="w-6 h-6" />
            <span className="font-bold tracking-tight">Iqra' 6 Digital</span>
          </div>
          <button onClick={() => { localStorage.removeItem('iqra_current_user'); setCurrentUser(null); }} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-8">
        {showCelebration && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-emerald-500 text-center animate-celebrate">
              <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4 fill-yellow-400" />
              <h2 className="text-3xl font-bold text-emerald-800">Alhamdulillah!</h2>
              <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs mt-1">Lesson Completed</p>
            </div>
          </div>
        )}

        {view === 'lesson' && (
          <div className="animate-fade-in">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Lesson {currentLessonId}</span>
                {completedLessons.includes(currentLessonId) && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{currentLesson.title}</h2>
              <p className="text-slate-500 text-sm mt-1">{currentLesson.description}</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 sm:p-14 space-y-14 shadow-sm border border-slate-100 mb-10 overflow-hidden">
              {currentLesson.parts.map(p => (
                <div key={p.id} className="flex flex-col items-center gap-8 border-b border-slate-50 pb-12 last:border-0 last:pb-0">
                  <div className="text-center">
                    <p className="arabic-font text-5xl sm:text-7xl leading-[1.8] text-slate-800 cursor-pointer hover:text-emerald-600 transition-colors" dir="rtl" onClick={() => speakArabic(p.arabic)}>
                      {p.arabic}
                    </p>
                    {p.transliteration && (
                       <p className="text-emerald-600 font-bold italic text-lg mt-4">{p.transliteration}</p>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => speakArabic(p.arabic)} className="bg-emerald-50 text-emerald-700 px-8 py-3 rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-100 transition-all active:scale-95">
                      <Volume2 className="w-5 h-5" /> Listen
                    </button>
                    <button onClick={async () => { setSelectedPart(p); setShowGuideModal(true); setIsLoadingGuide(true); setPronunciationGuide(await getPronunciationGuide(p.arabic)); setIsLoadingGuide(false); }} className="bg-blue-50 text-blue-700 px-8 py-3 rounded-2xl font-bold flex items-center gap-3 hover:bg-blue-100 transition-all active:scale-95">
                      <InfoIcon className="w-5 h-5" /> Guide
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center gap-3">
              <button 
                disabled={currentLessonId === 1} 
                onClick={() => setCurrentLessonId(c => c-1)}
                className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl border font-bold text-[10px] uppercase tracking-widest transition-all flex flex-col items-start gap-1 ${completedLessons.includes(currentLessonId-1) ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                <div className="flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Lesson {currentLessonId-1}</div>
                <span className="opacity-40 text-[8px]">Previous</span>
              </button>

              <button 
                onClick={() => { 
                  if (!completedLessons.includes(currentLessonId)) { 
                    setCompletedLessons(p => [...p, currentLessonId]); 
                    setShowCelebration(true); 
                    setTimeout(() => setShowCelebration(false), 3000); 
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                  } 
                }}
                className={`flex-1 sm:px-14 py-5 rounded-2xl font-bold shadow-xl text-xs uppercase tracking-[0.2em] transition-all active:scale-95 ${completedLessons.includes(currentLessonId) ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-emerald-700 text-white shadow-emerald-200'}`}
              >
                {completedLessons.includes(currentLessonId) ? 'Lesson Mastered' : 'Complete Lesson'}
              </button>

              <button 
                disabled={currentLessonId === IQRA_6_LESSONS.length} 
                onClick={() => setCurrentLessonId(c => c+1)}
                className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl border font-bold text-[10px] uppercase tracking-widest transition-all flex flex-col items-end gap-1 ${completedLessons.includes(currentLessonId+1) ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                <div className="flex items-center gap-1">Lesson {currentLessonId+1} <ChevronRight className="w-4 h-4" /></div>
                <span className="opacity-40 text-[8px]">Next</span>
              </button>
            </div>
          </div>
        )}

        {view === 'library' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {IQRA_6_LESSONS.map(l => (
              <div key={l.id} onClick={() => { setCurrentLessonId(l.id); setView('lesson'); }} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all flex items-center gap-5 group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-colors ${completedLessons.includes(l.id) ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-300 group-hover:bg-emerald-50'}`}>{l.id}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">{l.title}</h3>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-0.5">{completedLessons.includes(l.id) ? 'Status: Mastered' : 'Status: Pending'}</p>
                </div>
                {completedLessons.includes(l.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              </div>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="animate-fade-in text-center py-16">
            <div className="inline-block relative mb-6">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto" />
              <div className="absolute -top-2 -right-2 bg-emerald-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg">{completedLessons.length}</div>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Your Journey</h2>
            <p className="text-slate-400 text-sm mt-2 uppercase tracking-widest font-bold">Progress Highlights</p>
            
            <div className="mt-12 grid grid-cols-1 gap-3 max-w-sm mx-auto">
              {completedLessons.length > 0 ? completedLessons.sort((a,b)=>a-b).map(id => {
                const lesson = IQRA_6_LESSONS.find(l => l.id === id);
                return (
                  <div key={id} className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="bg-emerald-50 text-emerald-700 w-10 h-10 rounded-xl flex items-center justify-center font-bold">{id}</div>
                    <div className="text-left flex-1">
                      <h4 className="font-bold text-slate-800 text-sm">{lesson?.title}</h4>
                      <p className="text-emerald-600 text-[9px] font-bold uppercase">Mastered ✓</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-slate-300 font-bold uppercase text-xs tracking-widest">No history yet</div>
              )}
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[600px] animate-fade-in border border-slate-100">
            <div className="bg-emerald-700 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 opacity-80" />
                <div><h3 className="font-bold">Ask Ustadz</h3><p className="text-[9px] opacity-70 uppercase font-bold tracking-widest">Tajweed AI Assistant</p></div>
              </div>
              <button onClick={() => setChatMessages([])} className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Clear Chat"><Trash2 className="w-5 h-5 opacity-50" /></button>
            </div>
            <div className="flex-1 p-6 space-y-5 overflow-y-auto bg-slate-50">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-4">
                  <Sparkles className="w-16 h-16 text-emerald-600" />
                  <div>
                    <p className="font-bold uppercase tracking-widest text-xs">Assalamu'alaikum!</p>
                    <p className="text-[10px] mt-2 max-w-[200px]">Ask me anything about the rules in Iqra' 6.</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none shadow-md shadow-emerald-100' : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100'}`}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {isChatting && (
                <div className="flex justify-start">
                   <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-none text-[10px] uppercase font-bold text-emerald-600 shadow-sm border border-slate-50 flex items-center gap-2">
                     <Loader2 className="w-3 h-3 animate-spin" /> Ustadz is thinking...
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-5 border-t bg-white flex gap-3">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="How do I pronounce the Ikhfa' rule?" className="flex-1 p-4 bg-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-sm" />
              <button type="submit" disabled={!chatInput.trim() || isChatting} className="bg-emerald-700 text-white p-4 rounded-2xl shadow-lg hover:bg-emerald-800 disabled:opacity-40 transition-all active:scale-90">
                <Send className="w-6 h-6" />
              </button>
            </form>
          </div>
        )}

        {view === 'help' && (
          <div className="animate-fade-in max-w-2xl mx-auto space-y-8 py-10">
             <div className="bg-emerald-900 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
                <HelpCircle className="absolute -bottom-10 -left-10 w-48 h-48 opacity-10" />
                <h2 className="text-3xl font-extrabold mb-4">How to Learn</h2>
                <ul className="space-y-4 text-emerald-100 text-sm font-medium">
                  <li className="flex gap-4">
                    <span className="bg-emerald-700 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Listen to the recitations by clicking the **Listen** buttons.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="bg-emerald-700 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Understand the Tajweed rules using the **Guide** feature.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="bg-emerald-700 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Mark lessons as complete to track your progress.</span>
                  </li>
                  <li className="flex gap-4">
                    <span className="bg-emerald-700 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <span>Use the **Ask Ustadz** AI chat for any specific questions.</span>
                  </li>
                </ul>
             </div>
             
             <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm text-center">
                <Sparkles className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                <h4 className="font-bold text-slate-800">Advanced Tajweed</h4>
                <p className="text-xs text-slate-400 mt-2">Iqra' 6 is the final step. Take your time with the rules of elongation and nasal merging.</p>
             </div>
          </div>
        )}
      </main>

      {/* FIXED GLASS BOTTOM NAV */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-50">
        <nav className="bg-white/70 backdrop-blur-2xl p-2 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-white/40 flex gap-1">
          {[
            { id: 'lesson', icon: Home, label: 'Learn' },
            { id: 'library', icon: Book, label: 'Book' },
            { id: 'history', icon: Trophy, label: 'Stats' },
            { id: 'help', icon: Info, label: 'Help' }
          ].map(n => (
            <button key={n.id} onClick={() => setView(n.id as any)} className={`flex flex-col items-center p-3 px-6 rounded-full transition-all duration-300 active:scale-90 group ${view === n.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>
              <n.icon className={`w-5 h-5 transition-transform group-hover:-translate-y-0.5 ${view === n.id ? 'fill-white/10' : ''}`} />
              <span className="text-[8px] font-bold uppercase mt-1 tracking-widest">{n.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={() => setView('chat')} className={`p-5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-white/40 backdrop-blur-2xl transition-all duration-300 active:scale-90 ${view === 'chat' ? 'bg-emerald-600 text-white rotate-0' : 'bg-white/70 text-slate-500 hover:text-emerald-600'}`}>
          <Search className="w-7 h-7" />
        </button>
      </div>

      {/* PRONUNCIATION MODAL */}
      {showGuideModal && selectedPart && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up border border-white/20">
            <div className="bg-emerald-700 p-8 text-white text-center">
              <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-sm opacity-80 mb-2">Tajweed Rule</h3>
              <div className="bg-white/10 py-4 px-2 rounded-2xl border border-white/20">
                <p className="arabic-font text-5xl mb-1" dir="rtl">{selectedPart.arabic}</p>
                <p className="text-emerald-200 font-bold italic text-sm">{selectedPart.transliteration}</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-2 mb-2 text-blue-700 opacity-60 uppercase text-[9px] font-bold tracking-widest">
                  <InfoIcon className="w-3 h-3" /> Teacher's Insight
                </div>
                <div className="text-xs font-semibold text-blue-900 leading-relaxed min-h-[40px]">
                  {isLoadingGuide ? (
                    <div className="flex items-center justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-blue-300" /></div>
                  ) : pronunciationGuide}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => speakArabic(selectedPart.arabic)} className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                  <Volume2 className="w-5 h-5" /> Listen Again
                </button>
                <button onClick={() => setShowGuideModal(false)} className="w-full py-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Close Guide</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
