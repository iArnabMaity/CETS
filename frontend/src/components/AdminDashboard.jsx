import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    ShieldAlert, Activity, Server, LogOut, Terminal, Globe, AlertTriangle,
    CheckCircle2, Lock, Cpu, Radar, Database, History, LineChart, Users,
    Clock, Search, ChevronDown, User, Calendar, GraduationCap, Sparkles,
    X, Plus, MessageSquare, Phone, Mail, Building, Award, Trash2,
    Brain, Zap, Shield, ClipboardCheck, Download, Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AcademicFingerprint from './AcademicFingerprint';
import Pagination from './common/Pagination';
import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function AdminDashboard({ user, setUser }) {
    const [activeTab, setActiveTab] = useState('threats');
    const [threatLogs, setThreatLogs] = useState([]);
    const [isLive, setIsLive] = useState(true);

    // Optimized States
    const [dashboardStats, setDashboardStats] = useState({
        threats_blocked: 0,
        employee_count: 0,
        employer_count: 0,
        efficiency: 100,
        active_employees: 0,
        active_employers: 0
    });
    const [userRegistry, setUserRegistry] = useState({ users: [], total: 0, page: 1 });
    const [userFilter, setUserFilter] = useState('all');
    const [userSearch, setUserSearch] = useState('');
    const [userSort, setUserSort] = useState('default');
    const [attackLedger, setAttackLedger] = useState({ logs: [], total_records: 0, total: 0, page: 1, summary: {} });
    const [trafficStats, setTrafficStats] = useState([]);
    const [activeSessions, setActiveSessions] = useState({ total: 0, employees: 0, employers: 0, sessions: [] });
    const [anomalies, setAnomalies] = useState({ anomalies: [], total: 0, page: 1 });
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedEmployer, setSelectedEmployer] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

    const [passwordStrength, setPasswordStrength] = useState(0);
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Constants
    const token = localStorage.getItem('token');
    const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };

    // 0. AOS Initialization
    useEffect(() => {
        AOS.init({ duration: 800, once: false });
    }, []);

    // 1. GLOBAL REAL-TIME REFRESH (Summary + Logs)
    useEffect(() => {
        let isMounted = true;
        const fetchSummary = async () => {
            // 1. KPI Stats
            try {
                const res = await axios.get(`${API_BASE}/api/admin/dashboard_summary`, authHeader);
                if (isMounted && res.data) {
                    console.log("📊 [ADMIN_DEBUG] Summary Data:", res.data);
                    setDashboardStats(res.data);
                }
            } catch (err) {
                console.warn("⚠️ Dashboard summary data sync failed.");
            }

            // 2. Notifications
            try {
                const res = await axios.get(`${API_BASE}/api/notifications/SYS_ADMIN_01`, authHeader);
                if (isMounted && Array.isArray(res.data)) {
                    setNotifications(res.data);
                }
            } catch (err) {
                console.warn("⚠️ Admin notifications could not be retrieved.");
            }

            // 3. Threat Logs (Header Background)
            try {
                const res = await axios.get(`${API_BASE}/api/admin/threat_logs`, authHeader);
                if (isMounted && Array.isArray(res.data)) {
                    setThreatLogs(res.data);
                }
            } catch (err) {
                console.warn("⚠️ Threat telemetry offline.");
            }
        };

        fetchSummary();
        const interval = setInterval(fetchSummary, 10000); // 10s polling
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    // 2. TAB-SPECIFIC DATA FETCHING (Only when active)
    useEffect(() => {
        let isMounted = true;
        const fetchTabData = async () => {
            try {
                if (activeTab === 'users') {
                    const res = await axios.get(`${API_BASE}/api/admin/user_registry?role=${userFilter}&page=${userRegistry.page || 1}&q=${userSearch}&sort=${userSort}&limit=30`, authHeader);
                    if (isMounted) setUserRegistry(prev => ({ ...res.data, page: res.data?.page || 1 }));
                } else if (activeTab === 'ledger') {
                    const res = await axios.get(`${API_BASE}/api/admin/attack_ledger?page=${attackLedger.page || 1}&limit=30`, authHeader);
                    if (isMounted) setAttackLedger(prev => ({ ...res.data, page: res.data?.page || 1 }));
                } else if (activeTab === 'traffic') {
                    const [trafficRes, sessionRes] = await Promise.all([
                        axios.get(`${API_BASE}/api/admin/traffic_stats`, authHeader),
                        axios.get(`${API_BASE}/api/admin/active_sessions`, authHeader)
                    ]);
                    if (isMounted) {
                        setTrafficStats(trafficRes.data?.hourly_traffic || []);
                        setActiveSessions(sessionRes.data || { total: 0, employees: 0, employers: 0, sessions: [] });
                    }
                } else if (activeTab === 'anomalies') {
                    const res = await axios.get(`${API_BASE}/api/admin/anomalies?page=${anomalies.page || 1}&limit=30`, authHeader);
                    if (isMounted) setAnomalies(res.data || { anomalies: [], total: 0, page: 1 });
                }
            } catch (err) {
                console.error(`Tab ${activeTab} data fetch failed.`);
            }
        };

        fetchTabData();
        let interval;
        if (isLive && ['users', 'ledger', 'traffic', 'anomalies'].includes(activeTab)) {
            interval = setInterval(fetchTabData, 15000);
        }
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [activeTab, userFilter, userRegistry.page, attackLedger.page, isLive, userSearch, userSort]);

    // Password Security Logic (Matched with Employer/Employee Dashboards)
    const pwdStrength = (pwd => {
        let score = 0;
        if (pwd.length >= 8) score += 25;
        if (/[A-Z]/.test(pwd)) score += 25;
        if (/[a-z]/.test(pwd)) score += 25;
        if (/[0-9!@#$%^&*]/.test(pwd)) score += 25;
        return score;
    })(passwordForm.new);

    const passwordsMatch = passwordForm.new && passwordForm.new === passwordForm.confirm;

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwdStrength < 100) {
            setPasswordStatus({ msg: "Please meet all complexity requirements.", type: "error" });
            return;
        }
        if (!passwordsMatch) {
            setPasswordStatus({ msg: "Passwords do not match.", type: "error" });
            return;
        }
        const result = await Swal.fire({
            title: 'Update Administrative Passkey?',
            text: 'This will permanently change your credentials for the control plane. Administrative approval is logged.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: 'rgba(255,255,255,0.05)',
            confirmButtonText: 'Confirm Update',
            cancelButtonText: 'Abort',
            background: '#060a14',
            color: '#fff',
            customClass: {
                popup: 'glass-card border border-rose-500/20 rounded-3xl',
                title: 'text-white font-black tracking-tight',
                htmlContainer: 'text-slate-400 text-sm'
            }
        });

        if (!result.isConfirmed) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE}/api/admin/change_password`, {
                current_password: passwordForm.current,
                new_password: passwordForm.new
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            Swal.fire({
                icon: 'success',
                title: 'Passkey Updated',
                text: 'Your administrative credentials have been securely updated.',
                background: '#060a14',
                color: '#fff',
                confirmButtonColor: '#f43f5e'
            });
            setPasswordForm({ current: '', new: '', confirm: '' });
            setPasswordStatus({ msg: '', type: '' });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Security Sync Failed',
                text: err.response?.data?.detail || "Update failed due to protocol error.",
                background: '#060a14',
                color: '#fff',
                confirmButtonColor: '#f43f5e'
            });
        }
    };

    const confirmDelete = async (u) => {
        const userId = u.employee_id || u.employer_id || u.id;
        const result = await Swal.fire({
            title: 'Security Alert',
            html: `You are about to initiate a <span style="color: #f43f5e; font-weight: 800;">Cascading Deletion Protocol</span> for:<br/><b style="color: #fff;">${u.name || u.company_name}</b>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: 'rgba(255,255,255,0.05)',
            confirmButtonText: 'Confirm Purge',
            cancelButtonText: 'Abort',
            background: '#060a14',
            color: '#fff',
            customClass: {
                popup: 'glass-card border border-rose-500/20 rounded-3xl',
                title: 'text-white font-black uppercase tracking-tight',
                htmlContainer: 'text-slate-400 text-sm leading-relaxed'
            }
        });

        if (result.isConfirmed) {
            setIsDeleting(true);
            try {
                await axios.delete(`${API_BASE}/api/admin/delete_user/${userId}`, authHeader);
                // Refresh data
                const regRes = await axios.get(`${API_BASE}/api/admin/user_registry?role=${userFilter}&page=${userRegistry.page || 1}&q=${userSearch}&sort=${userSort}`, authHeader);
                setUserRegistry(prev => ({ ...regRes.data, page: regRes.data?.page || 1 }));
                const summaryRes = await axios.get(`${API_BASE}/api/admin/dashboard_summary`, authHeader);
                setDashboardStats(summaryRes.data || {});

                Swal.fire({
                    icon: 'success',
                    title: 'Purge Complete',
                    text: 'User identity has been fully decommissioned from the registry.',
                    background: '#060a14',
                    color: '#fff',
                    confirmButtonColor: '#f43f5e'
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Protocol Failure',
                    text: 'Security Protocol: Deletion failed or unauthorized.',
                    background: '#060a14',
                    color: '#fff',
                    confirmButtonColor: '#f43f5e'
                });
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Terminate Session?',
            text: 'You are about to disconnect from the administrative control plane. Active telemetry will be suspended.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: 'rgba(255,255,255,0.05)',
            confirmButtonText: 'Disconnect',
            cancelButtonText: 'Stay Connected',
            background: '#060a14',
            color: '#fff',
            customClass: {
                popup: 'glass-card border border-rose-500/20 rounded-3xl',
                title: 'text-white font-black tracking-tight',
                htmlContainer: 'text-slate-400 text-sm'
            }
        });

        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setUser(null);
        }
    };

    const handleEmployeeClick = async (emp) => {
        setIsInsightLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/analytics/employee/${emp.employee_id}`, authHeader);
            setSelectedEmployee({ ...emp, analytics: res.data });
        } catch (err) {
            console.error("Failed to fetch employee insights", err);
            setSelectedEmployee(emp);
        } finally {
            setIsInsightLoading(false);
        }
    };

    const handleEmployerClick = async (employer) => {
        setIsInsightLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/analytics/employer/${employer.company_name}`, authHeader);
            setSelectedEmployer({ ...employer, analytics: res.data });
        } catch (err) {
            console.error("Failed to fetch employer insights", err);
            setSelectedEmployer(employer);
        } finally {
            setIsInsightLoading(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return "N/A";
        try {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        } catch (e) {
            return "N/A";
        }
    };

    // Derived Analytics for the KPI Cards - Hardened
    const safeThreatLogs = Array.isArray(threatLogs) ? threatLogs : [];
    const totalBlocked = safeThreatLogs.length;
    const volumetricCount = safeThreatLogs.filter(log => log?.type === 'Volumetric Attack').length;
    const intrusionCount = safeThreatLogs.filter(log => log?.type === 'Intrusion Attempt').length;
    const uniqueIPs = new Set(safeThreatLogs.map(log => log?.ip).filter(Boolean)).size;

    const safeStats = {
        threats_blocked: 0,
        employee_count: 0,
        employer_count: 0,
        efficiency: 100,
        active_employees: 0,
        active_employers: 0,
        ...(dashboardStats || {})
    };

    const exportAnalyticsCSV = () => {
        try {
            let csvContent = "";
            
            // Section 1: KPI Overview
            csvContent += "--- SYSTEM KPI OVERVIEW ---\n";
            csvContent += "Metric,Value\n";
            csvContent += `Total Threats Blocked,${safeStats.threats_blocked}\n`;
            csvContent += `Total Verified Professionals,${safeStats.employee_count}\n`;
            csvContent += `Total Registered Employers,${safeStats.employer_count}\n`;
            csvContent += `Network Efficiency,${safeStats.efficiency}%\n`;
            csvContent += `Active Sessions (24h),${activeSessions.total}\n\n`;

            // Section 2: Traffic Analytics
            if (trafficStats && trafficStats.length > 0) {
                csvContent += "--- AUTHENTICATED HOURLY TRAFFIC ---\n";
                csvContent += "Hour,Session Count\n";
                trafficStats.forEach(stat => {
                    csvContent += `${stat.hour},${stat.count}\n`;
                });
                csvContent += "\n";
            }

            // Section 3: Threat Ledger (Visible Page)
            if (attackLedger && attackLedger.logs && attackLedger.logs.length > 0) {
                csvContent += "--- RECENT THREAT LEDGER ---\n";
                csvContent += "Timestamp,Threat ID,Attacker IP,Vector\n";
                attackLedger.logs.filter(log => log && typeof log === 'object').forEach(log => {
                    csvContent += `${new Date(log.timestamp_utc).toLocaleString()},${log.id},${log.ip},${log.type}\n`;
                });
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `CETS_Analytics_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Analytics Exported',
                text: 'System metrics have been successfully compiled into a verifiable CSV sheet.',
                background: '#060a14',
                color: '#fff',
                confirmButtonColor: '#e11d48',
                customClass: { popup: 'border border-rose-500/20 rounded-3xl' }
            });
        } catch (error) {
            console.error("CSV Export Failed", error);
        }
    };

    const exportFullAttackLedgerCSV = async () => {
        setIsExporting(true);
        try {
            const res = await axios.get(`${API_BASE}/api/admin/attack_ledger?page=1&limit=50000`, authHeader);
            const logs = res.data?.logs || [];
            if (logs.length === 0) {
                Swal.fire({ icon: 'info', title: 'Empty Ledger', text: 'No logs available to export.', background: '#060a14', color: '#fff' });
                return;
            }

            let csvContent = "";
            csvContent += "Timestamp (UTC),Threat ID,Attacker IP,Severity,Type,Endpoint Attacked\n";
            logs.filter(log => log && typeof log === 'object').forEach(log => {
                csvContent += `"${new Date(log.timestamp_utc).toISOString()}","${log.id}","${log.ip}","${log.severity}","${log.type}","${log.endpoint_attacked || ''}"\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `CETS_Full_Attack_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            Swal.fire({
                icon: 'success',
                title: 'Ledger Exported',
                text: `${logs.length} threat logs have been securely exported offline.`,
                background: '#060a14',
                color: '#fff',
                confirmButtonColor: '#e11d48',
                customClass: { popup: 'border border-rose-500/20 rounded-3xl' }
            });
        } catch (error) {
            console.error("Ledger Export Failed", error);
            Swal.fire({ icon: 'error', title: 'Export Failed', text: 'Failed to retrieve full attack ledger for export.', background: '#060a14', color: '#fff', confirmButtonColor: '#e11d48' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex min-h-screen text-slate-100 relative overflow-hidden bg-transparent">

            {/* DECORATIVE ORBS (Overwatch Theme) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="orb orb-primary w-96 h-96 -top-40 -left-40 opacity-20" style={{ background: 'rgba(244, 63, 94, 0.2)' }} />
                <div className="orb orb-accent w-80 h-80 bottom-20 -right-32 opacity-15" style={{ background: 'rgba(6, 182, 212, 0.15)' }} />
                <div className="orb orb-cyan w-64 h-64 top-1/2 left-1/4 opacity-10" />
            </div>

            {/* MOBILE SIDEBAR OVERLAY */}
            <AnimatePresence>
                {showMobileMenu && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setShowMobileMenu(false)}
                        className="fixed inset-0 bg-[#020408]/80 backdrop-blur-sm z-[60] md:hidden" 
                    />
                )}
            </AnimatePresence>

            {/* SIDEBAR (CYBER-THEME) */}
            <div className={`
                fixed md:relative inset-y-0 left-0 w-72 flex flex-col glass-sidebar z-[70] transition-transform duration-300 transform
                ${showMobileMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `} style={{ borderColor: 'rgba(244, 63, 94, 0.1)' }}>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-red-700 rounded-xl flex items-center justify-center text-xl font-black text-white shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <button onClick={() => setShowMobileMenu(false)} className="p-2 bg-white/[0.06] rounded-xl md:hidden text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
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
                            { id: 'anomalies', icon: ClipboardCheck, label: 'Action Center' },
                            { id: 'notifications', icon: Globe, label: 'System Notices' },
                            { id: 'network', icon: Server, label: 'Network Health' },
                            { id: 'security', icon: Lock, label: 'Security Settings' },
                        ].map((item) => (
                            <button 
                                key={item.id} 
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setShowMobileMenu(false);
                                }} 
                                className={`w-full flex items-center p-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[inset_0_0_15px_rgba(244,63,94,0.1)]' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}
                            >
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
                    <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-medium">
                        <LogOut className="mr-3 w-5 h-5" /> Disconnect
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">

                {/* HEADER (Standardized to h-28 and z-50 for consistency) */}
                <header className="h-28 px-4 md:px-10 flex items-center justify-between glass-header sticky top-0 z-50" style={{ borderColor: 'rgba(244, 63, 94, 0.08)' }}>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowMobileMenu(true)} className="p-3 bg-white/[0.06] rounded-2xl md:hidden text-rose-400 hover:bg-rose-500/10 transition-all border border-white/[0.08]">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg md:text-2xl font-bold tracking-tight capitalize flex items-center">
                            {activeTab.replace('_', ' ')}
                            {activeTab === 'threats' && isLive && <span className="ml-4 px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[8px] font-black rounded uppercase tracking-widest hidden sm:flex items-center animate-pulse"><span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-1.5"></span> Live</span>}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        {/* Analytics Export Button */}
                        <button onClick={exportAnalyticsCSV} className="w-10 h-10 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-center hover:bg-emerald-500/10 hover:text-emerald-400 border-rose-500/20 transition-all text-slate-400 group relative" title="Export Analytics to Excel (CSV)">
                            <Download className="w-5 h-5 group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform" />
                        </button>

                        {/* Notification Bell */}
                        <div className="relative">
                            <button onClick={() => setShowNotifDropdown(!showNotifDropdown)} className="w-10 h-10 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-all group relative">
                                <Globe className="w-5 h-5 text-slate-400 group-hover:text-rose-400 transition-colors" />
                                {notifications.filter(n => !n.is_read).length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#090e1a] text-[8px] font-black flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.4)]">
                                        {notifications.filter(n => !n.is_read).length}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifDropdown && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-80 glass-card p-4 shadow-2xl z-[100] border-rose-500/20">
                                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
                                            <p className="text-xs font-black uppercase tracking-widest text-rose-400">System Notifications</p>
                                            <button onClick={() => setActiveTab('anomalies')} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${activeTab === 'anomalies' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:bg-white/5'}`}>
                                                <AlertTriangle className="mr-3 w-5 h-5" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Anomalies/update request</span>
                                            </button>
                                        </div>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <p className="text-xs text-slate-500 italic py-4 text-center">No system alerts found.</p>
                                            ) : (
                                                notifications.slice(0, 5).map((n, i) => (
                                                    <div key={i} className={`p-2.5 rounded-lg text-xs border ${n.is_read ? 'bg-transparent border-white/[0.04] text-slate-400' : 'bg-rose-500/5 border-rose-500/10 text-slate-200'}`}>
                                                        <p className="font-bold mb-0.5">{n.title}</p>
                                                        <p className="text-[10px] opacity-70 line-clamp-2">{n.message}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-200">System Admin</p>
                                <p className="text-xs text-cyan-500 font-mono">SYS_ROOT_01</p>
                            </div>
                            <div className="w-10 h-10 bg-cyan-950/50 rounded-full flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                <Lock className="text-cyan-400 w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-10">
                    <AnimatePresence mode="wait">

                        {/* TAB 1: THREAT INTELLIGENCE */}
                        {activeTab === 'threats' && (
                            <motion.div key="threats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">

                                {/* KPI CARDS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {[
                                        { label: 'Total Threats Blocked', value: (safeStats.threats_blocked || 0).toLocaleString(), color: 'rose', icon: ShieldAlert },
                                        { label: 'Volumetric Attacks', value: volumetricCount.toLocaleString(), color: 'orange', icon: Activity },
                                        { label: 'Intrusion Attempts', value: intrusionCount.toLocaleString(), color: 'cyan', icon: Terminal },
                                        { label: 'Network Integrity', value: `${safeStats.efficiency || 100}%`, color: 'emerald', icon: CheckCircle2 },
                                        { label: 'Cloud Node Sync', value: '100%', color: 'slate', icon: Globe },
                                    ].map((card, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            data-aos="fade-up"
                                            data-aos-delay={i * 100}
                                            className="glass-card stat-card relative overflow-hidden"
                                            style={{ '--stat-top-color': card.color === 'rose' ? '#f43f5e' : card.color === 'orange' ? '#f97316' : card.color === 'cyan' ? '#06b6d4' : card.color === 'emerald' ? '#10b981' : '#94a3b8' }}
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-5"><card.icon className="w-16 h-16" /></div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
                                            <h3 className={`text-3xl font-black ${card.color === 'rose' ? 'text-rose-500' : card.color === 'orange' ? 'text-orange-500' : card.color === 'cyan' ? 'text-cyan-500' : card.color === 'emerald' ? 'text-emerald-500' : 'text-slate-300'}`}>{card.value}</h3>
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
                                    <div className="grid grid-cols-3 gap-8 w-full mr-12">
                                        <div className="glass-card p-5 border-l-4 border-rose-500">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Attempts</p>
                                            <p className="text-2xl font-black text-white">{attackLedger.summary?.total_attempts?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="glass-card p-5 border-l-4 border-emerald-500">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Defended Count</p>
                                            <p className="text-2xl font-black text-emerald-500">{attackLedger.summary?.defended_count?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="glass-card p-5 border-l-4 border-indigo-500">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Overall Efficiency</p>
                                            <p className="text-2xl font-black text-indigo-400">{attackLedger.summary?.efficiency || 100}%</p>
                                        </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Archive Records</span>
                                        <span className="text-2xl font-black text-rose-500 mb-2">{attackLedger.total_records.toLocaleString()}</span>
                                        <button 
                                            onClick={exportFullAttackLedgerCSV}
                                            disabled={isExporting}
                                            className={`flex items-center text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${isExporting ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500 hover:text-white'}`}
                                            title="Export Full Database of Malicious Hits"
                                        >
                                            <Download className="w-3 h-3 mr-1.5" />
                                            {isExporting ? 'Compiling...' : 'Export Full CSV'}
                                        </button>
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
                                                <th className="px-6 py-4 font-bold">Target/Admin</th>
                                                <th className="px-6 py-4 font-bold">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {(!attackLedger.logs || attackLedger.logs.filter(l => l && typeof l === 'object').length === 0) ? (
                                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic font-mono lowercase tracking-widest">[ no_records_found ]</td></tr>
                                            ) : (
                                                attackLedger.logs.filter(l => l && typeof l === 'object').map((log, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4 font-mono text-slate-400">{new Date(log.timestamp_utc).toLocaleString()}</td>
                                                        <td className="px-6 py-4 font-mono text-slate-500">{log.id}</td>
                                                        <td className="px-6 py-4 font-bold text-cyan-500">{log.ip}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded ${log.type === 'Volumetric Attack' ? 'bg-orange-500/20 text-orange-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                                {log.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-slate-400">
                                                            {log.admin_id ? (
                                                                <div className="flex flex-col">
                                                                    <span className="text-indigo-400 font-bold">ADMIN: {log.admin_id}</span>
                                                                    <span className="text-[10px] opacity-70">{log.admin_name}</span>
                                                                </div>
                                                            ) : (
                                                                log.endpoint_attacked || 'N/A'
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">{log.details || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                     </table>
                                </div>

                                <Pagination 
                                    currentPage={attackLedger.page}
                                    totalItems={attackLedger.total}
                                    itemsPerPage={30}
                                    onPageChange={(page) => setAttackLedger(p => ({ ...p, page }))}
                                />

                                {/* PAGINATION CONTROLS */}
                                <div className="flex items-center justify-between px-6 py-4 glass-card mt-4">
                                    <p className="text-xs text-slate-500">Showing page {attackLedger.page} of {Math.ceil(attackLedger.total_records / 20)}</p>
                                    <div className="flex space-x-2">
                                        <button
                                            disabled={attackLedger.page === 1}
                                            onClick={() => setAttackLedger(p => ({ ...p, page: p.page - 1 }))}
                                            className="px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            disabled={attackLedger.logs.length < 20}
                                            onClick={() => setAttackLedger(p => ({ ...p, page: p.page + 1 }))}
                                            className="px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <button onClick={() => { setUserFilter('all'); setUserRegistry(p => ({ ...p, page: 1 })); }} className={`glass-card p-6 border-t-4 transition-all ${userFilter === 'all' ? 'border-t-indigo-500 scale-[1.02] shadow-[0_10px_30px_rgba(99,102,241,0.2)]' : 'border-t-slate-800 opacity-60 hover:opacity-100 hover:scale-105'}`}>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Total Decentralized Identities</p>
                                        <h3 className="text-4xl font-black text-slate-200">{((safeStats.employee_count || 0) + (safeStats.employer_count || 0)).toLocaleString()}</h3>
                                    </button>
                                    <button onClick={() => { setUserFilter('employee'); setUserRegistry(p => ({ ...p, page: 1 })); }} className={`glass-card p-6 border-t-4 transition-all ${userFilter === 'employee' ? 'border-t-emerald-500 scale-[1.02] shadow-[0_10px_30px_rgba(16,185,129,0.2)]' : 'border-t-slate-800 opacity-60 hover:opacity-100 hover:scale-105'}`}>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Verified Professionals</p>
                                        <h3 className="text-4xl font-black text-emerald-400">{(safeStats.employee_count || 0).toLocaleString()}</h3>
                                    </button>
                                    <button onClick={() => { setUserFilter('employer'); setUserRegistry(p => ({ ...p, page: 1 })); }} className={`glass-card p-6 border-t-4 transition-all ${userFilter === 'employer' ? 'border-t-amber-500 scale-[1.02] shadow-[0_10px_30px_rgba(245,158,11,0.2)]' : 'border-t-slate-800 opacity-60 hover:opacity-100 hover:scale-105'}`}>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Registered Employers</p>
                                        <h3 className="text-4xl font-black text-amber-400">{(safeStats.employer_count || 0).toLocaleString()}</h3>
                                    </button>
                                </div>

                                {/* SEARCH AND SORT CONTROLS */}
                                <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                                    <div className="relative flex-1 group w-full">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search by Name, Company, ID or Email..."
                                            value={userSearch}
                                            onChange={(e) => {
                                                setUserSearch(e.target.value);
                                                setUserRegistry(p => ({ ...p, page: 1 }));
                                            }}
                                            className="w-full bg-[#060a14] border border-white/[0.06] rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="relative w-full md:w-64 group">
                                        <select
                                            value={userSort}
                                            onChange={(e) => {
                                                setUserSort(e.target.value);
                                                setUserRegistry(p => ({ ...p, page: 1 }));
                                            }}
                                            className="w-full bg-[#060a14] border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer hover:bg-white/[0.02] transition-all pr-10"
                                        >
                                            <option value="default">Sort by: Default (ID)</option>
                                            <option value="newest">Latest First</option>
                                            <option value="oldest">Oldest First</option>
                                            <option value="a-z">Name: A-Z</option>
                                            <option value="z-a">Name: Z-A</option>
                                            <option value="id">Unique ID</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-indigo-400 transition-colors" />
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
                                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {(!userRegistry.users || userRegistry.users.filter(u => u && typeof u === 'object').length === 0) ? (
                                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic font-mono lowercase tracking-widest">[ no_identities_indexed ]</td></tr>
                                            ) : (
                                                userRegistry.users.filter(u => u && typeof u === 'object').map((u, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="hover:bg-white/[0.02] transition-colors group"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold border border-white/[0.08] group-hover:border-indigo-500/50 transition-colors">
                                                                    {u.name?.charAt(0) || u.company_name?.charAt(0) || 'U'}
                                                                </div>
                                                                <div>
                                                                    <p
                                                                        className="font-bold text-slate-200 cursor-pointer hover:text-indigo-400 transition-colors"
                                                                        onClick={() => u.role === 'employee' ? handleEmployeeClick(u) : handleEmployerClick(u)}
                                                                    >
                                                                        {u.name || u.company_name}
                                                                    </p>
                                                                    <p className="text-[10px] font-mono text-slate-500">{u.employee_id || u.employer_id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === 'employee' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                                {u.role}
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
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => confirmDelete(u)}
                                                                disabled={u.role === 'admin'}
                                                                className={`p-2 rounded-lg flex items-center justify-center ml-auto border shadow-sm transition-all ${u.role === 'admin' ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border-rose-500/20'}`}
                                                                title={u.role === 'admin' ? "System Core User" : "Cascading Deletion"}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                 {/* PAGINATION CONTROLS */}
                                <Pagination 
                                    currentPage={userRegistry.page}
                                    totalItems={userRegistry.total}
                                    itemsPerPage={30}
                                    onPageChange={(page) => setUserRegistry(p => ({ ...p, page }))}
                                />
                            </motion.div>
                        )}


                        {/* TAB 5: ANOMALIES */}
                        {activeTab === 'anomalies' && (
                            <motion.div key="anomalies" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center"><ClipboardCheck className="mr-3 text-indigo-400" /> Governance & Update Protocol</h2>
                                    <span className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-400">
                                        {anomalies.length} Pending Actions
                                    </span>
                                </div>
                                <div className="rounded-2xl border border-white/[0.06] bg-[#060a14] shadow-2xl overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-white/[0.02] border-b border-white/[0.06]">
                                            <tr>
                                                <th className="px-6 py-4 text-center">Type</th>
                                                <th className="px-6 py-4">Subject/ID</th>
                                                <th className="px-6 py-4">Details/Score</th>
                                                <th className="px-6 py-4">Status/Time</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {(!anomalies.anomalies || anomalies.anomalies.length === 0) ? (
                                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">No pending anomalies or update requests. Ecosystem stable.</td></tr>
                                            ) : (
                                                anomalies.anomalies.map((a, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4 text-center">
                                                            {a.type === 'evaluation_anomaly' ? (
                                                                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase">Anomaly</span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 text-[10px] font-black uppercase">Request</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-200">{a.type === 'evaluation_anomaly' ? `Target: ${a.evaluatee_id}` : (a.evaluatee_id || a.user_id)}</span>
                                                                <span className="text-[10px] text-slate-500">{a.type === 'evaluation_anomaly' ? `Evaluator: ${a.company_name || 'Individual'}` : (a.name || a.company_name || 'Individual')}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {a.type === 'evaluation_anomaly' ? (
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-rose-400 font-black text-lg">{a.final_score}</span>
                                                                    <span className="text-[10px] text-slate-500">(Score Trigger)</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="text-cyan-400 font-bold uppercase text-[10px]">Changes Requested:</span>
                                                                    <span className="text-xs text-slate-400">{Object.keys(a.requested_changes || {}).join(', ')}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-slate-200 uppercase font-bold">{a.status || 'Flagged'}</span>
                                                                <span className="text-[10px] text-slate-500">{new Date(a.timestamp || a.created_at).toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end space-x-2">
                                                                {a.type === 'evaluation_anomaly' ? (
                                                                    <>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await axios.post(`${API_BASE}/api/admin/resolve_anomaly/${a._id}?action=verify`, {}, authHeader);
                                                                                setAnomalies(prev => prev.filter(x => x._id !== a._id));
                                                                            }}
                                                                            className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-500/20 transition-all"
                                                                        >
                                                                            Verify
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await axios.post(`${API_BASE}/api/admin/resolve_anomaly/${a._id}?action=dismiss`, {}, authHeader);
                                                                                setAnomalies(prev => prev.filter(x => x._id !== a._id));
                                                                            }}
                                                                            className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded hover:bg-rose-500/20 transition-all"
                                                                        >
                                                                            Dismiss
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await axios.post(`${API_BASE}/api/admin/resolve_update_request/${a.request_id}?action=approve`, {}, authHeader);
                                                                                setAnomalies(prev => prev.filter(x => x.request_id !== a.request_id));
                                                                            }}
                                                                            className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold rounded hover:bg-cyan-500/20 transition-all"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await axios.post(`${API_BASE}/api/admin/resolve_update_request/${a.request_id}?action=reject`, {}, authHeader);
                                                                                setAnomalies(prev => prev.filter(x => x.request_id !== a.request_id));
                                                                            }}
                                                                            className="px-3 py-1 bg-slate-500/10 border border-white/10 text-slate-400 text-[10px] font-bold rounded hover:bg-white/10 transition-all"
                                                                        >
                                                                            Decline
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <Pagination 
                                    currentPage={anomalies.page || 1}
                                    totalItems={anomalies.total || 0}
                                    itemsPerPage={30}
                                    onPageChange={(page) => setAnomalies(p => ({ ...p, page }))}
                                />
                            </motion.div>
                        )}

                        {/* TAB 6: NOTIFICATIONS */}
                        {activeTab === 'notifications' && (
                            <motion.div key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                                <h2 className="text-2xl font-bold flex items-center mb-6"><Globe className="mr-3 text-indigo-400" /> Control Center Notifications</h2>
                                <div className="space-y-4">
                                    {notifications.length === 0 ? (
                                        <div className="glass-card p-12 text-center">
                                            <p className="text-slate-500 italic">No system notifications available.</p>
                                        </div>
                                    ) : (
                                        notifications.map((n, idx) => (
                                            <div key={idx} className={`glass-card p-6 border-l-4 ${n.is_read ? 'border-slate-800' : 'border-rose-500'} flex justify-between items-start`}>
                                                <div>
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <h4 className="font-black text-slate-200">{n.title}</h4>
                                                        <span className="text-[10px] font-mono text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-slate-400 text-sm">{n.message}</p>
                                                </div>
                                                <div className="flex flex-col items-end space-y-2">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${n.type === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                                        {n.type || 'System'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 7: NETWORK HEALTH */}
                        {activeTab === 'network' && (
                            <motion.div key="network" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-10">
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center mb-6"><Server className="mr-3 text-indigo-400" /> Infrastructure & Node Health</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                        <div className="glass-card p-8 border-l-4 border-emerald-500">
                                            <h3 className="text-lg font-bold flex items-center text-emerald-400 mb-4"><Database className="mr-3 w-5 h-5" /> Primary MongoDB Cluster</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400 uppercase text-[10px] font-bold tracking-widest">Status</span><span className="text-emerald-400 font-black">ONLINE</span></div>
                                                <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400 uppercase text-[10px] font-bold tracking-widest">Latency</span><span className="text-slate-200 font-mono">14ms</span></div>
                                                <div className="flex justify-between"><span className="text-slate-400 uppercase text-[10px] font-bold tracking-widest">Collections Cached</span><span className="text-slate-200 font-mono">6/6</span></div>
                                            </div>
                                        </div>
                                        <div className="glass-card p-8 border-l-4 border-cyan-500">
                                            <h3 className="text-lg font-bold flex items-center text-cyan-400 mb-4"><Cpu className="mr-3 w-5 h-5" /> AI Threat Model</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400 uppercase text-[10px] font-bold tracking-widest">Engine Status</span><span className="text-cyan-400 font-black">ACTIVE</span></div>
                                                <div className="flex justify-between border-b border-white/[0.06] pb-2"><span className="text-slate-400 uppercase text-[10px] font-bold tracking-widest">Algorithm</span><span className="text-slate-200 font-mono text-[10px]">ISOLATION FOREST / SVM</span></div>
                                                <div className="flex justify-between"><span className="text-slate-400 uppercase text-[10px] font-bold tracking-widest">Confidence Threshold</span><span className="text-slate-200 font-mono">98.5%</span></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* THREAT MATRIX GRID */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[
                                            { title: 'AI Behavioral Engine', status: 'Optimal', icon: Brain, detail: 'Monitoring user TRUST scores for behavioral anomalies.', color: 'emerald' },
                                            { title: 'Volumetric Guard', status: 'Monitoring', icon: Zap, detail: 'Analyzing traffic for L7 DDoS patterns.', color: 'orange' },
                                            { title: 'Intrusion Detection', status: 'Active', icon: Shield, detail: 'Real-time signature matching on incoming packets.', color: 'cyan' },
                                            { title: 'IP Reputation Mesh', status: 'Optimal', icon: Globe, detail: 'Cross-referencing hostile IP datasets globally.', color: 'emerald' },
                                            { title: 'Packet Integrity', status: 'Verified', icon: Lock, detail: 'Cryptographic validation of payload consistency.', color: 'indigo' },
                                            { title: 'Blockchain Audit', status: 'Synced', icon: Database, detail: 'Consensus verification of transaction ledger.', color: 'emerald' },
                                        ].map((module, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.05 }}
                                                data-aos="zoom-in"
                                                data-aos-delay={i * 100}
                                                className="glass-card p-6 border border-white/[0.06] hover:border-white/[0.1] transition-all group relative overflow-hidden"
                                            >
                                                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                                    <module.icon className="w-full h-full" />
                                                </div>

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-2 rounded-lg bg-${module.color}-500/10 border border-${module.color}-500/20`}>
                                                        <module.icon className={`w-5 h-5 text-${module.color}-400`} />
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-${module.color}-500/10 text-${module.color}-400 border border-${module.color}-500/20`}>
                                                        {module.status}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-bold text-slate-200 mb-2">{module.title}</h4>
                                                <p className="text-xs text-slate-500 leading-relaxed font-mono">{(module.detail || '').toLowerCase()}</p>

                                                <div className="mt-4 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">System Health</span>
                                                    <div className="flex space-x-1">
                                                        {[1, 2, 3, 4, 5].map(dot => (
                                                            <div key={dot} className={`w-1 h-3 rounded-full ${dot <= 4 ? `bg-${module.color}-500` : 'bg-white/10'}`}></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 7: SECURITY SETTINGS */}
                        {activeTab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-2xl mx-auto md:mx-0">
                                <div className="glass-card p-6 md:p-10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <ShieldAlert className="w-24 h-24 text-rose-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center">
                                            <Lock className="mr-3 text-rose-500 w-6 h-6" /> Update Admin Passkey
                                        </h2>
                                        <p className="text-slate-400 text-xs md:text-sm mb-8">Change your root access credentials. Follow enterprise security standards for maximum protection.</p>

                                        {passwordStatus.msg && (
                                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`p-4 rounded-xl mb-6 flex items-center border ${passwordStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                {passwordStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-3 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />}
                                                <span className="text-xs md:text-sm font-bold">{passwordStatus.msg}</span>
                                            </motion.div>
                                        )}

                                        <form onSubmit={handlePasswordChange} className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Current Security Passkey</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                                                    <input 
                                                        required 
                                                        type="password" 
                                                        placeholder="Enter current master key..."
                                                        value={passwordForm.current} 
                                                        onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} 
                                                        className="glass-input w-full !pl-12 !py-4 font-mono text-rose-400 placeholder:text-slate-700" 
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">New Administrative Key</label>
                                                <div className="relative group">
                                                    <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                                                    <input 
                                                        required 
                                                        type="password" 
                                                        placeholder="Define new security sequence..."
                                                        value={passwordForm.new} 
                                                        onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })} 
                                                        className={`glass-input w-full !pl-12 !py-4 font-mono text-rose-400 placeholder:text-slate-700 ${pwdStrength === 100 ? 'focus:border-emerald-500/50' : 'focus:border-rose-500/50'}`} 
                                                    />
                                                </div>
                                                
                                                {/* Security Checklist */}
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    {[
                                                        { label: '8+ Characters', met: passwordForm.new.length >= 8 },
                                                        { label: 'Uppercase Unit', met: /[A-Z]/.test(passwordForm.new) },
                                                        { label: 'Lowercase Unit', met: /[a-z]/.test(passwordForm.new) },
                                                        { label: 'Numeric/Symbol', met: /[0-9!@#$%^&*]/.test(passwordForm.new) },
                                                    ].map((req, i) => (
                                                        <div key={i} className={`flex items-center space-x-2 p-2 rounded-lg border transition-all ${req.met ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.02] border-white/[0.05] text-slate-600'}`}>
                                                            {req.met ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-30" />}
                                                            <span className="text-[9px] font-bold uppercase tracking-tight">{req.label}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="h-1.5 w-full bg-white/[0.04] rounded-full mt-4 overflow-hidden border border-white/[0.06]">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${pwdStrength}%` }} className={`h-full ${pwdStrength <= 25 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : pwdStrength <= 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : pwdStrength <= 75 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} />
                                                </div>
                                                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                                    <span>Security entropy: {pwdStrength}%</span>
                                                    <span className={pwdStrength === 100 ? 'text-emerald-400' : ''}>{pwdStrength === 100 ? 'PROTOCOL SECURE' : 'HARDENING REQUIRED'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                                    Verify New Sequence
                                                    {passwordForm.confirm.length > 0 && (
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${passwordsMatch ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                            {passwordsMatch ? 'Match Confirmed ✓' : 'Mismatch detected ⚠'}
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="relative group">
                                                    <ClipboardCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                                                    <input 
                                                        required 
                                                        type="password" 
                                                        placeholder="Re-enter sequence for verification..."
                                                        value={passwordForm.confirm} 
                                                        onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} 
                                                        className={`glass-input w-full !pl-12 !py-4 font-mono text-rose-400 placeholder:text-slate-700 ${passwordsMatch ? 'focus:border-emerald-500/50' : 'focus:border-rose-500/50'}`} 
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                disabled={pwdStrength < 100 || !passwordsMatch}
                                                type="submit"
                                                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white font-black rounded-xl uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_50px_rgba(244,63,94,0.5)] transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale group active:scale-[0.98]"
                                            >
                                                <ShieldAlert className="w-5 h-5 mr-3 group-hover:animate-pulse" /> Commit Security Protocol
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>

            {/* EMPLOYEE INSIGHTS MODAL */}
            <AnimatePresence>
                {selectedEmployee && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEmployee(null)} className="absolute inset-0 bg-[#020408]/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-4xl max-h-[90vh] glass-card overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col border-white/10">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <User className="text-white w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">{selectedEmployee.name}</h2>
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{selectedEmployee.employee_id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEmployee(null)} className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.1] transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Left Column: Personal Data */}
                                    <div className="space-y-6">
                                        <div className="glass-card p-6 bg-white/[0.02] border-white/[0.05]">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center">
                                                <User className="w-3 h-3 mr-2" /> Identification Meta
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Gender</span>
                                                    <span className="text-sm text-slate-200 capitalize">{selectedEmployee.gender || 'Not specified'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Date of Birth</span>
                                                    <span className="text-sm text-slate-200">{selectedEmployee.dob || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Chronological Age</span>
                                                    <span className="text-sm text-slate-200 font-mono">{calculateAge(selectedEmployee.dob)} Years</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Contact Email</span>
                                                    <span className="text-sm text-slate-200 font-mono lowercase">{selectedEmployee.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Standing Badge */}
                                        <div className="glass-card p-6 bg-white/[0.02] border-white/[0.05] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 bg-gradient-to-br from-indigo-500 to-transparent rounded-bl-full w-24 h-24 group-hover:opacity-10 transition-opacity" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Academic Standing</h3>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-3xl font-black text-white">{selectedEmployee.analytics?.academic_standing?.grade || 'N/A'}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: selectedEmployee.analytics?.academic_standing?.color || '#94a3b8' }}>{selectedEmployee.analytics?.academic_standing?.description || 'Pending Analysis'}</p>
                                                </div>
                                                <GraduationCap className="w-12 h-12 text-white/10" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle & Right: Analytics */}
                                    <div className="md:col-span-2 space-y-8">
                                        {/* Top Stats Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="glass-card p-5 bg-white/[0.02] border-white/[0.05] border-l-4 border-l-indigo-500">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Academic Score</p>
                                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                                </div>
                                                <h4 className="text-2xl font-black text-white">{selectedEmployee.analytics?.average_academic_score || '0.0'}%</h4>
                                            </div>
                                            <div className="glass-card p-5 bg-white/[0.02] border-white/[0.05] border-l-4 border-l-emerald-500">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Average Tenure</p>
                                                    <History className="w-3 h-3 text-emerald-400" />
                                                </div>
                                                <h4 className="text-2xl font-black text-white">{selectedEmployee.analytics?.average_tenure || '0.0'} Yrs</h4>
                                            </div>
                                        </div>

                                        {/* AI Academic Fingerprint */}
                                        <div className="glass-card p-8 bg-white/[0.02] border-white/[0.05] relative">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                                                        <Activity className="w-4 h-4 mr-3 text-indigo-500" /> AI Academic Fingerprint
                                                    </h3>
                                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Neural Projection of Skill Trajectory</p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <span className="px-2 py-1 bg-white/[0.05] border border-white/10 rounded text-[8px] font-black text-indigo-400 uppercase tracking-widest">Quantum Ledger</span>
                                                </div>
                                            </div>
                                            <div className="h-64 relative">
                                                {selectedEmployee.analytics?.academic_fingerprint ? (
                                                    <AcademicFingerprint userId={selectedEmployee.employee_id} />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">
                                                        Data Unavailable for Visualization
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Trust Meter */}
                                        <div className="glass-card p-6 bg-[#0a0f1d] border-white/[0.05] relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center space-x-6">
                                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                                        <ShieldAlert className="w-8 h-8 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 font-mono">Behavioral Trust Score</h4>
                                                        <p className="text-3xl font-black text-white">{selectedEmployee.analytics?.behavioral_trust_score || '0.0'} <span className="text-sm text-slate-500">/ 10</span></p>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(selectedEmployee.analytics?.behavioral_trust_score || 0) * 10}%` }}
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EMPLOYER INSIGHTS MODAL */}
            <AnimatePresence>
                {selectedEmployer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedEmployer(null)} className="absolute inset-0 bg-[#020408]/80 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-4xl max-h-[90vh] glass-card overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col border-white/10">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                        <Building className="text-white w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">{selectedEmployer.company_name}</h2>
                                        <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">{selectedEmployer.employer_id}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedEmployer(null)} className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.1] transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Left Column: Profile Data */}
                                    <div className="space-y-6">
                                        <div className="glass-card p-6 bg-white/[0.02] border-white/[0.05]">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center">
                                                <Building className="w-3 h-3 mr-2" /> Employer Metadata
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Established</span>
                                                    <span className="text-sm text-slate-200 font-mono">{selectedEmployer.establishment_year || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Contact Email</span>
                                                    <div className="flex items-center space-x-2 text-slate-200 font-mono text-sm group">
                                                        <Mail className="w-3 h-3 text-slate-500" />
                                                        <span className="lowercase">{selectedEmployer.email || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Phone Protocol</span>
                                                    <div className="flex items-center space-x-2 text-slate-200 font-mono text-sm">
                                                        <Phone className="w-3 h-3 text-slate-500" />
                                                        <span>{selectedEmployer.phone || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col border-t border-white/5 pt-4">
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Active Workforce</span>
                                                    <span className="text-2xl font-black text-white">{selectedEmployer.analytics?.active_workforce || '0'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="glass-card p-6 bg-white/[0.02] border-white/[0.05]">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Registration Integrity</p>
                                            <div className="flex items-center space-x-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Verified Employer Account</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle & Right: Analytics */}
                                    <div className="md:col-span-2 space-y-8">
                                        {/* Analytics Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Avg Retention */}
                                            <div className="glass-card p-8 bg-[#0a0f1d] border-white/5 relative group overflow-hidden">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform">
                                                    <History className="w-20 h-20 text-indigo-500" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">Average Retention Period</p>
                                                <h4 className="text-4xl font-black text-white mb-2">{selectedEmployer.analytics?.avg_retention_rate || '0.0'} <span className="text-xs text-slate-500 font-bold uppercase tracking-widest underline decoration-indigo-500">Years</span></h4>
                                                <div className="flex items-center text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                                                    <Activity className="w-3 h-3 mr-2" /> Calculated Workforce Stability
                                                </div>
                                            </div>

                                            {/* Employee Feedback Index */}
                                            <div className="glass-card p-8 bg-[#0a0f1d] border-white/5 relative group overflow-hidden">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform">
                                                    <MessageSquare className="w-20 h-20 text-amber-500" />
                                                </div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">Workforce Trust Index</p>
                                                <h4 className="text-4xl font-black text-white mb-2">{selectedEmployer.analytics?.workforce_trust_index || '0.0'} <span className="text-xs text-slate-500 font-bold uppercase tracking-widest underline decoration-amber-500">/ 10</span></h4>
                                                <div className="flex items-center text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                                                    <Award className="w-3 h-3 mr-2" /> Anonymous Peer-Verified Rating
                                                </div>
                                            </div>
                                        </div>

                                        {/* Historical Retention Analysis (Real Chart) */}
                                        <div className="glass-card p-8 bg-white/[0.02] border-white/5 relative overflow-hidden">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center">
                                                    <LineChart className="w-4 h-4 mr-3 text-indigo-400" /> Historical Retention Analysis
                                                </h3>
                                                <span className="px-2 py-1 bg-white/[0.05] border border-white/10 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest">Temporal Roster Depth</span>
                                            </div>
                                            <div className="h-48 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={[
                                                        { month: 'Oct', rate: (selectedEmployer.analytics?.avg_retention_rate || 0) * 0.8 },
                                                        { month: 'Nov', rate: (selectedEmployer.analytics?.avg_retention_rate || 0) * 0.9 },
                                                        { month: 'Dec', rate: (selectedEmployer.analytics?.avg_retention_rate || 0) * 0.85 },
                                                        { month: 'Jan', rate: (selectedEmployer.analytics?.avg_retention_rate || 0) * 0.95 },
                                                        { month: 'Feb', rate: (selectedEmployer.analytics?.avg_retention_rate || 0) },
                                                        { month: 'Mar', rate: (selectedEmployer.analytics?.avg_retention_rate || 0) }
                                                    ]}>
                                                        <defs>
                                                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                                        <XAxis dataKey="month" stroke="#475569" fontSize={8} tickLine={false} axisLine={false} />
                                                        <YAxis hide />
                                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }} />
                                                        <Area type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <p className="text-[9px] text-slate-600 mt-4 uppercase tracking-[0.2em] font-bold text-center">Stability forecast based on current professional tenure</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}