import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { User, LogOut, ShieldCheck, Activity, Briefcase, Code, CheckCircle, Clock, Building2, Calendar, AlertOctagon, KeyRound, Lock, Plus, X, BookOpen, Info, Bell, GraduationCap, Hexagon, Loader2, Sparkles, Phone, Check, Save, Settings, ChevronDown, Download, MessageSquare, Send, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function EmployeeDashboard({ user, setUser, onBack }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [analytics, setAnalytics] = useState({ average_tenure: 0, remarks: 'Loading...' });
  const [noticeboardJobs, setNoticeboardJobs] = useState([]);
  const [verifiedJobs, setVerifiedJobs] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Registered Employers & Notifications
  const [registeredEmployers, setRegisteredEmployers] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // CV Data State
  const [cvData, setCvData] = useState({ about: "", skills: [], languages: [], hobbies: [], education: [], experience: [] });
  const [personalInfo, setPersonalInfo] = useState({ gender: '', countryCode: '+91', mobile: '', dob: '' });
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [aboutSavedStatus, setAboutSavedStatus] = useState('');
  const [isIncognito, setIsIncognito] = useState(false);
  const [isVerified, setIsVerified] = useState(true);

  // Profile Avatar Dropdown & Modal
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const profileDropdownRef = useRef(null);

  // Form States
  const [newItem, setNewItem] = useState({ type: '', value: '' });
  const [showExpForm, setShowExpForm] = useState(false);
  const [newExp, setNewExp] = useState({ role: '', firm: '', start: '', end: '', current: false });
  const [showEduForm, setShowEduForm] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '', score: '' });

  // Chat State (WebSockets)
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [activeChatFirm, setActiveChatFirm] = useState(null); // The company we're chatting with
  const [activeChatHRId, setActiveChatHRId] = useState(null); // The actual employer ID
  const [chatHistory, setChatHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const wsRef = useRef(null);
  const chatScrollRef = useRef(null);

  // AI Quiz States
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [generatingSkill, setGeneratingSkill] = useState(null);

  // Load Data
  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_BASE}/api/analytics/employee/${user.id}`).then(res => setAnalytics(res.data)).catch(console.error);
      axios.get(`${API_BASE}/api/secure_search/${user.id}`)
        .then(res => {
          if (res.data) {
            const loadedExp = res.data.experience || [];
            setVerifiedJobs(loadedExp.filter(exp => exp.is_verified));
            setCvData({
              about: res.data.about || "",
              skills: res.data.skills || [],
              languages: res.data.languages || [],
              hobbies: res.data.hobbies || [],
              education: res.data.education || [],
              experience: loadedExp,
              academic_standing: res.data.academic_standing || { grade: "N/A", description: "No Data", color: "#64748b" },
              verified_skills: res.data.verified_skills || []
            });
            setIsIncognito(res.data.incognito_mode || false);
            if (res.data.personal_info) {
              setPersonalInfo(res.data.personal_info);
            }
          }
        }).catch(console.error);

      axios.get(`${API_BASE}/api/hr/noticeboard`).then(res => setNoticeboardJobs(res.data.jobs)).catch(console.error);
      axios.get(`${API_BASE}/api/hr/employers_list`).then(res => setRegisteredEmployers(res.data.employers)).catch(console.error);
      axios.get(`${API_BASE}/api/notifications/${user.id}`).then(res => setNotifications(res.data.notifications || [])).catch(console.error);
    }
  }, [user]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markNotificationsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n._id);
    if (unreadIds.length === 0) return;
    try {
      await axios.patch(`${API_BASE}/api/notifications/read`, unreadIds);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) { console.error(err); }
  };

  // --- PROFILE LOGIC & STRICT LIMITS ---
  const handleAddTag = (category, limit) => {
    if (cvData[category].length >= limit) {
      alert("Please delete any previous one before adding a new one");
      return;
    }
    const val = newItem.value.trim();
    if (!val) return;
    const isDuplicate = cvData[category].some(item => item.toLowerCase() === val.toLowerCase());
    if (isDuplicate) { alert(`"${val}" is already in your ${category}.`); return; }
    setCvData({ ...cvData, [category]: [...cvData[category], val] });
    setNewItem({ type: '', value: '' });
  };

  const removeItem = (category, index) => {
    setCvData({ ...cvData, [category]: cvData[category].filter((_, i) => i !== index) });
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`${API_BASE}/api/profile/customize/${user.id}`, {
        about: cvData.about, skills: cvData.skills, languages: cvData.languages, hobbies: cvData.hobbies
      });
      await axios.put(`${API_BASE}/api/profile/education/${user.id}`, { education: cvData.education });
      await axios.put(`${API_BASE}/api/profile/personal/${user.id}`, { personal_info: personalInfo });
      alert("Profile saved successfully to the database!");
    } catch (err) { alert(err.response?.data?.detail || "Failed to save profile."); }
  };

  const handleSaveAbout = async () => {
    try {
      await axios.put(`${API_BASE}/api/profile/customize/${user.id}`, {
        about: cvData.about, skills: cvData.skills, languages: cvData.languages, hobbies: cvData.hobbies
      });
      setAboutSavedStatus('Saved!');
      setTimeout(() => setAboutSavedStatus(''), 2000);
    } catch (err) { alert("Failed to save bio."); }
  };

  const handleSavePersonalInfo = async () => {
    if (personalInfo.mobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits.");
      return;
    }
    try {
      await axios.put(`${API_BASE}/api/profile/personal/${user.id}`, { personal_info: personalInfo });
      setIsEditingPersonal(false);
      alert("Personal information updated successfully.");
    } catch (err) { alert("Failed to update personal info."); }
  };

  const handleAddEducation = (e) => {
    e.preventDefault();
    const isDuplicate = cvData.education.some(
      edu => edu.degree.toLowerCase() === newEdu.degree.trim().toLowerCase() &&
        edu.institution.toLowerCase() === newEdu.institution.trim().toLowerCase()
    );
    if (isDuplicate) { alert("You have already added this degree from this institution."); return; }
    setCvData({ ...cvData, education: [{ ...newEdu, id: Date.now() }, ...cvData.education] });
    setNewEdu({ degree: '', institution: '', year: '', score: '' });
    setShowEduForm(false);
  };

  // --- EXPERIENCE LOGIC (BRIDGE BLOCKER) ---
  const handleAddExperience = async (e) => {
    e.preventDefault();
    if (!newExp.firm) { alert("Please select a company from the dropdown."); return; }
    if (newExp.current && cvData.experience.some(exp => exp.end_date === 'Present')) {
      alert("🚨 You cannot have two active jobs. Please Raise a Relieve Request for your current employer before onboarding to a new one.");
      return;
    }
    const pendingExp = { id: Date.now(), role: newExp.role, firm: newExp.firm, start_date: newExp.start, end_date: newExp.current ? 'Present' : newExp.end, is_verified: false };
    setCvData({ ...cvData, experience: [pendingExp, ...cvData.experience] });
    try {
      await axios.post(`${API_BASE}/api/hr/apply`, {
        employee_id: user.id, employee_name: user.name, employer_id: `PENDING_SEARCH`,
        company_name: newExp.firm, job_title: newExp.role, type: "onboarding"
      });
      alert(`Onboarding approval request sent to ${newExp.firm} HR.`);
    } catch (err) { console.error(err); }
    setNewExp({ role: '', firm: '', start: '', end: '', current: false });
    setShowExpForm(false);
  };

  const handleApply = async (job) => {
    if (!window.confirm(`Are you sure you want to officially apply for ${job.job_title} at ${job.company_name}?`)) return;
    try {
      await axios.post(`${API_BASE}/api/hr/apply`, {
        employee_id: user.id, employee_name: user.name, employer_id: job.employer_id,
        company_name: job.company_name, job_title: job.job_title, type: "application"
      });
      alert(`Success! Application submitted to ${job.company_name}.`);
    } catch (err) { alert("Error submitting application."); }
  };

  const handleRelieveRequest = async (firm) => {
    if (!window.confirm(`Are you absolutely sure you want to leave ${firm} and apply for a Relieve Request?`)) return;
    try {
      await axios.post(`${API_BASE}/api/hr/request_relieve`, { employee_id: user.id, employee_name: user.name, company_name: firm });
      alert(`Relieve request securely dispatched to ${firm} HR.`);
    } catch (err) { alert("Failed to send relieve request."); }
  };

  // --- PASSWORD SECURITY LOGIC ---
  const calculatePasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (/[A-Z]/.test(pwd)) score += 25;
    if (/[a-z]/.test(pwd)) score += 25;
    if (/[0-9!@#$%^&*]/.test(pwd)) score += 25;
    return score;
  };
  const pwdStrength = calculatePasswordStrength(passwordForm.newPassword);
  const passwordsMatch = passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.oldPassword === passwordForm.newPassword) { alert("You cannot change your password to your current password."); return; }
    if (pwdStrength < 100) { alert("Please meet all password complexity requirements."); return; }
    if (!passwordsMatch) { alert("Passwords do not match."); return; }
    try {
      await axios.post(`${API_BASE}/api/auth/change_password/${user.id}`, {
        old_password: passwordForm.oldPassword, new_password: passwordForm.newPassword, confirm_password: passwordForm.confirmPassword
      });
      alert("Password updated securely!");
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { alert(err.response?.data?.detail || "Failed to update password."); }
  };

  // --- Real-Time Chat Logic (Enterprise P2P) ---
  const initWebSocket = () => {
    if (wsRef.current) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = API_BASE.replace(/^http(s?):\/\//, '');
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${user.id}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setChatHistory(prev => [...prev, msg]);
    };
    wsRef.current.onclose = () => { wsRef.current = null; };
    wsRef.current.onerror = (err) => { console.error("WebSocket Error:", err); };
  };

  const fetchChatHistory = async (hrId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/chat/history/${user.id}/${hrId}`);
      setChatHistory(res.data.messages || []);
    } catch (err) { console.error("Failed to fetch chat history:", err); }
  };

  const openChatWithFirm = async (firmName) => {
    try {
      const res = await axios.get(`${API_BASE}/api/hr/employers_list`);
      const employerQuery = await axios.get(`${API_BASE}/api/openclaw/job_matches/${user.id}`);
    } catch (e) { }

    const simulatedEmployerId = `COMP_${firmName.replace(/\s/g, '').toUpperCase()}`;

    setActiveChatFirm(firmName);
    setActiveChatHRId(simulatedEmployerId);
    initWebSocket();
    fetchChatHistory(simulatedEmployerId);
    setChatDrawerOpen(true);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const payload = {
      receiver_id: activeChatHRId,
      message: currentMessage
    };

    wsRef.current.send(JSON.stringify(payload));
    setCurrentMessage("");
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatDrawerOpen]);


  // --- AI SKILL VERIFICATION LOGIC ---
  const handleGenerateQuiz = async (skill) => {
    setGeneratingSkill(skill);
    try {
      const res = await axios.post(`${API_BASE}/api/skills/generate_quiz`, { skill }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setQuizData(res.data);
      setQuizAnswers({});
      setShowQuizModal(true);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to generate AI Quiz.");
    } finally {
      setGeneratingSkill(null);
    }
  };

  const handleVerifyQuiz = async (e) => {
    e.preventDefault();
    if (Object.keys(quizAnswers).length < quizData.questions.length) {
      alert("Please select an answer for all questions.");
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/api/skills/verify_quiz`, {
        skill: quizData.skill,
        answers: quizAnswers,
        correct_answers: quizData.validation_key
      }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      alert(res.data.message);
      if (res.data.passed) {
        setCvData(prev => ({ ...prev, verified_skills: [...(prev.verified_skills || []), quizData.skill] }));
      }
      setShowQuizModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit AI Quiz.");
    }
  };

  const toggleIncognito = async () => {
    try {
      const res = await axios.put(`${API_BASE}/api/profile/incognito/${user.id}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setIsIncognito(res.data.incognito_mode);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to toggle Incognito Mode.");
    }
  };

  // --- RESUME EXPORT (PDF) ---
  const exportResume = () => {
    // We dynamically generate an invisible HTML container with the verified data, styled beautifully, to convert to PDF.
    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6;">
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; mb-6">
          <h1 style="color: #0f172a; margin: 0; font-size: 28px;">${user?.name}</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Blockchain Verified Profile • UID: ${user?.id}</p>
        </div>
        
        <h2 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 30px; font-size: 18px;">About Summary</h2>
        <p style="font-size: 14px; text-align: justify;">${cvData.about || 'No summary provided.'}</p>
        
        <h2 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 30px; font-size: 18px;">Skills & Competencies</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${cvData.skills.map(s => `<span style="background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; border: 1px solid #cbd5e1;">${s}</span>`).join('') || '<span style="font-size:14px">None listed</span>'}
        </div>

        <h2 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 30px; font-size: 18px;">Verified Work Experience</h2>
        ${verifiedJobs.length === 0 ? '<p style="font-size: 14px;">No blockchain verified jobs found.</p>' : ''}
        ${verifiedJobs.map(job => `
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
              <h3 style="margin: 0; color: #0284c7; font-size: 16px;">${job.role}</h3>
              <span style="font-size: 12px; color: #10b981; font-weight: bold; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px;">✓ Verified Ledger</span>
            </div>
            <p style="margin: 0; font-weight: bold; font-size: 14px; color: #475569;">${job.firm}</p>
            <p style="margin: 0; font-size: 12px; color: #64748b;">${job.start_date} to ${String(job.end_date).toLowerCase() === 'present' ? 'Present' : job.end_date}</p>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #94a3b8; font-family: monospace;">Tx Hash: ${job.blockchain_hash}</p>
          </div>
        `).join('')}

        <h2 style="color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 30px; font-size: 18px;">Education History</h2>
        ${cvData.education.length === 0 ? '<p style="font-size: 14px;">No education history provided.</p>' : ''}
        ${cvData.education.map(edu => `
          <div style="margin-bottom: 15px;">
             <h3 style="margin: 0; color: #0f172a; font-size: 16px;">${edu.degree}</h3>
             <p style="margin: 0; font-weight: bold; font-size: 14px; color: #475569;">${edu.institution}</p>
             <p style="margin: 0; font-size: 12px; color: #64748b;">Class of ${edu.year} • Score: ${edu.score}%</p>
          </div>
        `).join('')}
      </div>
    `;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `${user?.name.replace(/\\s/g, '_')}_CETS_Verified_Resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // --- RENDER ---
  return (
    <div className="flex min-h-screen animated-gradient-bg text-slate-100 relative overflow-hidden">

      {/* DECORATIVE FLOATING ORBS */}
      <div className="orb orb-primary w-96 h-96 -top-48 -left-48" />
      <div className="orb orb-accent w-80 h-80 top-1/2 -right-40" />
      <div className="orb orb-cyan w-64 h-64 bottom-0 left-1/3" />

      {/* SIDEBAR */}
      <div className="w-72 flex flex-col glass-sidebar z-10 relative">
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Hexagon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white">CETS</span>
          </div>

          <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-4">Main Menu</p>
          <nav className="space-y-1.5">
            {[
              { id: 'profile', icon: User, label: 'My Dashboard' },
              { id: 'ledger', icon: ShieldCheck, label: 'Verified Ledger' },
              { id: 'noticeboard', icon: Briefcase, label: 'Job Search' },
              { id: 'notifications', icon: Bell, label: 'Notifications' },
              //{ id: 'security', icon: KeyRound, label: 'Security' },
            ].map((item) => (
              <button key={item.id} onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'notifications') markNotificationsRead();
              }} className={`w-full flex items-center p-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id ? 'sidebar-tab-active' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}>
                <item.icon className={`mr-3 w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-600'}`} /> {item.label}
                {item.id === 'notifications' && unreadCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-8 border-t border-white/[0.04]">
          <button onClick={() => setUser(null)} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-medium">
            <LogOut className="mr-3 w-5 h-5" /> Log Out
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">

        {/* HEADER */}
        <header className="h-20 px-10 flex items-center justify-between glass-header sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <Hexagon className="w-6 h-6 text-indigo-500" />
            <span className="text-xl font-black tracking-tighter text-white">CETS</span>
          </div>

          <div className="flex items-center space-x-6">
            {/* NOTIFICATION BELL */}
            <button onClick={() => { setActiveTab('notifications'); markNotificationsRead(); }} className={`relative p-2.5 rounded-full transition-all bg-white/[0.06] hover:bg-white/[0.1] ${unreadCount > 0 ? 'glow-pulse' : ''}`}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-slate-900"></span>
                </span>
              )}
            </button>

            {/* PROFILE AVATAR DROPDOWN */}
            <div className="relative" ref={profileDropdownRef}>
              <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center hover:bg-white/[0.02] p-1 rounded-full transition-colors group cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-indigo-500/30 group-hover:border-indigo-400/60 transition-all">
                  <User className="text-indigo-400 w-5 h-5" />
                </div>
                <ChevronDown className={`w-4 h-4 ml-2 text-slate-500 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl glass-card overflow-hidden !bg-slate-900/95 border border-white/[0.08]">
                    <div className="p-3 border-b border-white/[0.06]">
                      <p className="text-sm font-bold truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">{user?.id}</p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                        <User className="w-4 h-4 mr-3 text-slate-500" /> View Profile
                      </button>
                      <button onClick={() => { setShowEditProfileModal(true); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                        <Settings className="w-4 h-4 mr-3 text-slate-500" /> Edit Profile
                      </button>
                      <button onClick={() => { setActiveTab('security'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                        <KeyRound className="w-4 h-4 mr-3 text-slate-500" /> Security
                      </button>
                      <button onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                        <Briefcase className="w-4 h-4 mr-3 text-slate-500" /> Home
                      </button>
                    </div>
                    <div className="p-2 border-t border-white/[0.06]">
                      <button onClick={() => { setUser(null); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-all font-medium">
                        <LogOut className="w-4 h-4 mr-3" /> Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="p-10">
          {/* WELCOME BANNER */}
          <div className="w-full p-6 mb-8 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 backdrop-blur-sm">
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Welcome to your CETS Portal, {user?.name}! 👋</h1>
            <p className="mt-2 text-slate-400 font-medium flex items-center gap-2"><Lock className="w-4 h-4 text-indigo-400" /> End-to-End Blockchain Encryption Active</p>
          </div>

          {/* ANALYTICS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="stat-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg. Employment Tenure</p>
              <h3 className="text-3xl font-black text-indigo-400">{analytics.average_tenure} <span className="text-base font-bold text-slate-500">Years</span></h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">{analytics.remarks}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Academic Standing</p>
              <h3 className="text-3xl font-black" style={{ color: cvData.academic_standing?.color || "#64748b" }}>{cvData.academic_standing?.grade || "N/A"}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Remarks: {cvData.academic_standing?.description || "No Data"}</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Profile Completion</p>
              <h3 className="text-3xl font-black text-emerald-400">{Math.min(100, Math.round(((cvData.about.length > 0 ? 25 : 0) + (cvData.skills.length > 0 ? 25 : 0) + (cvData.education.length > 0 ? 25 : 0) + (cvData.experience.length > 0 ? 25 : 0))))}%</h3>
              <div className="strength-bar mt-2"><div className="strength-bar-fill bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${Math.min(100, ((cvData.about.length > 0 ? 25 : 0) + (cvData.skills.length > 0 ? 25 : 0) + (cvData.education.length > 0 ? 25 : 0) + (cvData.experience.length > 0 ? 25 : 0)))}%` }} /></div>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Blockchain Records</p>
              <h3 className="text-3xl font-black text-cyan-400">{verifiedJobs.length}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">Immutable jobs on ledger</p>
            </div>
            <div className="stat-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Login</p>
              <h3 className="text-lg font-black text-amber-400">{user?.last_login ? new Date(user.last_login).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'First Session'}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium font-mono">IP: {user?.last_login_ip || 'N/A'}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">

            {/* TAB 1: PROFILE & LIMITS */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">

                <div className="glass-card p-8 flex justify-between items-start">
                  <div><h2 className="text-3xl font-black mb-2 flex items-center gap-3">Professional Profile {isVerified && <span className="verified-badge"><ShieldCheck className="w-3 h-3" /> Verified Identity</span>}</h2><p className="text-slate-500 text-sm">Manage your CV, Skills, and Analytics.</p></div>
                  <div className="flex gap-3">
                    <button onClick={exportResume} className="btn-premium px-6 py-3 rounded-xl text-sm flex items-center shadow-lg transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)' }} ><Download className="w-4 h-4 mr-2" /> Export to PDF</button>
                    <button onClick={handleSaveProfile} className="btn-premium px-8 py-3 rounded-xl text-sm flex items-center shadow-lg hover:shadow-indigo-500/25"><Save className="w-4 h-4 mr-2" /> Save Full Profile</button>
                  </div>
                </div>



                <div className="glass-card p-8">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center"><User className="w-4 h-4 mr-2 text-indigo-400" /> About Myself</label>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${cvData.about.length > 480 ? 'bg-rose-500/10 text-rose-400' : 'bg-white/[0.06] text-slate-400'}`}>{cvData.about.length} / 500 Chars</span>
                  </div>
                  <textarea maxLength={500} value={cvData.about} onChange={(e) => setCvData({ ...cvData, about: e.target.value })} placeholder="Write a professional summary (Max 500 characters)..." className="glass-input w-full min-h-[120px] leading-relaxed resize-none mb-3" />
                  <div className="flex justify-end items-center gap-3">
                    {aboutSavedStatus && <span className="text-emerald-400 text-sm font-bold flex items-center"><Check className="w-4 h-4 mr-1" /> {aboutSavedStatus}</span>}
                    <button onClick={handleSaveAbout} className="btn-premium px-5 py-2 rounded-xl text-sm flex items-center shadow"><Save className="w-4 h-4 mr-2" /> Save Bio</button>
                  </div>
                </div>

                {/* STRICT ARRAYS: SKILLS, LANGS, HOBBIES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Skills (Max 20) */}
                  <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold flex items-center"><Code className="w-4 h-4 mr-2 text-indigo-400" /> Skills</h3><span className="text-[10px] font-bold text-slate-500">Limit: {cvData.skills.length}/20</span></div>
                    <div className="flex flex-wrap gap-1.5 mb-4 min-h-[2rem]">
                      {cvData.skills.map((skill, i) => {
                        const isVerifiedSkill = (cvData.verified_skills || []).includes(skill);
                        return (
                          <span key={i} className={`tag-pill ${isVerifiedSkill ? '!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-400' : ''}`}>
                            {skill}
                            {isVerifiedSkill && <ShieldCheck className="w-3 h-3 text-emerald-400 ml-1 inline" />}
                            {!isVerifiedSkill && <button disabled={generatingSkill === skill} onClick={() => handleGenerateQuiz(skill)} className="ml-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full hover:bg-indigo-500 hover:text-white transition-colors disabled:opacity-50">{generatingSkill === skill ? 'Gen...' : 'Verify'}</button>}
                            <X className="w-3 h-3 ml-1 cursor-pointer hover:text-rose-400 transition-colors inline" onClick={() => removeItem('skills', i)} />
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex mt-auto">
                      <input type="text" placeholder="Add Skill" value={newItem.type === 'skills' ? newItem.value : ''} onChange={(e) => setNewItem({ type: 'skills', value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddTag('skills', 20)} className="glass-input flex-1 p-2 text-xs rounded-r-none" />
                      <button onClick={() => handleAddTag('skills', 20)} className="px-3 bg-indigo-500/20 text-indigo-400 rounded-r-xl border border-l-0 border-white/[0.08] hover:bg-indigo-500/30 transition-colors"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Languages (Max 10) */}
                  <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold flex items-center"><BookOpen className="w-4 h-4 mr-2 text-purple-400" /> Languages</h3><span className="text-[10px] font-bold text-slate-500">Limit: {cvData.languages.length}/10</span></div>
                    <div className="flex flex-wrap gap-1.5 mb-4 min-h-[2rem]">
                      {cvData.languages.map((lang, i) => <span key={i} className="tag-pill !bg-purple-500/10 !text-purple-400 !border-purple-500/15">{lang} <X className="w-3 h-3 cursor-pointer hover:text-rose-400 transition-colors" onClick={() => removeItem('languages', i)} /></span>)}
                    </div>
                    <div className="flex mt-auto">
                      <input type="text" placeholder="Add Lang" value={newItem.type === 'languages' ? newItem.value : ''} onChange={(e) => setNewItem({ type: 'languages', value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddTag('languages', 10)} className="glass-input flex-1 p-2 text-xs rounded-r-none" />
                      <button onClick={() => handleAddTag('languages', 10)} className="px-3 bg-purple-500/20 text-purple-400 rounded-r-xl border border-l-0 border-white/[0.08] hover:bg-purple-500/30 transition-colors"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Hobbies (Max 5) */}
                  <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold flex items-center"><Activity className="w-4 h-4 mr-2 text-emerald-400" /> Hobbies</h3><span className="text-[10px] font-bold text-slate-500">Limit: {cvData.hobbies.length}/5</span></div>
                    <div className="flex flex-wrap gap-1.5 mb-4 min-h-[2rem]">
                      {cvData.hobbies.map((hob, i) => <span key={i} className="tag-pill !bg-emerald-500/10 !text-emerald-400 !border-emerald-500/15">{hob} <X className="w-3 h-3 cursor-pointer hover:text-rose-400 transition-colors" onClick={() => removeItem('hobbies', i)} /></span>)}
                    </div>
                    <div className="flex mt-auto">
                      <input type="text" placeholder="Add Hobby" value={newItem.type === 'hobbies' ? newItem.value : ''} onChange={(e) => setNewItem({ type: 'hobbies', value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddTag('hobbies', 5)} className="glass-input flex-1 p-2 text-xs rounded-r-none" />
                      <button onClick={() => handleAddTag('hobbies', 5)} className="px-3 bg-emerald-500/20 text-emerald-400 rounded-r-xl border border-l-0 border-white/[0.08] hover:bg-emerald-500/30 transition-colors"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>

                {/* EDUCATION HISTORY */}
                <div className="glass-card p-8">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-dashed border-white/[0.08]">
                    <h3 className="text-xl font-bold flex items-center"><GraduationCap className="w-6 h-6 mr-3 text-purple-400" /> Education History</h3>
                    <button onClick={() => setShowEduForm(!showEduForm)} className="text-sm font-bold text-purple-400 flex items-center hover:text-purple-300 bg-purple-500/10 px-4 py-2 rounded-full transition-colors"><Plus className="w-4 h-4 mr-1" /> Add</button>
                  </div>
                  <AnimatePresence>
                    {showEduForm && (
                      <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddEducation} className="mb-6 overflow-hidden">
                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative md:col-span-2"><BookOpen className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="text" placeholder="Degree" required value={newEdu.degree} onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })} className="glass-input w-full pl-10" /></div>
                            <div className="relative"><Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                              <select required value={newEdu.year} onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })} className="glass-input w-full pl-10 appearance-none">
                                <option value="">Year</option>
                                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => <option key={y} value={y}>{y}</option>)}
                              </select>
                            </div>
                            <div className="relative md:col-span-2"><Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="text" placeholder="Institution Name" required value={newEdu.institution} onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })} className="glass-input w-full pl-10" /></div>
                            <div className="relative"><Activity className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="number" placeholder="Marks (%)" required value={newEdu.score} onChange={(e) => setNewEdu({ ...newEdu, score: e.target.value })} className="glass-input w-full pl-10" /></div>
                          </div>
                          <div className="flex justify-end space-x-3 mt-4"><button type="button" onClick={() => setShowEduForm(false)} className="px-5 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">Cancel</button><button type="submit" className="btn-premium px-5 py-2 rounded-full text-sm">Save</button></div>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                  <div className="space-y-3">
                    {cvData.education.length === 0 ? <p className="text-center text-slate-500 py-4 italic">No education details added.</p> : cvData.education.map((edu, idx) => (
                      <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] border-l-4 border-l-purple-500/50 flex justify-between items-center hover:bg-white/[0.05] transition-colors">
                        <div><h4 className="font-bold text-lg">{edu.degree}</h4><p className="text-slate-400 font-medium text-sm">{edu.institution}</p><p className="text-xs text-slate-500 mt-1 font-mono">Class of {edu.year} • Score: {edu.score}%</p></div>
                        <button onClick={() => setCvData({ ...cvData, education: cvData.education.filter(e => e.id !== edu.id) })} className="p-2 text-slate-500 hover:text-rose-400 transition-colors"><X className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: VERIFIED LEDGER */}
            {activeTab === 'ledger' && (
              <motion.div key="ledger" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                <div className="glass-card p-8 flex justify-between items-center bg-gradient-to-r from-emerald-500/[0.06] to-teal-500/[0.06]">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 flex items-center"><ShieldCheck className="mr-3 text-emerald-400" /> Official Employment Ledger</h2>
                    <p className="text-slate-500 text-sm">Blockchain-verified timeline. Active jobs require a Relieve Request to close.</p>
                  </div>
                  <button onClick={() => setShowExpForm(!showExpForm)} className="btn-premium px-6 py-2 rounded-full text-sm" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>Add New Job</button>
                </div>

                {/* ADD NEW JOB BLOCK */}
                <AnimatePresence>
                  {showExpForm && (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddExperience} className="mb-2 overflow-hidden">
                      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                        <p className="text-xs text-amber-400 font-bold mb-2 flex items-center"><Info className="w-3 h-3 mr-1" /> You must select an existing registered employer for Onboarding Verification.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative"><Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="text" placeholder="Job Title" required value={newExp.role} onChange={(e) => setNewExp({ ...newExp, role: e.target.value })} className="glass-input w-full pl-10" /></div>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <select required value={newExp.firm} onChange={(e) => setNewExp({ ...newExp, firm: e.target.value })} className="glass-input w-full pl-10 appearance-none">
                              <option value="" disabled>Select Registered Company...</option>
                              {registeredEmployers.map((emp, i) => <option key={i} value={emp}>{emp}</option>)}
                            </select>
                          </div>
                          <div className="relative"><Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input type="date" required value={newExp.start} onChange={(e) => setNewExp({ ...newExp, start: e.target.value })} className="glass-input w-full pl-10" /></div>
                          <div className="relative flex items-center space-x-4">
                            {!newExp.current && <input type="date" required={!newExp.current} value={newExp.end} onChange={(e) => setNewExp({ ...newExp, end: e.target.value })} className="glass-input flex-1" />}
                            <label className="flex items-center text-sm cursor-pointer whitespace-nowrap"><input type="checkbox" checked={newExp.current} onChange={(e) => setNewExp({ ...newExp, current: e.target.checked, end: '' })} className="mr-2 w-4 h-4 accent-indigo-500" /> Current Job</label>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-4">
                          <button type="button" onClick={() => setShowExpForm(false)} className="px-5 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">Cancel</button>
                          <button type="submit" className="btn-premium px-5 py-2 rounded-full text-sm" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>Send for Verification</button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {cvData.experience.length === 0 ? (
                    <p className="text-center text-slate-500 py-10 border border-dashed rounded-3xl border-white/[0.08]">No verified jobs found on the blockchain.</p>
                  ) : (
                    cvData.experience.map((job, idx) => {
                      const isActive = job.end_date && String(job.end_date).trim().toLowerCase() === 'present';

                      return (
                        <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={`glass-card p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4 ${!job.is_verified ? '!border-amber-500/30' : ''}`}>
                          <div>
                            <div className="flex items-center space-x-3 mb-1">
                              <h3 className={`text-xl font-bold ${job.is_verified ? 'text-emerald-400' : 'text-amber-400'}`}>{job.firm}</h3>
                              {isActive && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Active Timeline</span>}
                              {!job.is_verified && <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">Pending Verification</span>}
                            </div>
                            <p className="font-medium text-lg">{job.role}</p>
                            <p className="text-sm text-slate-500 font-mono mt-2 flex items-center"><Calendar className="w-4 h-4 mr-2" /> {job.start_date} — {isActive ? 'Present' : job.end_date}</p>
                          </div>

                          {isActive ? (
                            <div className="flex flex-col md:flex-row gap-2">
                              <button onClick={() => openChatWithFirm(job.firm)} className="flex items-center px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white font-bold rounded-xl transition-all text-sm whitespace-nowrap">
                                <MessageSquare className="w-4 h-4 mr-2" /> Message HR
                              </button>
                              <button onClick={() => handleRelieveRequest(job.firm)} className="flex items-center px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white font-bold rounded-xl transition-all text-sm whitespace-nowrap">
                                <AlertOctagon className="w-4 h-4 mr-2" /> Relieve Request
                              </button>
                            </div>
                          ) : (
                            <div className="text-right">
                              {job.is_verified && <p className="hash-display max-w-[220px]"><Lock className="w-3 h-3 inline mr-1" />Hash: {job.blockchain_hash}</p>}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 3: NOTICEBOARD */}
            {activeTab === 'noticeboard' && (
              <motion.div key="noticeboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-4">
                {noticeboardJobs.length === 0 ? (
                  <p className="text-center text-slate-500 py-10 border border-dashed rounded-3xl border-white/[0.08]">No active job postings available.</p>
                ) : (
                  noticeboardJobs.map((job, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="glass-card p-8">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">{job.job_title}</h3>
                          <p className="font-medium flex items-center text-slate-400"><Building2 className="w-4 h-4 mr-1 text-indigo-400" /> {job.company_name}</p>
                          <div className="flex flex-wrap gap-2 mt-4">
                            <span className="tag-pill">Exp: {job.experience}</span>
                            <span className="tag-pill !bg-purple-500/10 !text-purple-400 !border-purple-500/15">Skills: {job.qualification || 'N/A'}</span>
                            <span className="tag-pill !bg-emerald-500/10 !text-emerald-400 !border-emerald-500/15">Mode: {job.location}</span>
                          </div>
                        </div>
                        <button onClick={() => handleApply(job)} className="btn-premium px-8 py-3 rounded-xl text-sm whitespace-nowrap">Apply Now</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* TAB 4: SECURITY & PASSWORD */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-xl space-y-6">

                {/* INCOGNITO MODE CARD */}
                <div className="glass-card p-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"><EyeOff className="mr-3 text-emerald-400 w-6 h-6" /> Incognito Browsing</h2>
                    <button onClick={toggleIncognito} className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-inner ${isIncognito ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isIncognito ? 'translate-x-8 shadow-md' : 'translate-x-1 shadow-sm'}`} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed"><strong className="text-emerald-400">Zero-Knowledge mode.</strong> When enabled, employers discovering you via search will NOT see your Name, Email, or past Employer names. They will only see an anonymous profile with your Skills, Match Scores, and Analytics.</p>
                </div>

                <div className="glass-card p-8">
                  <h2 className="text-2xl font-bold flex items-center mb-6"><Lock className="mr-3 text-indigo-400" /> Change Password</h2>

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
                      <input type="password" required value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="glass-input w-full mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                      <input type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="glass-input w-full mt-1" />

                      <div className="mt-2">
                        <div className="strength-bar">
                          <div className={`strength-bar-fill ${pwdStrength === 100 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${pwdStrength}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 special/number.</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        Confirm New Password
                        {passwordForm.confirmPassword.length > 0 && (
                          <span className={passwordsMatch ? "text-emerald-400" : "text-rose-400"}>
                            {passwordsMatch ? "Passwords Match!" : "Passwords Do Not Match"}
                          </span>
                        )}
                      </label>
                      <input type="password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="glass-input w-full mt-1" />
                    </div>
                    <button disabled={pwdStrength < 100 || !passwordsMatch} type="submit" className="btn-premium w-full mt-4 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none">Update Password</button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB 5: NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                <div className="glass-card p-8 flex justify-between items-center bg-gradient-to-r from-indigo-500/[0.06] to-purple-500/[0.06]">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 flex items-center"><Bell className="mr-3 text-indigo-400" /> System Notifications</h2>
                    <p className="text-slate-500 text-sm">Stay updated with onboarding, relieve requests, and career alerts.</p>
                  </div>
                  <div className="bg-white/[0.06] px-4 py-2 rounded-full text-xs font-bold text-slate-400 border border-white/[0.08]">
                    Total: {notifications.length} Alerts
                  </div>
                </div>

                <div className="space-y-4">
                  {notifications.length === 0 ? (
                    <div className="text-center py-20 glass-card border-dashed">
                      <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                      <p className="text-slate-500 italic">No system notifications found at this time.</p>
                    </div>
                  ) : (
                    notifications.slice().reverse().map((n, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        className={`glass-card p-6 flex items-start gap-4 border-l-4 transition-all hover:bg-white/[0.04] ${!n.is_read ? 'border-l-indigo-500 bg-indigo-500/[0.03]' : 'border-l-slate-700 opacity-80'}`}
                      >
                        <div className={`p-2 rounded-lg ${!n.is_read ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Info className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <p className={`font-bold ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>{n.type || 'Alert'}</p>
                            <span className="text-[10px] font-mono text-slate-500">{new Date(n.timestamp || Date.now()).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{n.message}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* SECURE CHAT DRAWER */}
        <AnimatePresence>
          {chatDrawerOpen && activeChatFirm && (
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-96 bg-slate-900/95 border-l border-indigo-500/30 shadow-2xl z-[70] flex flex-col backdrop-blur-xl">
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 border border-indigo-500/30 text-indigo-400 font-bold"><Building2 className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold">{activeChatFirm} HR</h3>
                    <p className="text-[10px] text-emerald-400 flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></div> Encrypted P2P Link</p>
                  </div>
                </div>
                <button onClick={() => setChatDrawerOpen(false)} className="p-2 bg-white/[0.06] rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={chatScrollRef}>
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-50">
                    <MessageSquare className="w-10 h-10 text-slate-500" />
                    <p className="text-sm text-center">Start a secure P2P conversation with {activeChatFirm}.</p>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => {
                    const isMine = msg.sender_id === user.id;
                    return (
                      <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] ${isMine ? 'bg-indigo-600 text-white rounded-br-sm shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-sm'}`}>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center space-x-2">
                <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} placeholder="Type a secure message..." className="glass-input flex-1 !rounded-full !py-3 text-sm" />
                <button type="submit" disabled={!currentMessage.trim()} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"><Send className="w-4 h-4" /></button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* EDIT PROFILE MODAL */}
        <AnimatePresence>
          {showEditProfileModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg p-8 rounded-3xl glass-card shadow-2xl overflow-y-auto max-h-[90vh] !bg-slate-900/95">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black flex items-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"><Settings className="w-6 h-6 mr-3 text-indigo-400" /> Edit Profile</h2>
                  <button onClick={() => { setShowEditProfileModal(false); setIsEditingPersonal(false); }} className="p-2 bg-white/[0.06] rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name</label>
                    <input type="text" value={user?.name || ''} disabled className="glass-input w-full opacity-60 cursor-not-allowed font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email (Primary UUID)</label>
                    <input type="email" value={user?.id || ''} disabled className="glass-input w-full opacity-60 cursor-not-allowed font-medium text-indigo-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Gender (Optional)</label>
                    <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      {['Male', 'Female', 'Transgender'].map(g => (
                        <button type="button" key={g} onClick={() => setPersonalInfo({ ...personalInfo, gender: g })} className={`flex-1 py-2 text-[10px] md:text-sm rounded-lg font-bold transition-all ${personalInfo.gender === g ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Date of Birth</label>
                    <input type="date" value={personalInfo.dob} onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })} className="glass-input w-full [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Mobile Number</label>
                    <div className="flex gap-2">
                      <select value={personalInfo.countryCode} onChange={(e) => setPersonalInfo({ ...personalInfo, countryCode: e.target.value })} className="glass-input w-28 appearance-none text-center">
                        {['+91', '+1', '+44', '+61', '+81', '+86', '+49', '+33', '+971'].map(code => <option key={code} value={code}>{code}</option>)}
                      </select>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          value={personalInfo.mobile}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setPersonalInfo({ ...personalInfo, mobile: val });
                          }}
                          className="glass-input w-full pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-white/[0.06]">
                  <button onClick={() => { setShowEditProfileModal(false); setIsEditingPersonal(false); }} className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors rounded-xl">Cancel</button>
                  <button onClick={() => { handleSavePersonalInfo(); setShowEditProfileModal(false); }} className="btn-premium px-6 py-2.5 rounded-xl text-sm flex items-center"><Save className="w-4 h-4 mr-2" /> Save Changes</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI QUIZ MODAL */}
        <AnimatePresence>
          {showQuizModal && quizData && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl p-8 rounded-3xl glass-card shadow-2xl overflow-y-auto max-h-[90vh] !bg-slate-900/95 border border-white/[0.08]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black flex items-center bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"><CheckCircle className="w-6 h-6 mr-3 text-emerald-400" /> AI Skill Verification: {quizData.skill}</h2>
                  <button onClick={() => setShowQuizModal(false)} className="p-2 bg-white/[0.06] rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <p className="text-sm text-slate-400 mb-6 flex items-center bg-white/[0.02] p-4 rounded-xl border border-white/[0.04]"><Info className="w-4 h-4 mr-2 text-indigo-400" /> This test is dynamically generated by our AI cognitive layer. A perfect score (3/3) is required to mint the cryptographic Proof-of-Skill badge.</p>

                <form onSubmit={handleVerifyQuiz} className="space-y-6">
                  {quizData.questions.map((q, qIndex) => (
                    <div key={q.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-inner">
                      <p className="font-bold text-sm mb-4 leading-relaxed"><span className="text-indigo-400 mr-2 text-lg">Q{qIndex + 1}.</span>{q.text}</p>
                      <div className="space-y-2">
                        {Object.entries(q.options).map(([key, value]) => (
                          <label key={key} className={`flex items-center p-3 rounded-xl cursor-pointer border transition-all ${quizAnswers[q.id] === key ? 'bg-indigo-600/30 border-indigo-500 text-indigo-100' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] text-slate-300'}`}>
                            <input type="radio" name={q.id} value={key} checked={quizAnswers[q.id] === key} onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: key })} className="mr-3 w-4 h-4 accent-indigo-500" />
                            <span className="text-sm font-medium"><span className="text-indigo-400/50 mr-2 font-mono uppercase text-xs">{key})</span> {value}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-white/[0.06]">
                    <button type="button" onClick={() => setShowQuizModal(false)} className="px-5 py-2.5 text-sm text-slate-500 hover:text-slate-300 transition-colors rounded-xl font-bold">Cancel Verification</button>
                    <button type="submit" className="btn-premium px-8 py-2.5 rounded-xl text-sm flex items-center shadow-lg shadow-emerald-500/20" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}><ShieldCheck className="w-4 h-4 mr-2" /> Submit Answers</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}