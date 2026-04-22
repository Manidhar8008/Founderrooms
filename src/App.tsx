import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useParams, 
  useNavigate,
  Link
} from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  where,
  doc,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth, db, handleFirestoreError } from './lib/firebase';
import { Room, UserProfile, Message, TranscriptLine } from './types';
import AgoraRTC, { 
  AgoraRTCProvider, 
  useJoin, 
  useLocalMicrophoneTrack, 
  usePublish, 
  RemoteUser,
  useRemoteUsers,
} from "agora-rtc-react";
import { agoraClient } from './lib/agora';
import { 
  Plus, 
  Users, 
  MessageSquare, 
  Mic,
  MicOff,
  Headphones,
  LogOut, 
  X, 
  Tag as TagIcon,
  Circle,
  TrendingUp,
  BrainCircuit,
  Rocket,
  ArrowLeft,
  Send,
  MoreVertical,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Shared Components ---

const Navbar = ({ user, onLogin, onLogout }: { user: FirebaseUser | null, onLogin: () => void, onLogout: () => void }) => (
  <nav className="h-16 glass flex items-center justify-between px-8 z-50 sticky top-0 shadow-lg">
    <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
      <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]">
        <Rocket className="w-5 h-5" />
      </div>
      <span className="text-lg font-black tracking-tight text-white italic">FounderRooms</span>
    </Link>
    
    <div className="flex items-center gap-8">
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
        <a href="#" className="hover:text-cyan-400 transition-colors">Explore</a>
        <a href="#" className="hover:text-cyan-400 transition-colors">Calendar</a>
        <a href="#" className="hover:text-cyan-400 transition-colors">Handbook</a>
      </div>
      
      {user ? (
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="block text-xs font-bold text-white leading-none whitespace-nowrap">{user.displayName}</span>
            <span className="text-[10px] text-cyan-400 font-mono tracking-tighter uppercase">Founder / Builder</span>
          </div>
          <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-white/20" />
          <button 
            onClick={onLogout}
            className="px-4 py-1.5 rounded-full glass border border-slate-700 hover:border-red-500/50 transition-colors text-xs text-white"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button 
          onClick={onLogin}
          className="px-5 py-2 rounded-full glass border border-slate-700 hover:border-cyan-500 transition-colors text-white text-sm font-medium"
        >
          Log In / Join
        </button>
      )}
    </div>
  </nav>
);

const Hero = () => (
  <section className="flex flex-col gap-6 py-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-cyan-900/50 text-[10px] uppercase tracking-widest font-bold text-cyan-400 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span> Live Community
    </div>
    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.95]">
      Frictionless Voice & <br />
      <span className="gradient-text">Knowledge Rooms</span> for Founders.
    </h1>
    <p className="text-slate-400 max-w-xl text-lg leading-relaxed font-light">
      The high-signal drop-in audio space where builders talk shop, share roadmaps, and solve infrastructure at scale.
    </p>
  </section>
);

