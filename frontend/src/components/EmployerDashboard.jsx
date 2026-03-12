import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Building2, LogOut, Users, Briefcase, FileSignature, PieChart, Lock, ShieldCheck, Bell, Plus, X, Eye, CheckCircle, XCircle, Calendar, MapPin, IndianRupee, KeyRound, Minus, User, Phone, Check, Save, Moon, Sun, Settings, ChevronDown, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function EmployerDashboard({ user, setUser }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [aboutUs, setAboutUs] = useState("");
    const [personalInfo, setPersonalInfo] = useState({ gender: '', countryCode: '+91', mobile: '', dob: '' });
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [aboutSavedStatus, setAboutSavedStatus] = useState('');

    // Profile Avatar Dropdown & Modal
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const profileDropdownRef = useRef(null);

    // Data States
    const [activeEmployees, setActiveEmployees] = useState([]);
    const [pendingRequests, setPendingRequests] = useState({ relieve: [], onboarding: [], applications: [] });
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Job Posting State
    const [newJob, setNewJob] = useState({
        job_title: '', vacancy: 1, location: 'Onsite',
        experience: 0, skills: [], salary: 5, lastDate: ''
    });
    const [skillInput, setSkillInput] = useState("");

    // Password State
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

    // Chat State (WebSockets)
    const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const wsRef = useRef(null);
    const chatScrollRef = useRef(null);

    // Initial Data Fetch
    useEffect(() => {
        if (user?.id) {
            setAboutUs(user.about || "");

            if (user.company_name) {
                axios.get(`${API_BASE}/api/hr/active_employees/${user.company_name}`)
                    .then(res => setActiveEmployees(res.data.employees || []))
                    .catch(console.error);
            }

            axios.get(`${API_BASE}/api/secure_search/${user.id}`)
                .then(res => {
                    if (res.data?.personal_info) {
                        setPersonalInfo(res.data.personal_info);
                    }
                }).catch(console.error);

            axios.get(`${API_BASE}/api/hr/pending_requests/${user.id}`)
                .then(res => {
                    const reqs = res.data.requests || [];
                    setPendingRequests({
                        relieve: reqs.filter(r => r.type === 'relieve'),
                        onboarding: reqs.filter(r => r.type === 'onboarding'),
                        applications: reqs.filter(r => r.type === 'application' || !r.type)
                    });
                }).catch(console.error);

            axios.get(`${API_BASE}/api/notifications/${user.id}`)
                .then(res => setNotifications(res.data.notifications || []))
                .catch(console.error);
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

    const handleSaveAbout = async () => {
        try {
            await axios.post(`${API_BASE}/api/profile/about/${user.id}`, { about_text: aboutUs });
            setAboutSavedStatus('Saved!');
            setTimeout(() => setAboutSavedStatus(''), 2000);
        } catch (err) { alert("Failed to save profile."); }
    };

    const handleSavePersonalInfo = async () => {
        if (personalInfo.mobile && personalInfo.mobile.length !== 10) {
            alert("Mobile number must be exactly 10 digits.");
            return;
        }
        try {
            await axios.put(`${API_BASE}/api/profile/personal/${user.id}`, { personal_info: personalInfo });
            setIsEditingPersonal(false);
            alert("Representative details updated successfully.");
        } catch (err) { alert("Failed to update personal info."); }
    };

    // --- Job Posting Logic ---
    const handleAddSkill = () => {
        const val = skillInput.trim();
        if (val && !newJob.skills.includes(val) && newJob.skills.length < 10) {
            setNewJob({ ...newJob, skills: [...newJob.skills, val] });
            setSkillInput("");
        }
    };

    const handlePostJob = async (e) => {
        e.preventDefault();
        if (newJob.skills.length === 0) { alert("Please add at least one required skill."); return; }
        if (!newJob.lastDate) { alert("Please set a cut-off date."); return; }

        try {
            const payload = {
                employer_id: user.id, company_name: user.company_name,
                job_title: newJob.job_title, vacancy: newJob.vacancy,
                location: newJob.location, lockIn: "None",
                experience: `${newJob.experience === 0 ? 'Fresher' : newJob.experience + ' Years'}`,
                qualification: newJob.skills.join(", "),
                salary: `₹${newJob.salary},00,000 LPA`, lastDate: newJob.lastDate
            };
            await axios.post(`${API_BASE}/api/hr/post_job`, payload);
            alert("Job successfully broadcasted to the Noticeboard!");
            setNewJob({ job_title: '', vacancy: 1, location: 'Onsite', experience: 0, skills: [], salary: 5, lastDate: '' });
            setActiveTab('applications');
        } catch (err) { alert("Error posting job."); }
    };

    const handleActionRequest = async (requestId, action, isRelieve = false) => {
        const actionText = action === 'accept' ? 'Approve' : 'Reject';
        const typeText = isRelieve ? 'Relieve Request' : 'Onboarding';

        if (!window.confirm(`DOUBLE VERIFICATION: Are you sure you want to ${actionText.toUpperCase()} this ${typeText}? This will update the blockchain ledger permanently.`)) return;

        try {
            const endpoint = isRelieve ? `/api/hr/action_relieve/${requestId}?action=${action}` : `/api/hr/action_request/${requestId}?action=${action}`;
            await axios.get(`${API_BASE}${endpoint}`);
            alert(`Success: ${typeText} ${actionText}ed.`);

            if (isRelieve) {
                setPendingRequests(prev => ({ ...prev, relieve: prev.relieve.filter(r => r.request_id !== requestId) }));
            } else {
                setPendingRequests(prev => ({ ...prev, onboarding: prev.onboarding.filter(r => r.request_id !== requestId) }));
            }
        } catch (err) { alert("Action failed. Check server connection."); }
    };

    const viewCandidateDetails = async (empId) => {
        try {
            const res = await axios.get(`${API_BASE}/api/secure_search/${empId}`);
            setSelectedCandidate(res.data);
            setChatDrawerOpen(false); // Reset chat drawer when changing candidate
        } catch (err) { alert("Could not fetch candidate details."); }
    };

    const handleRequestReveal = async (candidate) => {
        try {
            const res = await axios.post(`${API_BASE}/api/hr/request_reveal`, {
                employer_id: user.id,
                company_name: user.company_name,
                employee_id: candidate.employee_id
            });
            alert(res.data.message);
        } catch (err) {
            alert("Failed to send reveal request.");
        }
    };

    // --- Real-Time Chat Logic (Enterprise P2P) ---
    const initWebSocket = () => {
        if (wsRef.current) return; // Already connected
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = API_BASE.replace(/^http(s?):\/\//, ''); // Clean API BASE for WS

        const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${user.id}`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            setChatHistory(prev => [...prev, msg]);
            // Auto-scroll logic happens in useEffect below
        };

        wsRef.current.onclose = () => { wsRef.current = null; };
        wsRef.current.onerror = (err) => { console.error("WebSocket Error:", err); };
    };

    const fetchChatHistory = async (empId) => {
        try {
            const res = await axios.get(`${API_BASE}/api/chat/history/${user.id}/${empId}`);
            setChatHistory(res.data.messages || []);
        } catch (err) { console.error("Failed to fetch chat history:", err); }
    };

    const toggleChatDrawer = () => {
        if (!chatDrawerOpen) {
            initWebSocket();
            fetchChatHistory(selectedCandidate.employee_id);
        }
        setChatDrawerOpen(!chatDrawerOpen);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!currentMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const payload = {
            receiver_id: selectedCandidate.employee_id,
            message: currentMessage
        };

        wsRef.current.send(JSON.stringify(payload));
        setCurrentMessage("");
    };

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatHistory, chatDrawerOpen]);


    // --- Dynamic Workforce Engine ---
    const calculateWorkforceStats = () => {
        const total = activeEmployees.length || 1;
        let males = 0, females = 0, trans = 0;
        let under1 = 0, under3 = 0, over3 = 0;

        activeEmployees.forEach(emp => {
            if (emp.gender === 'Male') males++;
            else if (emp.gender === 'Female') females++;
            else if (emp.gender === 'Transgender') trans++;

            const job = emp.experience?.find(e => e.end_date === 'Present' && e.firm === user?.company_name);
            if (job && job.start_date) {
                const yrs = (new Date() - new Date(job.start_date)) / (1000 * 60 * 60 * 24 * 365);
                if (yrs < 1) under1++;
                else if (yrs <= 3) under3++;
                else over3++;
            }
        });

        return {
            gender: { m: Math.round((males / total) * 100), f: Math.round((females / total) * 100), t: Math.round((trans / total) * 100) },
            tenure: { u1: Math.round((under1 / total) * 100), u3: Math.round((under3 / total) * 100), o3: Math.round((over3 / total) * 100) }
        };
    };
    const stats = calculateWorkforceStats();

    const pwdStrength = passwordForm.newPassword.length >= 8 ? (/[A-Z]/.test(passwordForm.newPassword) && /[0-9!@#$]/.test(passwordForm.newPassword) ? 100 : 60) : (passwordForm.newPassword.length > 0 ? 30 : 0);
    const passwordsMatch = passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword;

    return (
        <div className="flex min-h-screen animated-gradient-bg text-slate-100 relative overflow-hidden">

            {/* DECORATIVE FLOATING ORBS */}
            <div className="orb orb-primary w-96 h-96 -top-48 -left-48" />
            <div className="orb orb-accent w-80 h-80 top-1/2 -right-40" />

            {/* SIDEBAR */}
            <div className="w-72 flex flex-col glass-sidebar z-10 relative">
                <div className="p-8">
                    <div className="flex items-center space-x-3 mb-10">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-white">CETS HR</span>
                    </div>

                    <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-4">Command Center</p>
                    <nav className="space-y-1.5">
                        {[
                            { id: 'profile', icon: Building2, label: 'Company Profile' },
                            { id: 'workforce', icon: PieChart, label: 'Workforce Insights' },
                            { id: 'post_job', icon: Briefcase, label: 'Post Recruitment' },
                            { id: 'applications', icon: Users, label: 'Candidate CRM' },
                            { id: 'notifications', icon: Bell, label: 'Notifications' },
                            { id: 'approvals', icon: FileSignature, label: 'Ledger Approvals', badge: pendingRequests.relieve.length + pendingRequests.onboarding.length },
                            //{ id: 'security', icon: KeyRound, label: 'Security' },
                        ].map((item) => (
                            <button key={item.id} onClick={() => {
                                setActiveTab(item.id);
                                if (item.id === 'notifications') markNotificationsRead();
                            }} className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id ? 'sidebar-tab-active' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}>
                                <div className="flex items-center"><item.icon className={`mr-3 w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-600'}`} /> {item.label}</div>
                                {item.id === 'notifications' && unreadCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
                                {item.badge > 0 && item.id !== 'notifications' && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === item.id ? 'bg-indigo-400/20 text-indigo-300' : 'bg-rose-500/20 text-rose-400'}`}>{item.badge}</span>}
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
                <header className="h-20 px-10 flex items-center justify-between glass-header sticky top-0 z-40">
                    <div className="flex items-center space-x-2">
                        <Building2 className="w-6 h-6 text-indigo-500" />
                        <span className="text-xl font-black tracking-tighter text-white">CETS HR</span>
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
                                <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full shadow-lg border border-white/[0.08] flex items-center justify-center text-white font-bold group-hover:border-indigo-400/50 transition-all">
                                    {user?.company_name?.charAt(0) || 'H'}
                                </div>
                                <ChevronDown className={`w-4 h-4 ml-2 text-slate-500 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {showProfileDropdown && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl glass-card overflow-hidden !bg-slate-900/95 border border-white/[0.08]">
                                        <div className="p-3 border-b border-white/[0.06]">
                                            <p className="text-sm font-bold truncate">{user?.company_name}</p>
                                            <p className="text-xs text-slate-500 font-mono truncate">{user?.id}</p>
                                        </div>
                                        <div className="p-2">
                                            <button onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                                                <Building2 className="w-4 h-4 mr-3 text-slate-500" /> Company Profile
                                            </button>
                                            <button onClick={() => { setShowEditProfileModal(true); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                                                <Settings className="w-4 h-4 mr-3 text-slate-500" /> Company Settings
                                            </button>
                                            <button onClick={() => { setActiveTab('security'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                                                <KeyRound className="w-4 h-4 mr-3 text-slate-500" /> Security
                                            </button>
                                            <button onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                                                <Building2 className="w-4 h-4 mr-3 text-slate-500" /> Home
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
                    <AnimatePresence mode="wait">

                        {/* TAB 1: PROFILE */}
                        {activeTab === 'profile' && (
                            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-5xl space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="stat-card bg-gradient-to-br from-indigo-500/[0.06] to-transparent">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Workforce</p>
                                        <h3 className="text-5xl font-black text-indigo-400">{activeEmployees.length}</h3>
                                        <p className="text-xs mt-2 font-medium text-slate-400">Currently deployed on ledger</p>
                                    </div>
                                    <div className="stat-card bg-gradient-to-br from-emerald-500/[0.06] to-transparent" style={{ "--stat-color": "#10b981" }}>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Retention Rate</p>
                                        <h3 className="text-5xl font-black text-emerald-400">2.8 <span className="text-2xl font-bold text-slate-500">Yrs</span></h3>
                                        <p className="text-xs mt-2 font-medium text-slate-400">Above industry standard</p>
                                    </div>
                                    <div className="stat-card bg-gradient-to-br from-amber-500/[0.06] to-transparent">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Login</p>
                                        <h3 className="text-lg font-black text-amber-400 mt-2">{user?.last_login ? new Date(user.last_login).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'First Session'}</h3>
                                        <p className="text-xs mt-3 font-medium text-slate-500 font-mono">IP: {user?.last_login_ip || 'N/A'}</p>
                                    </div>
                                </div>


                                <div className="glass-card p-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold flex items-center"><Building2 className="w-5 h-5 mr-2 text-indigo-400" /> About Our Company</h3>
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${aboutUs.length > 480 ? 'bg-rose-500/10 text-rose-400' : 'bg-white/[0.06] text-slate-400'}`}>{aboutUs.length} / 500 Chars</span>
                                    </div>
                                    <textarea maxLength={500} value={aboutUs} onChange={(e) => setAboutUs(e.target.value)} placeholder="Describe your company culture, mission, and vision (Max 500 chars)..." className="glass-input w-full min-h-[150px] leading-relaxed resize-none mb-3" />
                                    <div className="flex justify-end items-center gap-3">
                                        {aboutSavedStatus && <span className="text-emerald-400 text-sm font-bold flex items-center"><Check className="w-4 h-4 mr-1" /> {aboutSavedStatus}</span>}
                                        <button onClick={handleSaveAbout} className="btn-premium px-5 py-2 rounded-xl text-sm flex items-center shadow"><Save className="w-4 h-4 mr-2" /> Save Description</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 2: WORKFORCE INSIGHTS */}
                        {activeTab === 'workforce' && (
                            <motion.div key="workforce" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-5xl space-y-6">
                                <div className="glass-card p-8">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center"><PieChart className="mr-3 text-indigo-400" /> Real-Time Diversity Analytics</h2>
                                    {activeEmployees.length === 0 ? (
                                        <p className="text-center text-slate-500 italic py-8 border border-dashed rounded-xl border-white/[0.08]">Hire employees to generate real-time analytics.</p>
                                    ) : (
                                        <div className="space-y-8">
                                            <div>
                                                <div className="flex justify-between text-sm font-bold mb-2"><span>Gender Diversity</span><span className="text-slate-500">Based on Active Roster</span></div>
                                                <div className="w-full h-8 rounded-full overflow-hidden flex shadow-inner bg-white/[0.04]">
                                                    {stats.gender.m > 0 && <div className="bg-indigo-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${stats.gender.m}%` }}>{stats.gender.m}% Male</div>}
                                                    {stats.gender.f > 0 && <div className="bg-purple-400 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${stats.gender.f}%` }}>{stats.gender.f}% Female</div>}
                                                    {stats.gender.t > 0 && <div className="bg-emerald-400 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${stats.gender.t}%` }}>{stats.gender.t}% Trans</div>}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm font-bold mb-2"><span>Employee Tenure Breakdown</span></div>
                                                <div className="w-full h-8 rounded-full overflow-hidden flex shadow-inner bg-white/[0.04]">
                                                    {stats.tenure.u1 > 0 && <div className="bg-cyan-400 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${stats.tenure.u1}%` }}>{stats.tenure.u1}% (&lt; 1yr)</div>}
                                                    {stats.tenure.u3 > 0 && <div className="bg-indigo-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${stats.tenure.u3}%` }}>{stats.tenure.u3}% (1-3yrs)</div>}
                                                    {stats.tenure.o3 > 0 && <div className="bg-indigo-700 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500" style={{ width: `${stats.tenure.o3}%` }}>{stats.tenure.o3}% (&gt; 3yrs)</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-8">
                                    <h3 className="text-xl font-bold mb-6">Current Roster</h3>
                                    <div className="space-y-3">
                                        {activeEmployees.length === 0 ? <p className="text-slate-500 italic">No employees currently active on ledger.</p> : activeEmployees.map((emp, i) => (
                                            <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex justify-between items-center hover:bg-white/[0.05] transition-colors">
                                                <div className="flex items-center space-x-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20"><User className="text-indigo-400 w-5 h-5" /></div>
                                                    <div><p className="font-bold">{emp.name}</p><p className="text-xs font-mono text-slate-500">{emp.employee_id}</p></div>
                                                </div>
                                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center"><ShieldCheck className="w-3 h-3 mr-1" /> Active</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 3: POST RECRUITMENT */}
                        {activeTab === 'post_job' && (
                            <motion.div key="post_job" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                                <div className="glass-card p-8">
                                    <h2 className="text-2xl font-bold flex items-center mb-2"><Briefcase className="mr-3 text-indigo-400" /> Broadcast Job Opening</h2>
                                    <p className="text-slate-500 text-sm mb-8">Publish a highly-detailed requirement directly to the global noticeboard.</p>

                                    <form onSubmit={handlePostJob} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
                                            <input required type="text" value={newJob.job_title} onChange={e => setNewJob({ ...newJob, job_title: e.target.value })} className="glass-input w-full" placeholder="e.g. Senior Data Scientist" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Number of Postings</label>
                                            <input required type="number" min="1" value={newJob.vacancy} onChange={e => setNewJob({ ...newJob, vacancy: e.target.value })} className="glass-input w-full" placeholder="e.g. 5" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Mode / Location</label>
                                            <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                                {['Onsite', 'Hybrid', 'Remote'].map(mode => (
                                                    <button type="button" key={mode} onClick={() => setNewJob({ ...newJob, location: mode })} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newJob.location === mode ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Experience Required</label>
                                            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                                                <button type="button" onClick={() => setNewJob({ ...newJob, experience: Math.max(0, newJob.experience - 1) })} className="p-2 bg-white/[0.06] rounded-lg hover:bg-white/[0.1] transition-colors"><Minus className="w-4 h-4" /></button>
                                                <span className="font-bold text-lg">{newJob.experience === 0 ? 'Fresher' : `${newJob.experience} Years`}</span>
                                                <button type="button" onClick={() => setNewJob({ ...newJob, experience: newJob.experience + 1 })} className="p-2 bg-white/[0.06] rounded-lg hover:bg-white/[0.1] transition-colors"><Plus className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                                                <span>Salary Package (LPA)</span>
                                                <span className="text-indigo-400 font-black text-lg">₹{newJob.salary},00,000</span>
                                            </label>
                                            <input type="range" min="1" max="50" value={newJob.salary} onChange={e => setNewJob({ ...newJob, salary: parseInt(e.target.value) })} className="w-full h-2 bg-white/[0.06] rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                            <div className="flex justify-between text-xs text-slate-500 font-mono mt-1"><span>₹1L</span><span>₹50L+</span></div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">Required Skills <span>{newJob.skills.length}/10</span></label>
                                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {newJob.skills.map((skill, i) => (
                                                        <span key={i} className="tag-pill">{skill} <X className="w-3 h-3 cursor-pointer hover:text-rose-400" onClick={() => setNewJob({ ...newJob, skills: newJob.skills.filter((_, idx) => idx !== i) })} /></span>
                                                    ))}
                                                </div>
                                                <div className="flex">
                                                    <input disabled={newJob.skills.length >= 10} type="text" placeholder="Type a skill and press Enter" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} className="glass-input flex-1 p-2 text-sm rounded-r-none disabled:opacity-40" />
                                                    <button type="button" disabled={newJob.skills.length >= 10} onClick={handleAddSkill} className="px-4 bg-indigo-500/20 text-indigo-400 rounded-r-xl border border-l-0 border-white/[0.08] disabled:opacity-40"><Plus className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Application Cut-off (Date & Time)</label>
                                            <input required type="datetime-local" value={newJob.lastDate} onChange={e => setNewJob({ ...newJob, lastDate: e.target.value })} className="glass-input w-full [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                                        </div>

                                        <div className="md:col-span-2 pt-4">
                                            <button type="submit" className="btn-premium w-full py-4 rounded-xl text-sm">Publish to Global Noticeboard</button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 4: CANDIDATE CRM */}
                        {activeTab === 'applications' && (
                            <motion.div key="applications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                                <div className="glass-card p-8">
                                    <h2 className="text-2xl font-bold flex items-center mb-6"><Users className="mr-3 text-indigo-400" /> Candidate Applications</h2>
                                    <div className="space-y-4">
                                        {pendingRequests.applications.length === 0 ? <p className="text-slate-500 text-center py-8 italic border border-dashed border-white/[0.08] rounded-xl">No incoming applications yet.</p> : pendingRequests.applications.map((app, i) => (
                                            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex justify-between items-center hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => viewCandidateDetails(app.employee_id)}>
                                                <div><p className="font-bold text-lg">{app.employee_name}</p><p className="text-sm font-medium text-indigo-400">Applied for: {app.job_title}</p></div>
                                                <button className="flex items-center px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg text-sm font-bold border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"><Eye className="w-4 h-4 mr-2" /> Review Profile</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 5: BLOCKCHAIN APPROVALS */}
                        {activeTab === 'approvals' && (
                            <motion.div key="approvals" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-5xl space-y-6">

                                <div className="glass-card p-8 border-l-4 !border-l-rose-500/50">
                                    <h2 className="text-2xl font-bold flex items-center mb-6"><LogOut className="mr-3 text-rose-400" /> Pending Relieve Requests</h2>
                                    <div className="space-y-4">
                                        {pendingRequests.relieve.length === 0 ? <p className="text-slate-500 italic text-sm">No employees have requested to be relieved.</p> : pendingRequests.relieve.map(req => (
                                            <div key={req.request_id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col md:flex-row justify-between md:items-center gap-4">
                                                <div>
                                                    <p className="font-bold text-lg">{req.employee_name} <span className="text-xs font-mono text-slate-500 ml-2">({req.employee_id})</span></p>
                                                    <p className="text-sm text-rose-400 font-medium mt-1">Requesting official relief from current duties.</p>
                                                </div>
                                                <div className="flex space-x-3">
                                                    <button onClick={() => handleActionRequest(req.request_id, 'reject', true)} className="px-4 py-2 flex items-center text-sm font-bold text-slate-500 hover:text-rose-400 transition-colors"><XCircle className="w-4 h-4 mr-1" /> Reject</button>
                                                    <button onClick={() => handleActionRequest(req.request_id, 'accept', true)} className="px-6 py-2 flex items-center bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-bold rounded-xl hover:bg-rose-500 hover:text-white transition-all"><CheckCircle className="w-4 h-4 mr-2" /> Approve Relieve & Hash</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-card p-8 border-l-4 !border-l-emerald-500/50">
                                    <h2 className="text-2xl font-bold flex items-center mb-6"><FileSignature className="mr-3 text-emerald-400" /> Pending Onboarding Requests</h2>
                                    <div className="space-y-4">
                                        {pendingRequests.onboarding.length === 0 ? <p className="text-slate-500 italic text-sm">No pending onboardings awaiting HR approval.</p> : pendingRequests.onboarding.map(req => (
                                            <div key={req.request_id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col md:flex-row justify-between md:items-center gap-4">
                                                <div>
                                                    <p className="font-bold text-lg">{req.employee_name} <span className="text-xs font-mono text-slate-500 ml-2">({req.employee_id})</span></p>
                                                    <p className="text-sm text-emerald-400 font-medium mt-1">Pending approval for role: {req.job_title}</p>
                                                </div>
                                                <div className="flex space-x-3">
                                                    <button onClick={() => handleActionRequest(req.request_id, 'reject')} className="px-4 py-2 flex items-center text-sm font-bold text-slate-500 hover:text-rose-400 transition-colors"><XCircle className="w-4 h-4 mr-1" /> Reject</button>
                                                    <button onClick={() => handleActionRequest(req.request_id, 'accept')} className="px-6 py-2 flex items-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-bold rounded-xl hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle className="w-4 h-4 mr-2" /> Authorize Onboarding</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 6: SECURITY CENTER */}
                        {activeTab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-xl">
                                <div className="glass-card p-8">
                                    <h2 className="text-2xl font-bold flex items-center mb-6"><Lock className="mr-3 text-indigo-400" /> Master Security Key</h2>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        if (passwordForm.oldPassword === passwordForm.newPassword) { alert("You cannot change your password to your current password."); return; }
                                        if (pwdStrength < 100) { alert("Please meet all password complexity requirements."); return; }
                                        if (!passwordsMatch) { alert("Passwords do not match."); return; }
                                        try {
                                            await axios.post(`${API_BASE}/api/auth/change_password/${user.id}`, {
                                                old_password: passwordForm.oldPassword,
                                                new_password: passwordForm.newPassword,
                                                confirm_password: passwordForm.confirmPassword
                                            });
                                            alert("Password updated securely!");
                                            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                        } catch (err) { alert(err.response?.data?.detail || "Failed to update password."); }
                                    }} className="space-y-4">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Password</label><input type="password" required value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} className="glass-input w-full mt-1" /></div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                                            <input type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="glass-input w-full mt-1" />
                                            <div className="mt-2">
                                                <div className="strength-bar"><div className={`strength-bar-fill ${pwdStrength === 100 ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} style={{ width: `${pwdStrength}%` }}></div></div>
                                                <p className="text-[10px] text-slate-500 mt-1">Requires: 8+ chars, 1 uppercase, 1 special/number.</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">Confirm New Password {passwordForm.confirmPassword.length > 0 && <span className={passwordsMatch ? "text-emerald-400" : "text-rose-400"}>{passwordsMatch ? "Matches!" : "Does Not Match"}</span>}</label>
                                            <input type="password" required value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="glass-input w-full mt-1" />
                                        </div>
                                        <button disabled={pwdStrength < 100 || !passwordsMatch} type="submit" className="btn-premium w-full mt-4 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed">Update Protocol</button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 7: NOTIFICATIONS */}
                        {activeTab === 'notifications' && (
                            <motion.div key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                                <div className="glass-card p-8 flex justify-between items-center bg-gradient-to-r from-indigo-500/[0.06] to-purple-500/[0.06]">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2 flex items-center"><Bell className="mr-3 text-indigo-400" /> HR Notifications</h2>
                                        <p className="text-slate-500 text-sm">Review incoming relief requests and onboarding updates.</p>
                                    </div>
                                    <div className={`bg-white/[0.06] px-4 py-2 rounded-full text-xs font-bold ${unreadCount > 0 ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-white/[0.08]'} border`}>
                                        {unreadCount} New Alerts
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {notifications.length === 0 ? (
                                        <div className="text-center py-20 glass-card border-dashed">
                                            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                                            <p className="text-slate-500 italic">No HR notifications found.</p>
                                        </div>
                                    ) : (
                                        notifications.slice().reverse().map((n, idx) => (
                                            <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                                className={`glass-card p-6 flex items-start gap-4 border-l-4 transition-all hover:bg-white/[0.04] ${!n.is_read ? 'border-l-indigo-500 bg-indigo-500/[0.03]' : 'border-l-slate-700 opacity-80'}`}
                                            >
                                                <div className={`p-2 rounded-lg ${!n.is_read ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                                    <ShieldCheck className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className={`font-bold ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>HR ALERT</p>
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

                {/* CANDIDATE PREVIEW MODAL */}
                <AnimatePresence>
                    {selectedCandidate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl p-8 rounded-3xl glass-card shadow-2xl overflow-y-auto max-h-[90vh] !bg-slate-900/95">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{selectedCandidate.name}</h2>
                                        <p className="text-sm font-bold text-slate-500 mt-1 flex items-center">
                                            {selectedCandidate.dob ? `${new Date().getFullYear() - new Date(selectedCandidate.dob).getFullYear()} Years Old` : 'Age Unlisted'}
                                            <span className="mx-2">•</span>
                                            {selectedCandidate.gender || 'Not Specified'}
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedCandidate(null)} className="p-2 bg-white/[0.06] rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"><X className="w-5 h-5" /></button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">About Candidate</h4>
                                        <p className="text-sm leading-relaxed text-slate-300">{selectedCandidate.about || "This candidate hasn't added a professional summary yet."}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/10">
                                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Academic Standing</p>
                                            <p className="font-bold text-lg">{selectedCandidate.average_academic_score ? `${selectedCandidate.average_academic_score}%` : 'N/A'}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10">
                                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Current Employer</p>
                                            <p className="font-bold text-lg">
                                                {selectedCandidate.experience?.find(e => e.end_date === 'Present')?.firm || 'Currently Open to Work'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Core Skills</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedCandidate.skills?.length > 0 ? selectedCandidate.skills.map(s => <span key={s} className="tag-pill">{s}</span>) : <span className="text-sm italic text-slate-500">No skills listed.</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-white/[0.06] flex justify-between items-center">
                                    {selectedCandidate.name === "Anonymous Candidate" ? (
                                        <button onClick={() => handleRequestReveal(selectedCandidate)} className="btn-premium px-6 py-2 rounded-xl text-sm flex items-center bg-transparent border-2 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" style={{ background: 'transparent' }}><Eye className="w-4 h-4 mr-2" /> Request Reveal</button>
                                    ) : (
                                        <button onClick={toggleChatDrawer} className="btn-premium px-6 py-2 rounded-xl text-sm flex items-center bg-transparent border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500/20" style={{ background: 'transparent' }}><MessageSquare className="w-4 h-4 mr-2" /> Message Candidate</button>
                                    )}
                                    <button onClick={() => { setSelectedCandidate(null); setChatDrawerOpen(false); }} className="px-6 py-2 rounded-xl text-sm text-slate-400 hover:bg-white/[0.06] transition-all">Close</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* MESSAGING DRAWER (Tied to Selected Candidate) */}
                <AnimatePresence>
                    {chatDrawerOpen && selectedCandidate && (
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-96 bg-slate-900/95 border-l border-indigo-500/30 shadow-2xl z-[70] flex flex-col backdrop-blur-xl">
                            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 border border-indigo-500/30 text-indigo-400 font-bold">{selectedCandidate.name.charAt(0)}</div>
                                    <div>
                                        <h3 className="font-bold">{selectedCandidate.name}</h3>
                                        <p className="text-[10px] text-emerald-400 flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></div> Line Secure</p>
                                    </div>
                                </div>
                                <button onClick={() => setChatDrawerOpen(false)} className="p-2 bg-white/[0.06] rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"><X className="w-4 h-4" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={chatScrollRef}>
                                {chatHistory.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-50">
                                        <MessageSquare className="w-10 h-10 text-slate-500" />
                                        <p className="text-sm text-center">Start a secure P2P conversation with {selectedCandidate.name.split(' ')[0]}.</p>
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
                                    <h2 className="text-2xl font-black flex items-center bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"><Settings className="w-6 h-6 mr-3 text-amber-400" /> Edit HR Profile</h2>
                                    <button onClick={() => { setShowEditProfileModal(false); setIsEditingPersonal(false); }} className="p-2 bg-white/[0.06] rounded-full hover:bg-rose-500/20 hover:text-rose-400 transition-colors"><X className="w-5 h-5" /></button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Representative Name</label>
                                        <input type="text" value={user?.name || ''} disabled className="glass-input w-full opacity-60 cursor-not-allowed font-medium" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Email Contact</label>
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
                                    <button onClick={() => { handleSavePersonalInfo(); setShowEditProfileModal(false); }} className="btn-premium px-6 py-2.5 rounded-xl text-sm flex items-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}><Save className="w-4 h-4 mr-2" /> Save Changes</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}