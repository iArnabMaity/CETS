import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, User, Lock, Eye, EyeOff, Loader2, Check, Image as ImageIcon,
  Building2, Hexagon, Shield, Key, Mail, Camera, Car, Bell, Star, Heart, Cloud, Sun, Moon,
  Zap, Umbrella, Snowflake, Coffee, Music, Anchor
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const CAPTCHA_ICON_POOL = [
  { name: 'Security Locks', component: Lock },
  { name: 'User Avatars', component: User },
  { name: 'Corporate Buildings', component: Building2 },
  { name: 'Hexagons', component: Hexagon },
  { name: 'Shields', component: Shield },
  { name: 'Keys', component: Key },
  { name: 'Mail Envelopes', component: Mail },
  { name: 'Cameras', component: Camera },
  { name: 'Cars', component: Car },
  { name: 'Alarm Bells', component: Bell },
  { name: 'Stars', component: Star },
  { name: 'Hearts', component: Heart },
  { name: 'Clouds', component: Cloud },
  { name: 'Suns', component: Sun },
  { name: 'Moons', component: Moon },
  { name: 'Lightning Bolts', component: Zap },
  { name: 'Umbrellas', component: Umbrella },
  { name: 'Snowflakes', component: Snowflake },
  { name: 'Coffee Cups', component: Coffee },
  { name: 'Music Notes', component: Music },
  { name: 'Anchors', component: Anchor }
];