const RoomCard = ({ room }: { room: Room }) => {
  const navigate = useNavigate();
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      onClick={() => navigate(`/room/${room.id}`)}
      className="glass rounded-2xl p-6 hover:border-cyan-500/50 cursor-pointer transition-all flex flex-col gap-4 group"
    >
      <div className="flex justify-between items-start">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700"></div>
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-600"></div>
          <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-cyan-800 flex items-center justify-center text-[10px] font-bold text-cyan-400">
            +{room.participantCount}
          </div>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
          {room.participantCount} Listening
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
        {room.name}
      </h3>
      <p className="text-sm text-slate-400 line-clamp-2">
        Shared wisdom from {room.creatorName} and the community.
      </p>
      
      <div className="flex gap-2 mt-auto">
        {room.tags.map(tag => (
          <span key={tag} className="text-[10px] px-2 py-1 rounded bg-slate-800/50 border border-slate-700 text-slate-400 uppercase tracking-tighter">
            #{tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

const CreateRoomModal = ({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (name: string, tags: string[]) => void }) => {
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tags = ['AI', 'SaaS', 'Marketing', 'Funding', 'Growth', 'Crypto'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass p-8 rounded-3xl border-cyan-500/30 neon-border"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">Create Room</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Room Title</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Scaling AI to $1M ARR" 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600"
            />
          </div>
          
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Topic Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTags.includes(tag) 
                      ? 'bg-cyan-500 text-black border-cyan-500' 
                      : 'glass text-slate-400 border-slate-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          <button 
            disabled={!name}
            onClick={() => { onCreate(name, selectedTags); onClose(); setName(''); setSelectedTags([]); }}
            className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-sm disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            Launch Room
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Pages ---

const AIListenerPanel = ({ transcriptions, interimTranscript }: { transcriptions: TranscriptLine[], interimTranscript: string }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcriptions, interimTranscript]);

  return (
    <div className="glass rounded-2xl border border-cyan-500/20 mb-4 overflow-hidden flex flex-col h-48">
      <div className="px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Live AI Transcriber</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[8px] font-bold text-green-500 uppercase">Listening...</span>
        </div>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/20"
      >
        {transcriptions.map((t, i) => (
          <motion.p 
            key={i}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[11px] leading-relaxed text-slate-400 font-medium"
          >
            {t.text}
          </motion.p>
        ))}
        {interimTranscript && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] leading-relaxed text-cyan-400/70 italic font-light"
          >
            {interimTranscript}
          </motion.p>
        )}
        {transcriptions.length === 0 && !interimTranscript && (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <Mic className="w-6 h-6 mb-2 text-slate-700" />
            <p className="text-[10px] text-slate-600 font-mono italic text-center">Speech recognition active. Start speaking...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AudioControls = ({ muted, deafened, onToggleMute, onToggleDeafen }: { 
  muted: boolean, 
  deafened: boolean, 
  onToggleMute: () => void, 
  onToggleDeafen: () => void 
}) => (
  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
    <motion.button 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggleMute}
      className={`p-4 rounded-full glass border transition-all duration-300 ${
        muted ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
      } neon-glow-cyan`}
    >
      {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
    </motion.button>
    
    <motion.button 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggleDeafen}
      className={`p-4 rounded-full glass border transition-all duration-300 ${
        deafened ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-slate-500 text-slate-400 bg-slate-500/10'
      }`}
    >
      <Headphones className="w-6 h-6" />
    </motion.button>
  </div>
);

const AudioRoom = ({ 
  roomId, 
  muted, 
  deafened, 
  setMuted, 
  setDeafened,
  userId
}: { 
  roomId: string, 
  muted: boolean, 
  deafened: boolean, 
  setMuted: (m: boolean) => void, 
  setDeafened: (d: boolean) => void,
  userId: string
}) => {
  const appId = import.meta.env.VITE_AGORA_APP_ID || "";
  
  // Hardened validation for Agora App ID
  // Agora App IDs are 32-character hexadecimal strings.
  const isIdValid = appId && appId.trim().length === 32 && !appId.includes("YOUR_AGORA_APP_ID");
  
  useEffect(() => {
    if (appId) {
      const masked = appId.slice(0, 4) + "****" + appId.slice(-4);
      console.log(`[Agora] App ID: ${isIdValid ? masked : "INVALID/MISSING"}`);
    }
  }, [appId, isIdValid]);

  // Join the channel ONLY if appid and roomId are valid.
  // We use String UIDs (userId) to avoid numeric range constraints.
  const dummyAppId = "00000000000000000000000000000000";
  useJoin({
    appid: isIdValid ? appId : dummyAppId,
    channel: roomId || "lobby",
    token: null,
    uid: userId, 
  }, !!isIdValid && !!roomId && !!userId);

  // Local tracks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(!!isIdValid && !deafened);
  usePublish([localMicrophoneTrack]);

  // Remote users
  const remoteUsers = useRemoteUsers();

  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setEnabled(!!isIdValid && !muted && !deafened);
    }
  }, [muted, deafened, localMicrophoneTrack, isIdValid]);

  if (!isIdValid) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
          <BrainCircuit className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-black text-white italic tracking-tighter mb-4 uppercase">Voice Config Required</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          To activate the real-time audio stage, you must provide a valid 32-character <span className="text-cyan-400">Agora App ID</span>.
        </p>
        <div className="glass p-4 rounded-xl border border-white/5 w-full text-left">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Instructions:</p>
          <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
            <li>Go to <a href="https://console.agora.io/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline">Agora Console</a></li>
            <li>Create a project and copy the <span className="font-bold">App ID</span></li>
            <li>Add <span className="text-white font-mono">VITE_AGORA_APP_ID</span> to the <span className="font-bold">Secrets panel</span> in AI Studio</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="relative z-10 text-center">
        <motion.div 
          animate={{ 
            scale: muted || deafened ? 1 : [1, 1.1, 1],
            boxShadow: muted || deafened ? "none" : [
              "0 0 20px rgba(34,211,238,0.1)",
              "0 0 50px rgba(34,211,238,0.4)",
              "0 0 20px rgba(34,211,238,0.1)"
            ]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-40 h-40 rounded-full border-2 flex items-center justify-center mb-10 mx-auto transition-colors duration-500 ${
            muted || deafened ? 'border-slate-700' : 'border-cyan-500'
          }`}
        >
          {muted ? <MicOff className="w-16 h-16 text-slate-600" /> : <Mic className="w-16 h-16 text-cyan-400" />}
        </motion.div>
        
        <h3 className="text-3xl font-black text-white italic tracking-tighter mb-4 uppercase">
          {muted ? "Microphone Muted" : deafened ? "Session Deafen" : "Live Audio Stage"}
        </h3>
        
        <div className="flex items-center justify-center gap-3">
          <span className={`w-2 h-2 rounded-full animate-pulse ${muted || deafened ? 'bg-slate-700' : 'bg-cyan-500'}`}></span>
          <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.2em]">
            {remoteUsers.length > 0 ? `${remoteUsers.length} Peer(s) Connected` : "Waiting for Peers..."}
          </p>
        </div>

        {/* Remote Users Visualizer */}
        <div className="mt-8 flex justify-center gap-2">
          {remoteUsers.map(u => (
            <div key={u.uid} className="w-10 h-10 rounded-lg glass border border-cyan-500/20 flex items-center justify-center group relative">
               <Users className="w-5 h-5 text-cyan-400/50 group-hover:text-cyan-400 transition-colors" />
               <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-cyan-400 font-mono">UID: {u.uid}</div>
            </div>
          ))}
        </div>
      </div>

      <AudioControls 
        muted={muted} 
        deafened={deafened} 
        onToggleMute={() => setMuted(!muted)} 
        onToggleDeafen={() => setDeafened(!deafened)} 
      />

      {/* Background Atmosphere */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="w-full h-full absolute bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.05)_0%,transparent_70%)]" />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-[800px] h-[800px] rounded-full border border-white/[0.02]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="w-[500px] h-[500px] rounded-full border border-cyan-500/[0.05]" 
        />
      </div>
    </div>
  );
};

const LobbyPage = ({ user, handleLogin, handleLogout }: { user: FirebaseUser | null, handleLogin: () => void, handleLogout: () => void }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribeRooms = onSnapshot(q, 
      (snapshot) => {
        const roomList: Room[] = [];
        snapshot.forEach((doc) => {
          roomList.push({ id: doc.id, ...doc.data() } as Room);
        });
        setRooms(roomList);
      },
      (error) => {
        console.warn("Lobby sync notice:", error.message);
      }
    );

    return unsubscribeRooms;
  }, []);

  const handleCreateRoom = async (name: string, tags: string[]) => {
    if (!user) {
      handleLogin();
      return;
    }
    
    try {
      await addDoc(collection(db, 'rooms'), {
        name,
        tags,
        creatorId: user.uid,
        creatorName: user.displayName,
        createdAt: serverTimestamp(),
        status: 'active',
        participantCount: Math.floor(Math.random() * 10) + 1 
      });
    } catch (error) {
      handleFirestoreError(error, 'create', 'rooms');
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-8 pb-20">
        <Hero />
        
        <section className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Browse:</span>
            <button className="px-4 py-1.5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30 font-medium text-xs">All Rooms</button>
            {['AI/ML', 'SaaS', 'Marketing'].map(tag => (
              <button key={tag} className="px-4 py-1.5 rounded-full glass hover:bg-slate-800 transition-all text-slate-300 border border-transparent hover:border-slate-700 text-xs">
                {tag}
              </button>
            ))}
          </div>

          <button 
            onClick={() => user ? setIsModalOpen(true) : handleLogin()}
            className="neon-border bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" /> Create Room
          </button>
        </section>

        {rooms.length === 0 ? (
          <div className="py-20 text-center glass rounded-3xl border-dashed border-2 border-white/5">
            <BrainCircuit className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">The lobby is quiet. Be the first to launch a room.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
            <AnimatePresence>
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <CreateRoomModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreateRoom} 
      />
    </div>
  );
};

const AIRoadmapModal = ({ isOpen, onClose, content }: { isOpen: boolean, onClose: () => void, content: string[] }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl glass p-10 rounded-3xl border-cyan-500/50 neon-shadow"
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Execution Roadmap</h2>
            <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-widest">AI Generated from Room Session</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
          {content.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-6 items-start group"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="pt-1">
                <h4 className="text-white font-bold mb-1 group-hover:text-cyan-400 transition-colors uppercase tracking-tight text-sm">
                  {item.split(': ')[0]}
                </h4>
                <p className="text-slate-400 text-xs leading-relaxed font-light">
                  {item.split(': ')[1]}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <button 
          onClick={onClose}
          className="w-full mt-10 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-sm transition-all"
        >
          Acknowledge & Continue
        </button>
      </motion.div>
    </div>
  );
};

const RoomPage = ({ user, handleLogin }: { user: FirebaseUser | null, handleLogin: () => void }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [transcriptions, setTranscriptions] = useState<TranscriptLine[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiRoadmap, setAIRoadmap] = useState<string[] | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition Logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Completely skip initialization if muted
    if (muted || deafened) {
      setInterimTranscript('');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    let recognition: any = null;
    let isExplicitlyStopped = false;

    const initRecognition = () => {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setTranscriptions(prev => [...prev, { text: transcript, isFinal: true, timestamp: Date.now() }]);
            setInterimTranscript('');
          } else {
            currentInterim += transcript;
          }
        }
        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onend = () => {
        if (!isExplicitlyStopped && !muted && !deafened) {
          try {
            recognition.start();
          } catch (e) {
            // SDK might still be cleaning up
          }
        }
      };

      recognition.onerror = (event: any) => {
        const silentErrors = ['aborted', 'no-speech', 'not-allowed'];
        if (silentErrors.includes(event.error)) return;
        console.error("Speech Recognition Error:", event.error);
      };

      try {
        recognition.start();
      } catch (err) {
        if (err instanceof Error && !err.message.includes('already started')) {
          console.error("Speech Recognition Start Failed", err);
        }
      }
    };

    initRecognition();

    return () => {
      isExplicitlyStopped = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          // Cleanup error
        }
      }
    };
  }, [muted, deafened]);

  const generateFounderRoadmap = async (transcriptArray: TranscriptLine[]) => {
    setIsAIProcessing(true);
    setTranscriptions([]); // Clear panel as requested
    setInterimTranscript('');
    
    // LLM Service Interface Stub
    // TODO (V2): Inject Google Gemini API fetch call here.
    // Logic should process transcriptArray to extract high-signal milestones.
    
    // MVP Simulation: Network request simulation
    return new Promise<string[]>((resolve) => {
      setTimeout(() => {
        const hardcodedRoadmap = [
          "Infrastructure: Deploy multi-region edge database instances to minimize global latency.",
          "Architecture: Implement Event-Sourcing pattern for the knowledge graph state machine.",
          "Scaling: Configure auto-scaling horizontal pod autoscalers (HPA) for the transcoding microservice.",
          "Monitoring: Set up custom CloudWatch dashboards for P99 latency tracking of AI inference calls.",
          "Execution: Prepare V2 beta roadmap focused on cross-platform mobile synchronization."
        ];
        resolve(hardcodedRoadmap);
      }, 3000);
    });
  };

  useEffect(() => {
    if (!roomId) return;

    // Fetch Room Metadata
    const fetchRoom = async () => {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (roomDoc.exists()) {
        setRoom({ id: roomDoc.id, ...roomDoc.data() } as Room);
      } else {
        navigate('/');
      }
    };
    fetchRoom();

    // Sync Messages
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribeMessages = onSnapshot(q, 
      (snapshot) => {
        const msgList: Message[] = [];
        snapshot.forEach(doc => {
          msgList.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgList);
      },
      (error) => {
        console.warn("Chat sync notice:", error.message);
      }
    );

    return unsubscribeMessages;
  }, [roomId, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim() || !roomId) return;

    if (newMessage.trim().toLowerCase() === '/ai finalize') {
      const currentTranscripts = [...transcriptions];
      setNewMessage('');
      const roadmap = await generateFounderRoadmap(currentTranscripts);
      setAIRoadmap(roadmap);
      setIsAIProcessing(false);
      return;
    }

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, 'create', `rooms/${roomId}/messages`);
    }
  };

  if (!room) return (
    <div className="h-screen flex flex-col items-center justify-center bg-founder-dark">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl border-2 border-cyan-500/20 animate-spin transition-all duration-1000" />
        <Rocket className="w-8 h-8 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="mt-6 text-cyan-400 font-mono text-xs tracking-widest uppercase">Initializing Knowledge Room...</p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-founder-dark overflow-hidden">
      {/* Room Header */}
      <header className="h-20 glass flex items-center justify-between px-8 border-b border-white/5 relative z-10 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> LEAVE ROOM
          </button>
          
          <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
          
          <div className="hidden sm:block">
            <h2 className="text-xl font-black text-white italic tracking-tight uppercase leading-none">{room.name}</h2>
            <div className="flex gap-3 mt-1">
              {room.tags.map(t => <span key={t} className="text-[10px] text-cyan-400 font-mono tracking-tighter uppercase font-bold">#{t}</span>)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-lg border-2 border-slate-900 bg-slate-700 shadow-xl overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+room.id}`} alt="" />
              </div>
            ))}
          </div>
          <span className="text-xs font-bold text-slate-400 hidden md:inline">{room.participantCount} Founders Live</span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden lg:grid lg:grid-cols-[1fr_400px]">
        {/* Stage Column */}
        <section className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950/20">
          <AgoraRTCProvider client={agoraClient}>
             <AudioRoom 
              roomId={roomId} 
              muted={muted}
              deafened={deafened}
              setMuted={setMuted}
              setDeafened={setDeafened}
              userId={user?.uid || "anonymous"}
             />
          </AgoraRTCProvider>
        </section>

        {/* Chat Column */}
        <aside className="hidden lg:flex w-[400px] h-full glass border-l border-white/5 flex-col shadow-2xl relative z-20">
          <div className="p-4 border-b border-white/5 flex flex-col gap-4">
             {isAIProcessing ? (
               <div className="glass rounded-2xl border border-cyan-500/50 p-6 flex flex-col items-center justify-center h-48 bg-cyan-500/5">
                 <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
                 <p className="text-cyan-400 font-bold text-[11px] text-center uppercase tracking-tighter animate-pulse">
                   Analyzing room transcript...<br/>Generating Founder Execution Roadmap...
                 </p>
               </div>
             ) : (
               <AIListenerPanel transcriptions={transcriptions} interimTranscript={interimTranscript} />
             )}
             
             <div className="flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <MessageSquare className="w-4 h-4 text-cyan-400" />
                 <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Knowledge Chat</h4>
               </div>
               <MoreVertical className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white transition-colors" />
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                <MessageSquare className="w-8 h-8 mb-4" />
                <p className="text-[10px] font-mono uppercase tracking-widest text-center">No knowledge shared yet.<br/>Start the thread.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4"
              >
                <img src={msg.userPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.userName}`} alt="" className="w-8 h-8 rounded-lg shrink-0 object-cover border border-white/10" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">{msg.userName}</span>
                    <span className="text-[8px] text-slate-600 font-mono">
                      {msg.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'JUST NOW'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed break-words font-light">{msg.text}</p>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-slate-950/40 border-t border-white/5 shrink-0">
            {user ? (
              <div className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Drop a thought..."
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700 font-medium"
                />
                <button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="w-full py-4 glass border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-500/10 transition-all duration-300"
              >
                Login to share knowledge
              </button>
            )}
          </div>
        </aside>
      </main>

      <AIRoadmapModal 
        isOpen={!!aiRoadmap} 
        onClose={() => setAIRoadmap(null)} 
        content={aiRoadmap || []} 
      />
    </div>
  );
};

// --- App Entry ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribeAuth;
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Auth Error", error);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <Router>
      <div className="min-h-screen bg-founder-dark">
        <Routes>
          <Route path="/" element={<LobbyPage user={user} handleLogin={handleLogin} handleLogout={handleLogout} />} />
          <Route path="/room/:roomId" element={<RoomPage user={user} handleLogin={handleLogin} />} />
        </Routes>
        
        {/* Persistent Global Glows */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-400/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/3" />
        </div>
      </div>
    </Router>
  );
}
