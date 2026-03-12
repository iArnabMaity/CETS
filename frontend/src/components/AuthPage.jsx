import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  User, Mail, Lock, ShieldAlert, Eye, EyeOff, 
  Check, Loader2, ArrowLeft, ShieldCheck, Building2, Hexagon, Image as ImageIcon,
  Camera, Car, Bell, Star, Heart, Cloud, Sun, Moon,
  Zap, Umbrella, Snowflake, Coffee, Music, Key, Shield, Anchor, X, Grid as GridIcon
} from 'lucide-react';
import ParticleBackground from './ParticleBackground'; 

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

export default function AuthPage({ user, setUser, onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('employee'); 
  const [formData, setFormData] = useState({ name: '', email: '', password: '', company_name: '', website: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const typingStartRef = useRef(null);
  const keystrokeCountRef = useRef(0);

  // 1. Particle Background for Auth
  const Background = () => (
    <div className="absolute inset-0 z-0 opacity-60">
      <ParticleBackground />
    </div>
  );

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

  const pwdRules = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password)
  };
  const isPasswordValid = Object.values(pwdRules).every(Boolean);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    // Track keystroke dynamics for password field
    if (e.target.name === 'password') {
      if (!typingStartRef.current) typingStartRef.current = Date.now();
      keystrokeCountRef.current += 1;
    }
  };

  const generateDeviceFingerprint = () => {
    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      navigator.platform,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) + hash) + raw.charCodeAt(i);
      hash = hash & hash; 
    }
    return 'DF_' + Math.abs(hash).toString(16).toUpperCase();
  };

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
        alert("Security scan failed. Generating new matrix...");
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

  const handleSubmit = async (e, isAdmin = false) => {
    e.preventDefault();
    if (!isAdmin) {
        if (captchaStatus !== 'success') { setError("Please complete the security verification."); return; }
        if (!isLogin && !termsAccepted) { setError("You must accept the Terms of Use."); return; }
        if (!isLogin && !isPasswordValid) { setError("Please meet all password requirements."); return; }
    }
    setLoading(true); setError('');
    try {
        if (isLogin || isAdmin) {
            const typingDuration = typingStartRef.current ? (Date.now() - typingStartRef.current) / 1000 : null;
            const typingSpeed = typingDuration && keystrokeCountRef.current > 0 ? keystrokeCountRef.current / typingDuration : null;
            const response = await axios.post(`${API_BASE}/api/auth/login`, { 
                email: formData.email, password: formData.password,
                latency: 45.0, packet_size: 3000.0, login_attempts: 1, error_rate: 0.01, country: "India",
                device_fingerprint: generateDeviceFingerprint(),
                typing_speed: typingSpeed, local_hour: new Date().getHours()
            });
            setUser(response.data);
        } else {
            await axios.post(`${API_BASE}/api/auth/register`, {
                name: formData.name, email: formData.email, password: formData.password,
                role: role, company_name: role === 'employer' ? formData.company_name : null
            });
            setSuccessMsg('Account created successfully! Welcome to CETS.');
            setTimeout(() => {
                setSuccessMsg(''); setIsLogin(true); setCaptchaStatus('idle'); setFormData({ ...formData, password: '' });
                const alignments = ['justify-start', 'justify-center', 'justify-end'];
                setCaptchaAlign(alignments[Math.floor(Math.random() * alignments.length)]);
            }, 3000);
        }
    } catch (err) {
        if (err.response?.status === 403) setError("🚨 CONNECTION TERMINATED: Cognitive Firewall blocked this request.");
        else if (err.response?.status === 423) setError(err.response?.data?.detail || "Account temporarily locked. Please try again later.");
        else setError(err.response?.data?.detail || "Invalid Credentials or Connection Error");
        setCaptchaStatus('idle'); typingStartRef.current = null; keystrokeCountRef.current = 0;
    } finally { setLoading(false); }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden selection:bg-indigo-500/30 transition-colors duration-500 bg-[#020817]">
      
      {/* BACKGROUND MESH */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 z-0 opacity-60">
            <ParticleBackground />
        </div>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }} 
            className="absolute -top-[30%] -left-[10%] w-[70vw] h-[70vw] filter blur-[120px] rounded-full bg-indigo-600/30 mix-blend-screen opacity-70" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }} 
            className="absolute -bottom-[30%] -right-[10%] w-[70vw] h-[70vw] filter blur-[120px] rounded-full bg-purple-600/30 mix-blend-screen opacity-70" />
        <motion.div animate={{ y: [0, -50, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} 
            className="absolute top-[20%] right-[20%] w-[40vw] h-[40vw] filter blur-[100px] rounded-full bg-pink-500/20 mix-blend-screen opacity-60" />
      </div>

      {/* Back Button */}
      <button onClick={onBack} className="absolute top-8 left-8 z-20 flex items-center px-5 py-2.5 rounded-full backdrop-blur-xl text-sm font-bold transition-all hover:scale-105 bg-slate-800/50 text-slate-300 hover:text-white border border-slate-700/50">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </button>

      {/* CAPTCHA MODAL */}
      <AnimatePresence>
        {showCaptchaModal && captchaTargetIcon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
                className="w-full max-w-sm p-6 rounded-3xl shadow-2xl border bg-slate-900 border-slate-700">
                <div className="bg-indigo-600 text-white p-4 rounded-xl mb-4 shadow-inner">
                    <p className="text-sm font-medium opacity-80">Select all images containing</p>
                    <p className="text-2xl font-black">{captchaTargetIcon.name}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {captchaGrid.map((iconObj, idx) => {
                        const isSelected = selectedGrids.includes(idx);
                        const GridIcon = iconObj.component;
                        return (
                            <div key={idx} onClick={() => toggleGridSelection(idx)} 
                                className={`relative aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'ring-4 ring-indigo-500 scale-95' : 'hover:scale-105'} bg-slate-800 border-slate-700 border shadow-sm`}>
                                <GridIcon className="w-8 h-8 text-slate-400" />
                                {isSelected && <div className="absolute top-1 right-1 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-md"><Check className="w-3.5 h-3.5 text-white"/></div>}
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => {setShowCaptchaModal(false); setSelectedGrids([]);}} className="text-sm font-bold transition-colors text-slate-400 hover:text-slate-200">Cancel</button>
                    <button onClick={handleCaptchaVerify} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-all active:scale-95 shadow-md shadow-indigo-500/20">Verify Matrix</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN AUTH CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, type: "spring" }}
        className="w-full max-w-md rounded-[2.5rem] overflow-hidden backdrop-blur-2xl z-10 border bg-slate-950/50 border-slate-700/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)]"
      >
        <div className="pt-10 pb-4 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                <Hexagon className="w-8 h-8 text-white fill-white/20" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">{isLogin ? 'Welcome Back' : 'Join the Ecosystem'}</h2>
            <p className="text-sm mt-1 font-medium text-slate-400">Secure Blockchain Access</p>
        </div>

        <div className="px-8 mb-6">
            <div className="flex relative p-1.5 rounded-2xl border bg-slate-900/60 border-slate-800/80">
                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-xl transition-all duration-300 ease-in-out bg-indigo-600 shadow-md ${!isLogin ? 'translate-x-[calc(100%+0.75rem)]' : 'translate-x-0'}`} />
                <button type="button" onClick={() => {setIsLogin(true); setError(''); setCaptchaStatus('idle');}} className={`flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors ${isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}>SIGN IN</button>
                <button type="button" onClick={() => {setIsLogin(false); setError(''); setCaptchaStatus('idle');}} className={`flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors ${!isLogin ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}>REGISTER</button>
            </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="px-8 pb-10 space-y-4">
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, height:0}} className="p-4 backdrop-blur-md border text-xs font-bold rounded-2xl flex items-center shadow-sm bg-red-500/10 border-red-500/30 text-red-400">
                <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0"/> {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0, height:0}} className="p-4 backdrop-blur-md border text-xs font-bold rounded-2xl flex items-center shadow-sm bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-5 h-5 mr-3 flex-shrink-0"/> {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {!isLogin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
              <div className="flex gap-4 mb-2">
                <label className={`flex-1 flex items-center justify-center py-3 rounded-2xl border cursor-pointer transition-all shadow-sm ${role === 'employee' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800'}`}>
                    <input type="radio" name="role" value="employee" checked={role === 'employee'} onChange={() => setRole('employee')} className="hidden" /> Employee
                </label>
                <label className={`flex-1 flex items-center justify-center py-3 rounded-2xl border cursor-pointer transition-all shadow-sm ${role === 'employer' ? 'border-purple-500 bg-purple-500/10 text-purple-400 font-bold' : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:bg-slate-800'}`}>
                    <input type="radio" name="role" value="employer" checked={role === 'employer'} onChange={() => setRole('employer')} className="hidden" /> Employer
                </label>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:text-indigo-400">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  type="text" name="name" placeholder="Full Name" required={!isLogin} 
                  value={formData.name} onChange={handleInputChange} 
                  className="w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 backdrop-blur-sm bg-slate-900/40 border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60" 
                />
              </div>

              {role === 'employer' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:text-indigo-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" name="company_name" placeholder="Company Name" required={!isLogin && role === 'employer'} 
                    value={formData.company_name} onChange={handleInputChange} 
                    className="w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 backdrop-blur-sm bg-slate-900/40 border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60" 
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <input 
              type="email" name="email" placeholder="User Email ID" required 
              value={formData.email} onChange={handleInputChange} 
              className="w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 backdrop-blur-sm bg-slate-900/40 border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60" 
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <input 
              type={showPassword ? "text" : "password"} name="password" placeholder="Password" required 
              value={formData.password} onChange={handleInputChange} 
              className="w-full pl-12 pr-12 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 backdrop-blur-sm bg-slate-900/40 border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60" 
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="transition-colors focus:outline-none text-slate-400 hover:text-indigo-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
              {!isLogin && formData.password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} 
                    className="p-4 rounded-2xl text-xs space-y-3 border overflow-hidden shadow-sm bg-slate-900/60 border-slate-700/50">
                      <ul className="grid grid-cols-2 gap-3">
                          <li className={`flex items-center font-medium transition-colors ${pwdRules.length ? 'text-emerald-500' : 'text-slate-400'}`}><Check className="w-3.5 h-3.5 mr-1.5"/> 8+ Characters</li>
                          <li className={`flex items-center font-medium transition-colors ${pwdRules.upper ? 'text-emerald-500' : 'text-slate-400'}`}><Check className="w-3.5 h-3.5 mr-1.5"/> Uppercase</li>
                          <li className={`flex items-center font-medium transition-colors ${pwdRules.lower ? 'text-emerald-500' : 'text-slate-400'}`}><Check className="w-3.5 h-3.5 mr-1.5"/> Lowercase</li>
                          <li className={`flex items-center font-medium transition-colors ${pwdRules.number ? 'text-emerald-500' : 'text-slate-400'}`}><Check className="w-3.5 h-3.5 mr-1.5"/> Number</li>
                          <li className={`flex items-center col-span-2 font-medium transition-colors ${pwdRules.special ? 'text-emerald-500' : 'text-slate-400'}`}><Check className="w-3.5 h-3.5 mr-1.5"/> Special Character (!@#$%)</li>
                      </ul>
                  </motion.div>
              )}
          </AnimatePresence>

          <div className={`flex w-full ${captchaAlign} transition-all duration-500`}>
            <div className="flex items-center space-x-4 p-3 pr-5 rounded-2xl border transition-all shadow-sm bg-slate-900/60 border-slate-700/50">
              <button type="button" onClick={handleCaptchaInitiate} 
                className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-inner transition-all focus:outline-none 
                ${captchaStatus === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' 
                : 'bg-slate-800 border-slate-600 hover:border-indigo-500 text-transparent hover:text-indigo-400'}`}>
                {captchaStatus === 'idle' && <ImageIcon className="w-4 h-4 opacity-50" />}
                {captchaStatus === 'verifying' && <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />}
                {captchaStatus === 'success' && <Check className="w-5 h-5 text-emerald-500" />}
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-200">Verify you are human</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{captchaStatus === 'success' ? 'Verification Complete' : 'Click to start test'}</span>
              </div>
            </div>
          </div>

          {isLogin && (
            <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                    <div className="relative flex items-center">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} 
                            className="peer w-4 h-4 appearance-none rounded border-2 transition-all checked:bg-indigo-600 checked:border-indigo-600 bg-slate-900/50 border-slate-600" />
                        <Check className="w-3 h-3 text-white absolute left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-medium transition-colors text-slate-500 group-hover:text-slate-300">Remember this device</span>
                </label>
                <button type="button" onClick={() => alert("Secure reset link dispatched.")} 
                    className="text-sm font-bold transition-colors text-indigo-500 hover:text-indigo-400">Forgot Password?</button>
            </div>
          )}

          {!isLogin && (
              <label className="flex items-start space-x-3 cursor-pointer mt-4 group">
                  <div className="relative flex items-center mt-0.5">
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} 
                        className="peer w-5 h-5 appearance-none rounded-md border-2 transition-all checked:bg-indigo-600 checked:border-indigo-600 bg-slate-900/50 border-slate-600" />
                      <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-xs leading-relaxed transition-colors text-slate-500 group-hover:text-slate-400">
                      I agree to the <a href="#" className="font-bold hover:underline text-indigo-500">Terms of Use</a> & <a href="#" className="font-bold hover:underline text-indigo-500">Privacy Policy</a>. I consent to my data being irreversibly hashed to the ledger.
                  </span>
              </label>
          )}

          <button 
            type="submit" 
            disabled={loading || captchaStatus !== 'success' || (!isLogin && (!termsAccepted || !isPasswordValid))} 
            className={`w-full mt-6 py-4 rounded-2xl font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center text-sm tracking-wide uppercase
                ${(loading || captchaStatus !== 'success' || (!isLogin && (!termsAccepted || !isPasswordValid))) 
                  ? 'opacity-50 cursor-not-allowed shadow-none bg-slate-600' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {loading ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Handshaking...</> : isLogin ? 'Initialize Session' : 'Create Secure Account'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