export default function AdminAuthPage({ setUser, onBack }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // --- Capthca State ---
  const [captchaStatus, setCaptchaStatus] = useState('idle'); 
  const [captchaAlign, setCaptchaAlign] = useState('justify-start');
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [selectedGrids, setSelectedGrids] = useState([]);
  const [captchaGrid, setCaptchaGrid] = useState([]); 
  const [captchaTargetIcon, setCaptchaTargetIcon] = useState(null); 
  const [captchaTargetIndices, setCaptchaTargetIndices] = useState([]); 

  useEffect(() => {
    const alignments = ['justify-start', 'justify-center', 'justify-end'];
    setCaptchaAlign(alignments[Math.floor(Math.random() * alignments.length)]);
  }, []);

  const generateDynamicCaptcha = () => {
    const shuffledPool = [...CAPTCHA_ICON_POOL].sort(() => 0.5 - Math.random());
    const chosenThree = [shuffledPool[0], shuffledPool[1], shuffledPool[2]];
    const rawGrid = [chosenThree[0], chosenThree[0], chosenThree[0], chosenThree[1], chosenThree[1], chosenThree[1], chosenThree[2], chosenThree[2], chosenThree[2]];
    const finalGrid = rawGrid.sort(() => 0.5 - Math.random());
    const target = chosenThree[Math.floor(Math.random() * chosenThree.length)];
    const correctAnswers = [];
    finalGrid.forEach((item, idx) => { if (item.name === target.name) correctAnswers.push(idx); });
    setCaptchaGrid(finalGrid);
    setCaptchaTargetIcon(target);
    setCaptchaTargetIndices(correctAnswers);
    setSelectedGrids([]);
  };

  const handleCaptchaInitiate = () => {
    if (captchaStatus === 'success') return;
    generateDynamicCaptcha(); 
    setShowCaptchaModal(true);
  };

  const handleCaptchaVerify = () => {
    const isMatch = captchaTargetIndices.length === selectedGrids.length && captchaTargetIndices.every(t => selectedGrids.includes(t));
    if (!isMatch) {
        Swal.fire({
            icon: 'error',
            title: 'Security Sync Failed',
            text: 'Security scan failed. Generating new matrix...',
            background: '#060a14',
            color: '#fff',
            confirmButtonColor: '#e11d48'
        });
        generateDynamicCaptcha(); 
        return;
    }
    setShowCaptchaModal(false);
    setCaptchaStatus('verifying');
    setTimeout(() => { setCaptchaStatus('success'); }, 1200);
  };

  const toggleGridSelection = (index) => {
    if (selectedGrids.includes(index)) { setSelectedGrids(selectedGrids.filter(i => i !== index)); }
    else { setSelectedGrids([...selectedGrids, index]); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (captchaStatus !== 'success') {
      setAdminError("Please complete the security verification.");
      return;
    }
    
    setAdminLoading(true);
    setAdminError('');
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email: adminEmail,
        password: adminPassword,
        latency: 45.0, packet_size: 3000.0, login_attempts: 1, error_rate: 0.01, country: "India"
      });
      
      if (response.data.role !== 'admin') {
        Swal.fire({
          icon: 'error',
          title: 'Access Denied',
          text: 'ACCESS DENIED: This portal is restricted to System Administrators only.',
          background: '#060a14',
          color: '#f43f5e',
          confirmButtonColor: '#e11d48'
        });
        setAdminLoading(false);
        return;
      }
      
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      setUser(response.data);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Terminated',
        text: err.response?.data?.detail || 'Invalid credentials or connection error.',
        background: '#060a14',
        color: '#f43f5e',
        confirmButtonColor: '#e11d48'
      });
      setCaptchaStatus('idle');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden selection:bg-rose-500/30 transition-colors duration-500 bg-transparent text-slate-100">
      
      {/* BACKGROUND MESH */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="orb-v2 w-[600px] h-[600px] -top-48 -left-48 bg-rose-500/10" style={{ animationDelay: '0s' }} />
        <div className="orb-v2 w-[500px] h-[500px] top-1/2 -right-24 bg-red-500/5" style={{ animationDelay: '-10s' }} />
      </div>

      {/* Back Button */}
      <button onClick={onBack} className={`absolute top-8 left-8 z-20 flex items-center px-5 py-2.5 rounded-full backdrop-blur-xl text-sm font-bold transition-all hover:scale-105 bg-slate-800/50 text-slate-300 hover:text-rose-400 border border-slate-700/50`}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </button>

      {/* CAPTCHA MODAL */}
      <AnimatePresence>
        {showCaptchaModal && captchaTargetIcon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
                className="w-full max-w-sm p-6 glass-card shadow-2xl">
                <div className={`bg-rose-600/20 text-rose-400 p-4 rounded-xl mb-4 shadow-inner border border-rose-500/30`}>
                    <p className="text-sm font-medium opacity-80">Select all images containing</p>
                    <p className="text-2xl font-black">{captchaTargetIcon.name}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {captchaGrid.map((iconObj, idx) => {
                        const isSelected = selectedGrids.includes(idx);
                        const GridIcon = iconObj.component;
                        return (
                            <div key={idx} onClick={() => toggleGridSelection(idx)} 
                                className={`relative aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all ${isSelected ? `ring-4 ring-rose-500 scale-95` : 'hover:scale-105'} bg-white/5 border-white/10 border shadow-sm`}>
                                <GridIcon className={`w-8 h-8 transition-colors ${isSelected ? `text-rose-400` : 'text-slate-500'}`} />
                                {isSelected && <div className={`absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center shadow-md`}><Check className="w-3.5 h-3.5 text-white"/></div>}
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => {setShowCaptchaModal(false); setSelectedGrids([]);}} className="text-sm font-bold transition-colors text-slate-400 hover:text-slate-200">Cancel</button>
                    <button onClick={handleCaptchaVerify} className={`px-6 py-2.5 bg-rose-600 text-white font-bold rounded-full hover:bg-rose-700 transition-all active:scale-95 shadow-md shadow-rose-500/30`}>Verify Matrix</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-card-premium overflow-hidden border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)] z-10"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-500/20 bg-rose-500/10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <p className="text-[10px] font-mono text-rose-500 tracking-tighter uppercase font-bold">System Override Console v2.1</p>
          </div>
        </div>
        <form onSubmit={handleAdminLogin} className="p-8 space-y-6">
          {adminError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono animate-shake">
              {adminError}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-rose-500 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                required
                type="text"
                placeholder="Access Identity (Email)"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                className="w-full p-4 pl-12 bg-black/40 border border-slate-800 rounded-xl text-rose-500 font-mono text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 shadow-inner transition-all"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600 group-focus-within:text-rose-500 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                required
                type={showAdminPassword ? "text" : "password"}
                placeholder="Security Passkey"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="w-full p-4 pl-12 pr-12 bg-black/40 border border-slate-800 rounded-xl text-rose-500 font-mono text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 shadow-inner transition-all"
              />
              <button
                type="button"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-rose-500 transition-colors"
              >
                {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className={`flex w-full ${captchaAlign} transition-all duration-500`}>
            <div className="flex items-center space-x-4 p-3 pr-5 rounded-2xl border transition-all shadow-sm bg-black/40 border-slate-800 focus-within:border-rose-500/50 hover:border-slate-700">
              <button type="button" onClick={handleCaptchaInitiate} 
                className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-inner transition-all focus:outline-none 
                ${captchaStatus === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' 
                : `bg-slate-800 border-slate-600 hover:border-rose-500 text-transparent hover:text-rose-400`}`}>
                {captchaStatus === 'idle' && <ImageIcon className="w-4 h-4 opacity-50 text-slate-400 border-none" />}
                {captchaStatus === 'verifying' && <Loader2 className={`w-5 h-5 animate-spin text-rose-500`} />}
                {captchaStatus === 'success' && <Check className="w-5 h-5 text-emerald-500" />}
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-200">Verify you are human</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{captchaStatus === 'success' ? 'Verification Complete' : 'Click to start test'}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={adminLoading || captchaStatus !== 'success'}
            className={`w-full py-4 rounded-xl font-mono text-sm font-bold tracking-widest uppercase transition-all shadow-lg ${(adminLoading || captchaStatus !== 'success') ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20 hover:shadow-rose-500/40 active:scale-[0.98]'}`}
          >
            {adminLoading ? 'Negotiating Protocol...' : 'Bypass Protocols'}
          </button>

          <div className="flex justify-between items-center px-8 pb-4 pt-4 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => Swal.fire({
                icon: 'info',
                title: 'System Recovery',
                text: 'ADMIN RECOVERY PROTOCOL: Please use your physical hardware key or contact technical lead for emergency reset.',
                background: '#0f172a',
                color: '#f43f5e',
                confirmButtonColor: '#e11d48'
              })}
              className="text-slate-600 hover:text-rose-400 decoration-dotted underline transition-colors"
            >
              Forgot Passkey?
            </button>
            <span className="text-slate-800 uppercase tracking-widest font-bold">CETS V2.Secure</span>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
