import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Activity, Server, LogOut, Terminal, Globe, AlertTriangle, CheckCircle2, Lock, Cpu, Radar, Database, History, LineChart, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function AdminDashboard({ user, setUser }) {
    const [activeTab, setActiveTab] = useState('threats');
    const [threatLogs, setThreatLogs] = useState([]);
    const [isLive, setIsLive] = useState(true);

    // New States
    const [trafficStats, setTrafficStats] = useState([]);
    const [activeSessions, setActiveSessions] = useState({ total: 0, employees: 0, employers: 0, sessions: [] });
    const [attackLedger, setAttackLedger] = useState({ logs: [], total_records: 0 });
    const [userRegistry, setUserRegistry] = useState([]);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordStatus, setPasswordStatus] = useState({ msg: '', type: '' });
    const [passwordStrength, setPasswordStrength] = useState(0);

    // Auto-Polling Engine for Live Threat Logs
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const [threatRes, trafficRes, sessionRes, ledgerRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/admin/threat_logs`),
                    axios.get(`${API_BASE}/api/admin/traffic_stats`),
                    axios.get(`${API_BASE}/api/admin/active_sessions`),
                    axios.get(`${API_BASE}/api/admin/attack_ledger`)
                ]);
                setThreatLogs(threatRes.data || []);
                setTrafficStats(trafficRes.data?.hourly_traffic || []);
                setActiveSessions(sessionRes.data || { total: 0, employees: 0, employers: 0, sessions: [] });
                setAttackLedger(ledgerRes.data || { logs: [], total_records: 0 });

                // Fetch all users for registry
                const usersRes = await axios.get(`${API_BASE}/api/admin/user_registry`);
                setUserRegistry(usersRes.data || []);
            } catch (err) {
                console.error("Admin dashboard data sync failed.");
            }
        };

        fetchLogs();

        let interval;
        if (isLive) {
            interval = setInterval(fetchLogs, 5000);
        }
        return () => clearInterval(interval);
    }, [isLive]);

    // Password Strength Calc logic
    useEffect(() => {
        const calculateStrength = (pwd) => {
            let strength = 0;
            if (pwd.length >= 8) strength += 25;
            if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
            if (/\d/.test(pwd)) strength += 25;
            if (/[^A-Za-z0-9]/.test(pwd)) strength += 25;
            setPasswordStrength(strength);
        };
        calculateStrength(passwordForm.new);
    }, [passwordForm.new]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.new !== passwordForm.confirm) {
            setPasswordStatus({ msg: "Passwords do not match.", type: "error" });
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE}/api/admin/change_password`, {
                current_password: passwordForm.current,
                new_password: passwordForm.new
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPasswordStatus({ msg: "Passkey updated successfully!", type: "success" });
            setPasswordForm({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPasswordStatus({ msg: err.response?.data?.detail || "Update failed.", type: "error" });
        }
    };

    // Derived Analytics for the KPI Cards
    const totalBlocked = threatLogs.length;
    const volumetricCount = threatLogs.filter(log => log.type === 'Volumetric Attack').length;
    const intrusionCount = threatLogs.filter(log => log.type === 'Intrusion Attempt').length;
    const uniqueIPs = new Set(threatLogs.map(log => log.ip)).size;

    return (
        <div className="flex min-h-screen text-slate-100 relative overflow-hidden" style={{ background: 'linear-gradient(-45deg, #020617, #0a0e1a, #0c0514, #020617)', backgroundSize: '400% 400%', animation: 'gradient-shift 20s ease infinite' }}>

            {/* DECORATIVE ORBS */}
            <div className="orb w-80 h-80 -top-40 -left-40" style={{ background: 'rgba(244, 63, 94, 0.15)', filter: 'blur(100px)' }} />
            <div className="orb w-64 h-64 bottom-20 -right-32" style={{ background: 'rgba(6, 182, 212, 0.1)', filter: 'blur(80px)' }} />

            {/* SIDEBAR (CYBER-THEME) */}
            <div className="w-72 flex flex-col glass-sidebar z-10 relative" style={{ borderColor: 'rgba(244, 63, 94, 0.1)' }}>
                <div className="p-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-700 rounded-xl flex items-center justify-center text-xl font-black text-white mb-6 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-bold text-rose-500/80 tracking-[0.2em] uppercase mb-4 flex items-center">
                        <Radar className={`w-3 h-3 mr-2 ${isLive ? 'animate-spin' : ''}`} /> OVERWATCH
                    </p>
                    <nav className="space-y-1.5">
                        {[
                            { id: 'threats', icon: Terminal, label: 'Live Threat Intel' },
                            { id: 'ledger', icon: History, label: 'Historical Attack Ledger' },
                            { id: 'traffic', icon: LineChart, label: 'Real-Time Traffic' },
                            { id: 'users', icon: Users, label: 'User Registry' },
                            { id: 'network', icon: Server, label: 'Network Health' },
                            { id: 'security', icon: Lock, label: 'Security Settings' },
                        ].map((item) => (
                            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center p-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)]' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}>
                                <item.icon className={`mr-3 w-5 h-5 ${activeTab === item.id ? 'text-rose-400' : 'text-slate-600'}`} /> {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto p-8 border-t border-white/[0.04]">
                    <div className="mb-4 flex items-center justify-between bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">
                        <span className="text-xs font-bold text-slate-400">Live Feed</span>
                        <button onClick={() => setIsLive(!isLive)} className={`w-10 h-5 rounded-full relative transition-colors ${isLive ? 'bg-rose-500' : 'bg-slate-700'}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isLive ? 'translate-x-5' : 'translate-x-0'}`}></span>
                        </button>
                    </div>
                    <button onClick={() => setUser(null)} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-medium">
                        <LogOut className="mr-3 w-5 h-5" /> Disconnect
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">

                {/* HEADER */}
                <header className="h-20 px-10 flex items-center justify-between glass-header sticky top-0 z-40" style={{ borderColor: 'rgba(244, 63, 94, 0.08)' }}>
                    <h1 className="text-2xl font-bold tracking-tight capitalize flex items-center">
                        {activeTab.replace('_', ' ')}
                        {activeTab === 'threats' && isLive && <span className="ml-4 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black rounded uppercase tracking-widest flex items-center animate-pulse"><span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span> Live Active</span>}
                    </h1>
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-200">System Admin</p>
                            <p className="text-xs text-cyan-500 font-mono">SYS_ROOT_01</p>
                        </div>
                        <div className="w-10 h-10 bg-cyan-950/50 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                            <Lock className="text-cyan-400 w-4 h-4" />
                        </div>
                    </div>
                </header>

                <div className="p-10">
                    <AnimatePresence mode="wait">

                        {/* TAB 1: THREAT INTELLIGENCE */}
                        {activeTab === 'threats' && (
                            <motion.div key="threats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">

                                {/* KPI CARDS */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Threats Blocked', value: totalBlocked, color: 'rose', icon: ShieldAlert },
                                        { label: 'Volumetric Attacks', value: volumetricCount, color: 'orange', icon: Activity },
                                        { label: 'Intrusion Attempts', value: intrusionCount, color: 'cyan', icon: Terminal },
                                        { label: 'Hostile IPs Logged', value: uniqueIPs, color: 'slate', icon: Globe },
                                    ].map((card, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="stat-card relative overflow-hidden" style={{ '--stat-top-color': card.color === 'rose' ? '#f43f5e' : card.color === 'orange' ? '#f97316' : card.color === 'cyan' ? '#06b6d4' : '#94a3b8' }}>
                                            <div className="absolute top-0 right-0 p-4 opacity-5"><card.icon className="w-16 h-16" /></div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
                                            <h3 className={`text-4xl font-black ${card.color === 'rose' ? 'text-rose-500' : card.color === 'orange' ? 'text-orange-500' : card.color === 'cyan' ? 'text-cyan-500' : 'text-slate-300'}`}>{card.value}</h3>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* LIVE TERMINAL FEED */}
                                <div className="rounded-2xl border border-white/[0.06] bg-[#060a14] shadow-2xl overflow-hidden">
                                    <div className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                                        <div className="flex space-x-2 mr-4">
                                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                        </div>
                                        <p className="text-xs font-mono text-slate-500 flex items-center">root@cets-firewall:~/var/log/ai_threats <span className="ml-2 w-1.5 h-3 bg-slate-400 animate-pulse"></span></p>
                                    </div>

                                    <div className="p-6 h-[500px] overflow-y-auto space-y-3 font-mono text-sm">
                                        {threatLogs.length === 0 ? (
                                            <p className="text-emerald-500 flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> [SYSTEM SECURE] No malicious activity detected in current timeframe.</p>
                                        ) : (
                                            threatLogs.map((log, idx) => (
                                                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={`p-4 rounded bg-white/[0.02] border-l-2 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-white/[0.04] transition-colors ${log.severity === 'Critical' ? 'border-rose-500' : 'border-amber-500'}`}>
                                                    <div className="flex flex-col space-y-1">
                                                        <div className="flex items-center space-x-3">
                                                            <span className="text-slate-500 text-xs">[{log.time}]</span>
                                                            <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${log.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>{log.type}</span>
                                                            <span className="text-cyan-400 font-bold tracking-wider">{log.ip}</span>
                                                        </div>
                                                        <p className="text-slate-400 text-xs flex items-center">
                                                            <span className="text-rose-400 font-bold mr-2">BLOCK_ACTION_TRIGGERED</span>
                                                            Target Endpoint: <span className="text-slate-300 ml-1">{log.endpoint_attacked}</span>
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 md:mt-0 text-right">
                                                        <span className="text-slate-600 text-[10px] uppercase block mb-1">Incident ID</span>
                                                        <span className="text-slate-300">{log.id}</span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 2: HISTORICAL ATTACK LEDGER */}
                        {activeTab === 'ledger' && (
                            <motion.div key="ledger" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-200">System Attack Ledger</h2>
                                        <p className="text-slate-400 text-sm mt-1">Immutable record of all deflected threats used for AI model retraining.</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Records</span>
                                        <span className="text-2xl font-black text-rose-500">{attackLedger.total_records.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/[0.06] bg-[#060a14] shadow-2xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-white/[0.02] border-b border-white/[0.06]">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Timestamp (UTC)</th>
                                                <th className="px-6 py-4 font-bold">Threat ID</th>
                                                <th className="px-6 py-4 font-bold">Attacker IP</th>
                                                <th className="px-6 py-4 font-bold">Vector</th>
                                                <th className="px-6 py-4 font-bold">Target Node</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {attackLedger.logs.length === 0 ? (
                                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No historical records found.</td></tr>
                                            ) : (
                                                attackLedger.logs.map((log, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4 font-mono text-slate-400">{new Date(log.timestamp_utc).toLocaleString()}</td>
                                                        <td className="px-6 py-4 font-mono text-slate-500">{log.id}</td>
                                                        <td className="px-6 py-4 font-bold text-cyan-500">{log.ip}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${log.type === 'Volumetric Attack' ? 'bg-orange-500/20 text-orange-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                                {log.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-slate-400">{log.endpoint_attacked}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 3: REAL-TIME TRAFFIC */}
                        {activeTab === 'traffic' && (
                            <motion.div key="traffic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="glass-card p-6 border-t-4 border-t-indigo-500 relative overflow-hidden">
                                        <Users className="absolute -right-4 -bottom-4 w-32 h-32 text-indigo-500/10" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Total 24h Active Users</p>
                                        <h3 className="text-4xl font-black text-slate-200">{activeSessions.total.toLocaleString()}</h3>
                                    </div>
                                    <div className="glass-card p-6 border-t-4 border-t-emerald-500 relative overflow-hidden">
                                        <Clock className="absolute -right-4 -bottom-4 w-32 h-32 text-emerald-500/10" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Employees Online</p>
                                        <h3 className="text-4xl font-black text-emerald-400">{activeSessions.employees.toLocaleString()}</h3>
                                    </div>
                                    <div className="glass-card p-6 border-t-4 border-t-amber-500 relative overflow-hidden">
                                        <Globe className="absolute -right-4 -bottom-4 w-32 h-32 text-amber-500/10" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Employers Online</p>
                                        <h3 className="text-4xl font-black text-amber-400">{activeSessions.employers.toLocaleString()}</h3>
                                    </div>
                                </div>

                                <div className="glass-card p-8 h-[450px]">
                                    <h3 className="text-lg font-bold flex items-center text-slate-200 mb-6"><LineChart className="mr-3 w-5 h-5 text-indigo-400" /> Authenticated Sessions (Last 24 Hours)</h3>
                                    <div className="h-80 w-full">
                                        {trafficStats.length === 0 ? (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500 italic">No traffic data available.</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={trafficStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                    <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                                    />
                                                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 4: USER REGISTRY */}
                        {activeTab === 'users' && (
                            <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center"><Users className="mr-3 text-indigo-400" /> Global User Registry</h2>
                                    <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-400">
                                        {userRegistry.length} Total Identities
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/[0.06] bg-[#060a14] shadow-2xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-white/[0.02] border-b border-white/[0.06]">
                                            <tr>
                                                <th className="px-6 py-4 font-bold">Identity</th>
                                                <th className="px-6 py-4 font-bold">Type</th>
                                                <th className="px-6 py-4 font-bold">Registration Data</th>
                                                <th className="px-6 py-4 font-bold">Last Active Protocol</th>
                                                <th className="px-6 py-4 font-bold">Access Node (IP)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {userRegistry.length === 0 ? (
                                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">No decentralized identities indexed yet.</td></tr>
                                            ) : (
                                                userRegistry.map((u, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-white/[0.08] group-hover:border-indigo-500/50 transition-colors">
                                                                    {u.name?.charAt(0) || 'U'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-200">{u.name}</p>
                                                                    <p className="text-[10px] font-mono text-slate-500">{u.id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.user_type === 'employee' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                                {u.user_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 font-mono text-xs text-slate-300">
                                                            {u.last_login ? new Date(u.last_login).toLocaleString() : '---'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-2">
                                                                <Globe className="w-3 h-3 text-slate-500" />
                                                                <span className="font-mono text-xs text-cyan-500">{u.last_login_ip || '0.0.0.0'}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 4: NETWORK HEALTH */}
                        {activeTab === 'network' && (
                            <motion.div key="network" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="glass-card p-8">
                                        <h3 className="text-lg font-bold flex items-center text-emerald-400 mb-4"><Database className="mr-3 w-5 h-5" /> Primary MongoDB Cluster</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400">Status</span><span className="text-emerald-400 font-bold">Online</span></div>
                                            <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400">Latency</span><span className="text-slate-200 font-mono">14ms</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">Collections Cached</span><span className="text-slate-200 font-mono">6/6</span></div>
                                        </div>
                                    </div>
                                    <div className="glass-card p-8">
                                        <h3 className="text-lg font-bold flex items-center text-cyan-400 mb-4"><Cpu className="mr-3 w-5 h-5" /> AI Threat Model</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400">Engine Status</span><span className="text-cyan-400 font-bold">Active</span></div>
                                            <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400">Algorithm</span><span className="text-slate-200 font-mono">Isolation Forest / SVM</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">Confidence Threshold</span><span className="text-slate-200 font-mono">98.5%</span></div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 5: SECURITY SETTINGS */}
                        {activeTab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-2xl">
                                <div className="glass-card p-10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <ShieldAlert className="w-24 h-24 text-rose-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2 flex items-center">
                                        <Lock className="mr-3 text-rose-500" /> Update Admin Passkey
                                    </h2>
                                    <p className="text-slate-400 text-sm mb-8">Change your root access credentials. Follow enterprise security standards.</p>

                                    {passwordStatus.msg && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`p-4 rounded-xl mb-6 flex items-center border ${passwordStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                            {passwordStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3" /> : <AlertTriangle className="w-5 h-5 mr-3" />}
                                            <span className="text-sm font-bold">{passwordStatus.msg}</span>
                                        </motion.div>
                                    )}

                                    <form onSubmit={handlePasswordChange} className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Current Passkey</label>
                                            <input required type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} className="w-full bg-black/40 border border-white/[0.06] rounded-xl p-4 outline-none focus:border-rose-500/50 transition-all font-mono text-rose-400" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">New Passkey</label>
                                            <input required type="password" value={passwordForm.new} onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} className="w-full bg-black/40 border border-white/[0.06] rounded-xl p-4 outline-none focus:border-rose-500/50 transition-all font-mono text-rose-400" />
                                            <div className="h-1 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${passwordStrength}%` }} className={`h-full ${passwordStrength <= 25 ? 'bg-rose-500' : passwordStrength <= 50 ? 'bg-amber-500' : passwordStrength <= 75 ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                            </div>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-right">Complexity Score: {passwordStrength}%</p>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Confirm New Passkey</label>
                                            <input required type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="w-full bg-black/40 border border-white/[0.06] rounded-xl p-4 outline-none focus:border-rose-500/50 transition-all font-mono text-rose-400" />
                                        </div>

                                        <button type="submit" className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white font-black rounded-xl uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-all flex items-center justify-center">
                                            <ShieldAlert className="w-5 h-5 mr-3" /> Commit Changes
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}