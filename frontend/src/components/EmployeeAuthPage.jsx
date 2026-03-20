import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  User, Users, Mail, Lock, ShieldAlert, Eye, EyeOff, Phone, Calendar,
  Check, Loader2, ArrowLeft, ShieldCheck, Building2, Hexagon, Image as ImageIcon,
  Camera, Car, Bell, Star, Heart, Cloud, Sun, Moon,
  Zap, Umbrella, Snowflake, Coffee, Music, Key, Shield, Anchor, X, Grid as GridIcon, Sparkles
} from 'lucide-react';
import Swal from 'sweetalert2';
import PhoneInput from './PhoneInput';

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

export default function EmployeeAuthPage({ user, setUser, onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const role = 'employee'; 
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirm_password: '', phone: '', dob: '', gender: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [uniqueErrors, setUniqueErrors] = useState({ email: '', phone: '' });

  const passwordsMatch = formData.password && formData.confirm_password && formData.password === formData.confirm_password;

  const checkUnique = async (field, value) => {
    if (!value || value.trim() === '') { setUniqueErrors(prev => ({ ...prev, [field]: '' })); return; }
    try {
      const res = await axios.get(`${API_BASE}/api/auth/check-unique`, { params: { field, value } });
      if (res.data.exists) {
        setUniqueErrors(prev => ({ ...prev, [field]: `This ${field} is already registered.` }));
      } else {
        setUniqueErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch { setUniqueErrors(prev => ({ ...prev, [field]: '' })); }
  };

  const typingStartRef = useRef(null);
  const keystrokeCountRef = useRef(0);

  // Global background handled by App.jsx

  const [captchaStatus, setCaptchaStatus] = useState('idle'); 
  const [captchaAlign, setCaptchaAlign] = useState('justify-start');
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [selectedGrids, setSelectedGrids] = useState([]);
  
  const [captchaGrid, setCaptchaGrid] = useState([]); 
  const [captchaTargetIcon, setCaptchaTargetIcon] = useState(null); 
  const [captchaTargetIndices, setCaptchaTargetIndices] = useState([]); 

  // --- Behavioral Analytics State ---
  const [latency, setLatency] = useState(45.0); // Default fallback
  const mouseMetricsRef = useRef({ distance: 0, clicks: 0, lastPos: null });

  // --- Mouse Tracking Logic ---
  useEffect(() => {
    const handleMouseMove = (e) => {
        if (!isLogin) return; // Only track during login intent
        const currentPos = { x: e.clientX, y: e.clientY };
        if (mouseMetricsRef.current.lastPos) {
            const dx = currentPos.x - mouseMetricsRef.current.lastPos.x;
            const dy = currentPos.y - mouseMetricsRef.current.lastPos.y;
            mouseMetricsRef.current.distance += Math.sqrt(dx * dx + dy * dy);
        }
        mouseMetricsRef.current.lastPos = currentPos;
    };

    const handleClick = () => {
        if (isLogin) mouseMetricsRef.current.clicks += 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('click', handleClick);
    };
  }, [isLogin]);

  // --- Latency Measurement ---
  useEffect(() => {
    const measureLatency = async () => {
        try {
            const start = performance.now();
            await axios.get(`${API_BASE}/api/auth/handshake`, { timeout: 3000 });
            const end = performance.now();
            setLatency(Math.round(end - start));
        } catch (e) {
            console.warn("Handshake failed, using fallback latency.");
        }
    };
    if (isLogin) measureLatency();
  }, [isLogin]);

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
        Swal.fire({
            icon: 'error',
            title: 'Security Sync Failed',
            text: 'Security scan failed. Generating new matrix...',
            background: '#060a14',
            color: '#fff',
            confirmButtonColor: '#6366f1'
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
            const currentDateTime = new Date();
            const response = await axios.post(`${API_BASE}/api/auth/login`, { 
                email: formData.email, password: formData.password,
                latency: latency, packet_size: 3000.0, login_attempts: 1, error_rate: 0.01, country: "India",
                device_fingerprint: generateDeviceFingerprint(),
                typing_speed: typingSpeed, 
                local_hour: currentDateTime.getHours(),
                local_minute: currentDateTime.getMinutes(),
                mouse_distance: Math.round(mouseMetricsRef.current.distance),
                mouse_clicks: mouseMetricsRef.current.clicks
            });
            
            if (response.data.role !== 'employee') {
                setError("Access Denied: You are not authorized for the Professional Passport portal.");
                setLoading(false);
                return;
            }
            
            // Sync specific keys for dashboard compatibility
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.role);
            
            setUser(response.data);
        } else {
            setLoading(false);
            const confirmResult = await Swal.fire({
                title: 'Final Verification',
                text: 'Are you sure all the inputs you have provided are correct?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#6366f1',
                cancelButtonColor: '#ef4444',
                confirmButtonText: 'Yes, Secure Identity',
                cancelButtonText: 'Review Inputs',
                background: '#060a14',
                color: '#f1f5f9',
                customClass: { popup: 'border border-indigo-500/20' }
            });

            if (!confirmResult.isConfirmed) return;
            setLoading(true);

            await axios.post(`${API_BASE}/api/auth/register`, {
                name: formData.name, email: formData.email, password: formData.password,
                confirm_password: formData.confirm_password,
                role: role,
                phone: formData.phone || null,
                dob: formData.dob || null,
                gender: formData.gender || null
            });

            Swal.fire({
                icon: 'success',
                title: 'Identity Secured',
                html: `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 1rem;">
                    <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem;">Your cryptographic passport has been generated.</p>
                    <div style="width: 3rem; height: 3rem; border: 4px solid #6366f1; border-top-color: transparent; border-radius: 9999px; animation: spin 1s linear infinite;"></div>
                    <p style="color: #818cf8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1rem; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;">Initializing Portal...</p>
                  </div>
                `,
                background: '#060a14',
                color: '#fff',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                allowOutsideClick: false
            });

            setTimeout(() => {
                setSuccessMsg(''); setIsLogin(true); setCaptchaStatus('idle'); setFormData({ name: '', email: '', password: '', confirm_password: '', phone: '', dob: '', gender: '' }); setUniqueErrors({ email: '', phone: '' });
                const alignments = ['justify-start', 'justify-center', 'justify-end'];
                setCaptchaAlign(alignments[Math.floor(Math.random() * alignments.length)]);
            }, 3000);
        }
    } catch (err) {
        if (err.response?.status === 403) setError("🚨 CONNECTION TERMINATED: Cognitive Firewall blocked this request.");
        else if (err.response?.status === 423) setError(err.response?.data?.detail || "Account temporarily locked. Please try again later.");
        else setError(err.response?.data?.detail || "Invalid Credentials or Connection Error");
        setCaptchaStatus('idle'); 
        typingStartRef.current = null; 
        keystrokeCountRef.current = 0;
        // Reset mouse metrics on failed login to force them to prove humanity again
        mouseMetricsRef.current = { distance: 0, clicks: 0, lastPos: null };
    } finally { setLoading(false); }
  };

  const t = {
    accent: 'indigo',
    gradient: 'from-indigo-500 to-purple-600',
    text: 'text-indigo-400',
    glow: 'shadow-indigo-500/30',
    label: 'Professional Passport',
    portal: 'Talent Network'
  };

  return (
    <div className={`relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden selection:bg-${t.accent}-500/30 transition-colors duration-500 bg-transparent`}>
      
      {/* BACKGROUND MESH (Handled by App.jsx particles, adding extra depth here) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`orb orb-primary w-[500px] h-[500px] -top-24 -left-24 opacity-20 bg-${t.accent}-500/10`} />
        <div className={`orb orb-accent w-[400px] h-[400px] bottom-0 -right-24 opacity-15 bg-purple-500/10`} />
      </div>

      {/* Back Button */}
      <button onClick={onBack} className={`absolute top-8 left-8 z-20 flex items-center px-5 py-2.5 rounded-full backdrop-blur-xl text-sm font-bold transition-all hover:scale-105 bg-slate-800/50 text-slate-300 hover:text-${t.accent}-400 border border-slate-700/50`}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </button>

      {/* CAPTCHA MODAL */}
      <AnimatePresence>
        {showCaptchaModal && captchaTargetIcon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} 
                className="w-full max-w-sm p-6 glass-card shadow-2xl">
                <div className={`bg-${t.accent}-600/20 text-${t.accent}-400 p-4 rounded-xl mb-4 shadow-inner border border-${t.accent}-500/30`}>
                    <p className="text-sm font-medium opacity-80">Select all images containing</p>
                    <p className="text-2xl font-black">{captchaTargetIcon.name}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {captchaGrid.map((iconObj, idx) => {
                        const isSelected = selectedGrids.includes(idx);
                        const GridIcon = iconObj.component;
                        return (
                            <div key={idx} onClick={() => toggleGridSelection(idx)} 
                                className={`relative aspect-square rounded-xl flex items-center justify-center cursor-pointer transition-all ${isSelected ? `ring-4 ring-${t.accent}-500 scale-95` : 'hover:scale-105'} bg-white/5 border-white/10 border shadow-sm`}>
                                <GridIcon className={`w-8 h-8 transition-colors ${isSelected ? `text-${t.accent}-400` : 'text-slate-500'}`} />
                                {isSelected && <div className={`absolute top-1 right-1 w-6 h-6 bg-${t.accent}-500 rounded-full flex items-center justify-center shadow-md`}><Check className="w-3.5 h-3.5 text-white"/></div>}
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => {setShowCaptchaModal(false); setSelectedGrids([]);}} className="text-sm font-bold transition-colors text-slate-400 hover:text-slate-200">Cancel</button>
                    <button onClick={handleCaptchaVerify} className={`px-6 py-2.5 bg-${t.accent}-600 text-white font-bold rounded-full hover:bg-${t.accent}-700 transition-all active:scale-95 shadow-md ${t.glow}`}>Verify Matrix</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN AUTH CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, type: "spring" }}
        className="w-full max-w-md glass-card p-0 overflow-hidden backdrop-blur-3xl z-10"
      >
        <div className="pt-10 pb-4 flex flex-col items-center justify-center">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${t.gradient} flex items-center justify-center shadow-lg ${t.glow} mb-4`}>
                <Hexagon className="w-8 h-8 text-white fill-white/20" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">{isLogin ? 'Welcome Back' : 'Join the Ecosystem'}</h2>
            <p className={`text-[10px] mt-1 font-black ${t.text} uppercase tracking-widest`}>{t.label}</p>
        </div>

        <div className="px-8 mb-6">
            <div className="flex relative p-1.5 rounded-2xl border bg-slate-900/60 border-slate-800/80">
                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-xl transition-all duration-300 ease-in-out bg-${t.accent}-600 shadow-md ${!isLogin ? 'translate-x-[calc(100%+0.75rem)]' : 'translate-x-0'}`} />
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
              {/* --- REGISTRATION FIELDS --- */}
              <>
                  {/* Full Name */}
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:${t.text}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <input type="text" name="name" placeholder="Full Name" required
                      value={formData.name} onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm bg-[#0f172a] border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60`}
                      style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                    />
                  </div>
                  {/* Phone Number */}
                  <div className="relative group">
                    <PhoneInput 
                      value={formData.phone} 
                      onChange={(num) => setFormData(prev => ({...prev, phone: num}))}
                      onBlur={() => checkUnique('phone', formData.phone)}
                      placeholder="Phone Number"
                      className={`!text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm !bg-[#0f172a] ${uniqueErrors.phone ? '!border-red-500/70' : '!border-slate-700/50'} !text-white hover:!bg-slate-900/60 !pr-10`}
                    />
                    {uniqueErrors.phone && <p className="text-red-400 text-xs mt-1.5 pl-2 font-medium">{uniqueErrors.phone}</p>}
                  </div>
                  {/* Date of Birth */}
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:${t.text}`}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <input type="date" name="dob" placeholder="Date of Birth" required
                      value={formData.dob} onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm bg-[#0f172a] border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60 [color-scheme:dark]`}
                      style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                    />
                  </div>
                  {/* Gender */}
                  <div className="relative group">
                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:${t.text}`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <select name="gender" required value={formData.gender} onChange={handleInputChange}
                      className={`w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm bg-[#0f172a] border-slate-700/50 text-white appearance-none cursor-pointer hover:bg-slate-900/60`}
                      style={{ backgroundColor: '#0f172a', color: formData.gender ? '#f1f5f9' : '#64748b' }}
                    >
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
            </motion.div>
          )}

          <div className="relative group">
            <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:${t.text}`}>
              <Mail className="w-5 h-5" />
            </div>
            <input 
              type="email" name="email" placeholder="Email ID" required 
              value={formData.email} onChange={handleInputChange}
              onBlur={() => !isLogin && checkUnique('email', formData.email)}
              className={`w-full pl-12 pr-4 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm bg-[#0f172a] ${!isLogin && uniqueErrors.email ? 'border-red-500/70' : 'border-slate-700/50'} text-white placeholder-slate-500 hover:bg-slate-900/60`} 
              style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
            />
            {!isLogin && uniqueErrors.email && <p className="text-red-400 text-xs mt-1.5 pl-2 font-medium">{uniqueErrors.email}</p>}
          </div>

          <div className="relative group">
            <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:${t.text}`}>
              <Lock className="w-5 h-5" />
            </div>
            <input 
              type={showPassword ? "text" : "password"} name="password" placeholder="Password" required 
              value={formData.password} onChange={handleInputChange} 
              className={`w-full pl-12 pr-12 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm bg-[#0f172a] border-slate-700/50 text-white placeholder-slate-500 hover:bg-slate-900/60`} 
              style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <button type="button" onClick={() => setShowPassword(!showPassword)} className={`transition-colors focus:outline-none text-slate-400 hover:${t.text}`}>
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

          {/* Confirm Password Field (registration only) */}
          <AnimatePresence>
              {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1">
                    <div className="relative group">
                      <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors text-slate-400 group-focus-within:${t.text}`}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <input
                        type={showConfirmPassword ? "text" : "password"} name="confirm_password" placeholder="Confirm Password" required
                        value={formData.confirm_password} onChange={handleInputChange}
                        className={`w-full pl-12 pr-12 py-4 text-sm rounded-2xl border outline-none focus:ring-2 focus:ring-${t.accent}-500/50 transition-all duration-300 backdrop-blur-sm bg-[#0f172a] ${formData.confirm_password && !passwordsMatch ? 'border-red-500/70' : formData.confirm_password && passwordsMatch ? 'border-emerald-500/70' : 'border-slate-700/50'} text-white placeholder-slate-500 hover:bg-slate-900/60`}
                        style={{ backgroundColor: '#0f172a', color: '#f1f5f9' }}
                      />
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={`transition-colors focus:outline-none text-slate-400 hover:${t.text}`}>
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {formData.confirm_password && (
                      <p className={`text-xs pl-2 font-medium transition-colors ${passwordsMatch ? 'text-emerald-500' : 'text-red-400'}`}>
                        {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </motion.div>
              )}
          </AnimatePresence>

          <div className={`flex w-full ${captchaAlign} transition-all duration-500`}>
            <div className="flex items-center space-x-4 p-3 pr-5 rounded-2xl border transition-all shadow-sm bg-slate-900/60 border-slate-700/50">
              <button type="button" onClick={handleCaptchaInitiate} 
                className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-inner transition-all focus:outline-none 
                ${captchaStatus === 'success' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' 
                : `bg-slate-800 border-slate-600 hover:border-${t.accent}-500 text-transparent hover:${t.text}`}`}>
                {captchaStatus === 'idle' && <ImageIcon className="w-4 h-4 opacity-50 text-slate-400" />}
                {captchaStatus === 'verifying' && <Loader2 className={`w-5 h-5 animate-spin text-${t.accent}-500`} />}
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
                            className={`peer w-4 h-4 appearance-none rounded border-2 transition-all checked:bg-${t.accent}-600 checked:border-${t.accent}-600 bg-slate-900/50 border-slate-600`} />
                        <Check className="w-3 h-3 text-white absolute left-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-sm font-medium transition-colors text-slate-500 group-hover:text-slate-300">Remember this device</span>
                </label>
                <button type="button" onClick={() => Swal.fire({
                    icon: 'info',
                    title: 'Secure Recovery',
                    text: 'A secure reset link has been dispatched to your registered enclave.',
                    background: '#060a14',
                    color: '#fff',
                    confirmButtonColor: t.accent === 'rose' ? '#e11d48' : '#6366f1'
                })} 
                    className={`text-sm font-bold transition-colors text-${t.accent}-500 hover:text-${t.accent}-400`}>Forgot Password?</button>
            </div>
          )}

          {!isLogin && (
              <label className="flex items-start space-x-3 cursor-pointer mt-4 group">
                  <div className="relative flex items-center mt-0.5">
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} 
                        className={`peer w-5 h-5 appearance-none rounded-md border-2 transition-all checked:bg-${t.accent}-600 checked:border-${t.accent}-600 bg-slate-900/50 border-slate-600`} />
                      <Check className="w-3.5 h-3.5 text-white absolute left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-xs leading-relaxed transition-colors text-slate-500 group-hover:text-slate-400">
                      I agree to the <a href="#" className={`font-bold hover:underline text-${t.accent}-500`}>Terms of Use</a> & <a href="#" className={`font-bold hover:underline text-${t.accent}-500`}>Privacy Policy</a>. I consent to my data being irreversibly hashed to the ledger.
                  </span>
              </label>
          )}

          <button 
            type="submit" 
            disabled={loading || captchaStatus !== 'success' || (!isLogin && (!termsAccepted || !isPasswordValid || !passwordsMatch || !!uniqueErrors.email || !!uniqueErrors.phone))} 
            className={`w-full mt-6 py-4 rounded-2xl font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center text-sm tracking-wide uppercase
                ${(loading || captchaStatus !== 'success' || (!isLogin && (!termsAccepted || !isPasswordValid || !passwordsMatch || !!uniqueErrors.email || !!uniqueErrors.phone))) 
                  ? 'opacity-50 cursor-not-allowed shadow-none bg-slate-600' 
                  : `bg-gradient-to-r ${t.gradient} hover:brightness-110 ${t.glow} hover:shadow-${t.accent}-500/50 hover:-translate-y-0.5 active:translate-y-0`}`}
          >
            {loading ? <><Loader2 className="w-5 h-5 mr-3 animate-spin" /> Handshaking...</> : isLogin ? 'Initialize Session' : 'Create Secure Account'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
