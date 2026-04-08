import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Building2, LogOut, Users, Briefcase, FileSignature, PieChart, Lock, ShieldCheck, Bell, Plus, X, Eye, CheckCircle, CheckCircle2, AlertTriangle, ShieldAlert, XCircle, Calendar, MapPin, IndianRupee, KeyRound, Minus, User, Phone, Check, Save, Moon, Sun, Settings, ChevronDown, MessageSquare, Send, Smartphone, Tablet, Laptop, Monitor, GraduationCap, Sparkles, Activity, Search, SortAsc, SortDesc, Filter, ArrowUpDown, Menu, Hexagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import StealthSurveyModal from './StealthSurveyModal';
import AcademicFingerprint from './AcademicFingerprint';
import Pagination from './common/Pagination';
import PhoneInput from './PhoneInput';
import Swal from 'sweetalert2';
import { DateTime } from 'luxon';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const RosterEmployeeRow = ({ emp, handleEmployeeClick, setStealthTarget, setShowStealthModal, user }) => {
    const [evalStatus, setEvalStatus] = useState({ available: true, next_available: null });
    const [countdown, setCountdown] = useState("");

    useEffect(() => {
        if (user?.id && (emp.employee_id || emp.id)) {
            axios.get(`${API_BASE}/api/evaluations/status/${user.id}/${emp.employee_id || emp.id}`)
                .then(res => setEvalStatus(res.data))
                .catch(console.error);
        }
    }, [emp, user?.id]);

    useEffect(() => {
        if (evalStatus.available || !evalStatus.next_available) {
            setCountdown("");
            return;
        }

        const interval = setInterval(() => {
            const now = DateTime.now();
            const target = DateTime.fromISO(evalStatus.next_available);
            const diff = target.diff(now, ['months', 'days', 'hours', 'minutes']);

            if (diff.as('milliseconds') <= 0) {
                setEvalStatus({ ...evalStatus, available: true });
                setCountdown("");
                clearInterval(interval);
            } else {
                const months = Math.floor(diff.months);
                const days = Math.floor(diff.days);

                if (months > 0) {
                    setCountdown(`${months}m ${days}d`);
                } else {
                    const hours = Math.floor(diff.hours);
                    const mins = Math.floor(diff.minutes);
                    setCountdown(`${days}d ${hours}h ${mins}m`);
                }
            }
        }, 30000);

        // Initial update
        const now = DateTime.now();
        const target = DateTime.fromISO(evalStatus.next_available);
        const diff = target.diff(now, ['months', 'days', 'hours', 'minutes']);
        if (diff.as('milliseconds') > 0) {
            const months = Math.floor(diff.months);
            const days = Math.floor(diff.days);
            if (months > 0) setCountdown(`${months}m ${days}d`);
            else setCountdown(`${days}d ${Math.floor(diff.hours)}h ${Math.floor(diff.minutes)}m`);
        }

        return () => clearInterval(interval);
    }, [evalStatus]);

    return (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex justify-between items-center hover:bg-white/[0.05] transition-colors group">
            <div onClick={() => handleEmployeeClick(emp)} className="flex items-center space-x-4 cursor-pointer flex-1">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
                    <User className="text-indigo-400 w-5 h-5" />
                </div>
                <div>
                    <p className="font-bold">{emp.name || emp.employee_name || "Unknown Candidate"}</p>
                    <p className="text-xs font-mono text-slate-500">{emp.employee_id || emp.id}</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {evalStatus.available ? (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setStealthTarget({ ...emp, lockoutMonths: 3 });
                                setShowStealthModal(true);
                            }}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                        >
                            <FileSignature className="w-3 h-3" /> Evaluate
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Next assessment in</span>
                        <span className="text-[11px] text-indigo-400 font-mono font-bold animate-pulse">
                            {countdown} Wait!
                        </span>
                    </div>
                )}
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center shrink-0">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Active
                </span>
            </div>
        </div>
    );
};

export default function EmployerDashboard({ user, setUser }) {
    const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
    const isInitialLoadDone = useRef(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [aboutUs, setAboutUs] = useState("");
    const [personalInfo, setPersonalInfo] = useState({ gender: '', countryCode: '+91', mobile: '', dob: '' });
    const [isEditingPersonal, setIsEditingPersonal] = useState(false);
    const [aboutSavedStatus, setAboutSavedStatus] = useState('');

    // Profile Avatar Dropdown & Modal
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const profileDropdownRef = useRef(null);
    const notificationDropdownRef = useRef(null);

    const [editForm, setEditForm] = useState({ company_name: '', email: '', establishment_year: '', phone: '' });

    // Approval Request System
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalReason, setApprovalReason] = useState("");
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});

    // Data States
    const [activeEmployees, setActiveEmployees] = useState({ employees: [], total: 0, page: 1 });
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOption, setSortOption] = useState("joining_desc"); // joining_desc, joining_asc, name_az, name_za, id_asc, id_desc
    const phoneInputRef = useRef(null);
    const [isWorkforceLoading, setIsWorkforceLoading] = useState(false);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
    const [companyAnalytics, setCompanyAnalytics] = useState({
        active_workforce: 0,
        avg_retention_rate: 0.0,
        workforce_trust_index: 0.0
    });
    const [pendingRequests, setPendingRequests] = useState({
        relieve: [],
        onboarding: [],
        applications: [],
        total_applications: 0,
        applications_page: 1
    });
    const [companyTrustIndex, setCompanyTrustIndex] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    // Stealth Evaluation State
    const [showStealthModal, setShowStealthModal] = useState(false);
    const [stealthTarget, setStealthTarget] = useState(null);

    // Mobile Navigation State
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Job Posting State
    const [newJob, setNewJob] = useState({
        job_title: '', vacancy: 1, location: 'Onsite',
        experience: 0, skills: [], salary: 5, lastDate: ''
    });
    const [skillInput, setSkillInput] = useState("");

    // Password State
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });

    const handleLogout = async () => {
        const result = await Swal.fire({
            title: 'Terminate Session?',
            text: 'Are you sure you want to disconnect from the secure HR Command Center?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes, log out!',
            background: '#0f172a',
            color: '#f1f5f9'
        });

        if (result.isConfirmed) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setUser(null);
        }
    };

    // Chat State (WebSockets)
    const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const wsRef = useRef(null);
    const chatScrollRef = useRef(null);

    useEffect(() => {
        if (user?.id && user.company_name) {
            setIsWorkforceLoading(true);
            axios.get(`${API_BASE}/api/hr/active_employees/${user.company_name}?page=${activeEmployees.page || 1}&limit=30`, authHeader)
                .then(res => setActiveEmployees(prev => ({ ...res.data, page: res.data?.page || 1 })))
                .catch(console.error)
                .finally(() => setIsWorkforceLoading(false));
        }
    }, [activeEmployees.page, user?.company_name]);

    useEffect(() => {
        if (user?.id) {
            axios.get(`${API_BASE}/api/hr/pending_requests/${user.id}?page=${pendingRequests.applications_page || 1}&limit=30`, authHeader)
                .then(res => {
                    const reqs = res.data.requests || [];
                    setPendingRequests(prev => ({
                        ...prev,
                        relieve: reqs.filter(r => r.type === 'relieve'),
                        onboarding: reqs.filter(r => r.type === 'onboarding'),
                        applications: reqs.filter(r => r.type === 'application' || !r.type),
                        total_applications: res.data.total || 0
                    }));
                }).catch(console.error);
        }
    }, [pendingRequests.applications_page, user?.id]);

    useEffect(() => {
        AOS.init({
            duration: 800,
            once: true,
            easing: 'ease-out-quad',
            delay: 100,
        });
    }, []);

    useEffect(() => {
        if (user?.id) {
            if (!isInitialLoadDone.current) {
                setAboutUs(user.about || "");
                isInitialLoadDone.current = true;
            }

            const fetchInitialData = async () => {
                if (user.company_name) {
                    setIsWorkforceLoading(true);
                    axios.get(`${API_BASE}/api/hr/active_employees/${user.company_name}?page=${activeEmployees.page || 1}&limit=30`, authHeader)
                        .then(res => setActiveEmployees(prev => ({ ...res.data, page: res.data?.page || 1 })))
                        .catch(console.error)
                        .finally(() => setIsWorkforceLoading(false));
                }

                axios.get(`${API_BASE}/api/profile/me/${user.id}`)
                    .then(res => {
                        if (res.data) {
                            if (res.data.personal_info) {
                                setPersonalInfo(res.data.personal_info);
                            } else {
                                setPersonalInfo(prev => ({ ...prev, dob: res.data.dob || '', gender: res.data.gender || '', mobile: res.data.phone || '', countryCode: '+91' }));
                            }

                            // Only update user state if critical fields differ to avoid infinite loops
                            const needsUpdate = !user.email ||
                                (res.data.company_name && res.data.company_name !== user.company_name) ||
                                (res.data.establishment_year && res.data.establishment_year !== user.establishment_year);

                            if (needsUpdate) {
                                const companyName = res.data.company_name || user.company_name;
                                setUser(prev => ({
                                    ...prev,
                                    email: res.data.email || prev.email,
                                    company_name: companyName,
                                    establishment_year: res.data.establishment_year || prev.establishment_year,
                                    name: res.data.name || prev.name,
                                    phone: res.data.phone || prev.phone,
                                    name_edits_remaining: res.data.name_edits_remaining,
                                    dob_edits_remaining: res.data.dob_edits_remaining,
                                    company_name_edits_remaining: res.data.company_name_edits_remaining,
                                    establishment_year_edits_remaining: res.data.establishment_year_edits_remaining
                                }));

                                if (companyName && (!activeEmployees.employees || !activeEmployees.employees.length)) {
                                    setIsWorkforceLoading(true);
                                    axios.get(`${API_BASE}/api/hr/active_employees/${companyName}?page=${activeEmployees.page || 1}&limit=30`, authHeader)
                                        .then(activeRes => setActiveEmployees(prev => ({ ...activeRes.data, page: activeRes.data?.page || 1 })))
                                        .catch(console.error)
                                        .finally(() => setIsWorkforceLoading(false));
                                }
                            }

                            if (res.data?.company_name) {
                                axios.get(`${API_BASE}/api/evaluations/company_stats/${res.data.company_name}`)
                                    .then(trs => setCompanyTrustIndex(trs.data.average_score || 0))
                                    .catch(console.error);
                            }
                        }
                    }).catch(err => {
                        console.error("Failed to sync employer profile details:", err);
                    });

                axios.get(`${API_BASE}/api/hr/pending_requests/${user.id}?page=${pendingRequests.applications_page || 1}&limit=30`, authHeader)
                    .then(res => {
                        const reqs = res.data.requests || [];
                        setPendingRequests(prev => ({
                            ...prev,
                            relieve: reqs.filter(r => r.type === 'relieve'),
                            onboarding: reqs.filter(r => r.type === 'onboarding'),
                            applications: reqs.filter(r => r.type === 'application' || !r.type),
                            total_applications: res.data.total || 0
                        }));
                    }).catch(console.error);

                axios.get(`${API_BASE}/api/notifications/${user.id}`)
                    .then(res => {
                        const existing = res.data.notifications || [];
                        setNotifications(existing);
                        // Trigger synthetic feedback reminders after fetching real ones
                        if (user.company_name) {
                            axios.get(`${API_BASE}/api/evaluations/reminders/${user.company_name}?evaluator_id=${user.id}`)
                                .then(remRes => {
                                    const reminders = (remRes.data.reminders || []).map(r => ({
                                        _id: `rem_${r.employee_id}`,
                                        title: "Feedback Due",
                                        message: `${r.name} is due for their 3-month periodic evaluation. (${r.reason})`,
                                        type: "System",
                                        is_read: false,
                                        created_at: new Date().toISOString(),
                                        is_synthetic: true // Mark as local-only
                                    }));
                                    setNotifications(prev => {
                                        // Avoid duplicates
                                        const filteredPrev = prev.filter(p => !p.is_synthetic);
                                        return [...filteredPrev, ...reminders];
                                    });
                                }).catch(console.error);
                        }
                    })
                    .catch(console.error);

                // Initialization sequence complete

            };

            const fetchCompanyAnalytics = async () => {
                if (!user?.company_name) return;
                setIsAnalyticsLoading(true);
                try {
                    const res = await axios.get(`${API_BASE}/api/analytics/employer/${user.company_name}`);
                    setCompanyAnalytics(res.data);
                    if (res.data.workforce_trust_index) {
                        setCompanyTrustIndex(res.data.workforce_trust_index);
                    }
                } catch (err) {
                    console.error("Failed to fetch company analytics:", err);
                } finally {
                    setIsAnalyticsLoading(false);
                }
            };

            fetchInitialData();
            fetchCompanyAnalytics();

            const interval = setInterval(fetchInitialData, 30000);
            return () => clearInterval(interval);
        }
    }, [user?.id, user?.company_name]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
                setShowProfileDropdown(false);
            }
            if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target)) {
                setShowNotificationDropdown(false);
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
        const result = await Swal.fire({
            title: 'Update Description?',
            text: 'This will modify your company\'s public profile summary.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes, save it!'
        });

        if (!result.isConfirmed) return;

        try {
            await axios.post(`${API_BASE}/api/profile/about/${user.id}`, { about_text: aboutUs }, authHeader);
            setAboutSavedStatus('Saved!');
            setTimeout(() => setAboutSavedStatus(''), 2000);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Save Failed',
                text: 'Failed to save profile about text.'
            });
        }
    };

    const getDeviceIcon = (deviceStr) => {
        if (!deviceStr) return <Monitor className="w-6 h-6 text-amber-400 opacity-80" />;
        const ds = deviceStr.toLowerCase();
        if (ds.includes('mobile') || ds.includes('phone') || ds.includes('android') || ds.includes('iphone')) return <Smartphone className="w-6 h-6 text-amber-400 opacity-80" />;
        if (ds.includes('tablet') || ds.includes('ipad')) return <Tablet className="w-6 h-6 text-amber-400 opacity-80" />;
        return <Laptop className="w-6 h-6 text-amber-400 opacity-80" />;
    };

    const openEditModal = () => {
        setEditForm({
            company_name: user?.company_name || user?.name || '',
            email: user?.email || '',
            establishment_year: user?.establishment_year || '',
            phone: user?.phone || personalInfo?.mobile || ''
        });
        setShowEditProfileModal(true);
    };

    useEffect(() => {
        if (showEditProfileModal) {
            setEditForm({
                company_name: user?.company_name || user?.name || '',
                email: user?.email || '',
                establishment_year: user?.establishment_year || '',
                phone: user?.phone || personalInfo?.mobile || ''
            });
        }
    }, [showEditProfileModal, user, personalInfo]);

    const handleUpdateProfileV2 = async () => {
        const iti = phoneInputRef.current?.getInstance();
        if (iti && !iti.isValidNumber()) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Number',
                text: 'Please enter a valid international phone number.'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Commit Changes?',
            text: 'Are you sure you want to update your organization\'s verified profile settings?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes, commit changes!'
        });

        if (!result.isConfirmed) return;

        try {
            await axios.put(`${API_BASE}/api/profile/update_v2/${user.id}`, editForm, authHeader);
            Swal.fire({
                icon: 'success',
                title: 'Settings Updated',
                text: 'Company Settings updated successfully! Note: Edit limits may require a fresh login to reflect accurately.'
            });
            setUser({ ...user, company_name: editForm.company_name, email: editForm.email, establishment_year: editForm.establishment_year });
            setPersonalInfo({ ...personalInfo, mobile: editForm.phone });
            setShowEditProfileModal(false);
        } catch (err) {
            const msg = err.response?.data?.detail || "";
            if (msg.toLowerCase().includes("limit reached")) {
                setPendingChanges(editForm);
                setShowApprovalModal(true);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: 'Failed to update company settings.'
                });
            }
        }
    };

    const submitApprovalRequest = async () => {
        setIsSubmittingApproval(true);
        try {
            await axios.post(`${API_BASE}/api/profile/request_update/${user.id}`, {
                user_id: user.id,
                name: user.company_name || user.name,
                requested_changes: pendingChanges,
                reason: approvalReason
            }, authHeader);
            Swal.fire({
                icon: 'info',
                title: 'Request Submitted',
                text: 'Update request submitted! Admin will review and reset your limits shortly.'
            });
            setShowApprovalModal(false);
            setApprovalReason("");
            setShowEditProfileModal(false);
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Request Failed',
                text: err.response?.data?.detail || "Request failed."
            });
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    // --- Job Posting Logic ---
    const handleAddSkill = () => {
        const val = skillInput.trim();
        if (val && !newJob.skills.includes(val) && newJob.skills.length < 10) {
            setNewJob({ ...newJob, skills: [...newJob.skills, val] });
            setSkillInput("");
        }
    };

    const handleEmployeeClick = async (emp) => {
        if (!emp || !(emp.employee_id || emp.id)) return;

        // --- 1. SET BASIC INFO IMMEDIATELY TO OPEN MODAL FAST ---
        const initialCandidate = {
            ...emp,
            name: emp.name || emp.employee_name || "Loading...",
            id: emp.employee_id || emp.id,
            personal_info: emp.personal_info || {
                dob: emp.dob || "N/A",
                gender: emp.gender || "Not Specified"
            },
            experience: emp.experience || [],
            education: emp.education || [],
            skills: emp.skills || [],
            analytics: null,
            isLoadingDetails: true
        };
        setSelectedCandidate(initialCandidate);

        try {
            // --- 2. FETCH DETAILED PROFILE ---
            const profileRes = await axios.get(`${API_BASE}/api/secure_search/${emp.employee_id || emp.id}`);
            const profileData = profileRes.data || {};

            // --- 3. FETCH ANALYTICS ---
            let analyticsData = null;
            try {
                const analyticsRes = await axios.get(`${API_BASE}/api/analytics/employee/${emp.employee_id || emp.id}`);
                analyticsData = analyticsRes.data;
            } catch (analyticsErr) {
                console.warn("Could not fetch analytics for this employee.");
            }

            // --- 4. UPDATE WITH FULL DATA ---
            setSelectedCandidate(prev => {
                // If user closed the modal or switched candidates during fetch, don't update
                if (!prev || (prev.id !== (emp.employee_id || emp.id))) return prev;

                return {
                    ...prev,
                    ...profileData,
                    name: profileData.name || prev.name,
                    personal_info: profileData.personal_info || {
                        dob: profileData.dob || prev.personal_info.dob,
                        gender: profileData.gender || prev.personal_info.gender
                    },
                    experience: profileData.experience || prev.experience,
                    education: profileData.education || prev.education,
                    skills: profileData.skills || prev.skills,
                    analytics: analyticsData,
                    isLoadingDetails: false
                };
            });
        } catch (err) {
            console.error("Failed to fetch detailed candidate info", err);
            setSelectedCandidate(prev => prev ? { ...prev, isLoadingDetails: false } : null);
        }
    };

    // --- Roster Employee Row Component ---
    const handlePostJob = async (e) => {
        e.preventDefault();
        if (newJob.skills.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Skills Required', text: 'Please add at least one required skill.' });
            return;
        }
        if (!newJob.lastDate) {
            Swal.fire({ icon: 'warning', title: 'Date Required', text: 'Please set a cut-off date.' });
            return;
        }

        const result = await Swal.fire({
            title: 'Broadcast Job?',
            text: `Are you sure you want to publish the "${newJob.job_title}" position to the global noticeboard?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes, publish!'
        });

        if (!result.isConfirmed) return;

        try {
            const payload = {
                employer_id: user.id, company_name: user.company_name,
                job_title: newJob.job_title, vacancy: newJob.vacancy,
                location: newJob.location, lockIn: "None",
                experience: `${newJob.experience === 0 ? 'Fresher' : newJob.experience + ' Years'}`,
                qualification: newJob.skills.join(", "),
                salary: `₹${newJob.salary},00,000 LPA`, lastDate: newJob.lastDate
            };
            await axios.post(`${API_BASE}/api/hr/post_job`, payload, authHeader);
            Swal.fire({ icon: 'success', title: 'Job Posted', text: 'Job successfully broadcasted to the Noticeboard!' });
            setNewJob({ job_title: '', vacancy: 1, location: 'Onsite', experience: 0, skills: [], salary: 5, lastDate: '' });
            setActiveTab('applications');
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Post Failed', text: 'Error posting job.' });
        }
    };

    // --- Workforce Filtering & Sorting Logic ---
    const getJoiningDate = (emp) => {
        const currentExp = emp.experience?.find(exp => exp.end_date === 'Present');
        return currentExp ? new Date(currentExp.start_date) : new Date(0);
    };

    const filteredAndSortedEmployees = (activeEmployees.employees || [])
        .filter(emp => {
            const name = (emp.name || emp.employee_name || "").toLowerCase();
            const id = (emp.employee_id || emp.id || "").toLowerCase();
            const query = searchTerm.toLowerCase();
            return name.includes(query) || id.includes(query);
        })
        .sort((a, b) => {
            switch (sortOption) {
                case 'joining_desc': return getJoiningDate(b) - getJoiningDate(a);
                case 'joining_asc': return getJoiningDate(a) - getJoiningDate(b);
                case 'name_az': return (a.name || a.employee_name || "").localeCompare(b.name || b.employee_name || "");
                case 'name_za': return (b.name || b.employee_name || "").localeCompare(a.name || a.employee_name || "");
                case 'id_asc': return (a.employee_id || a.id || "").localeCompare(b.employee_id || b.id || "");
                case 'id_desc': return (b.employee_id || b.id || "").localeCompare(a.employee_id || a.id || "");
                default: return 0;
            }
        });

    const handleActionRequest = async (requestId, action, isRelieve = false) => {
        const actionText = action === 'accept' ? 'Approve' : 'Reject';
        const typeText = isRelieve ? 'Relieve Request' : 'Onboarding';

        const result = await Swal.fire({
            title: 'Double Verification',
            text: `Are you sure you want to ${actionText.toUpperCase()} this ${typeText}? This will update the blockchain ledger permanently.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes, proceed!'
        });

        if (!result.isConfirmed) return;

        try {
            const endpoint = isRelieve ? `/api/hr/action_relieve/${requestId}?action=${action}` : `/api/hr/action_request/${requestId}?action=${action}`;
            
            // Send request to backend
            await axios.get(`${API_BASE}${endpoint}`, authHeader);
            
            Swal.fire({ icon: 'success', title: 'Action Confirmed', text: `Success: ${typeText} ${actionText}ed.` });

            if (isRelieve && action === 'accept') {
                const req = pendingRequests.relieve.find(r => r.request_id === requestId);
                if (req) {
                    setStealthTarget({ ...req, lockoutMonths: 3 });
                    setShowStealthModal(true);
                }
            }

            if (isRelieve) {
                setPendingRequests(prev => ({ ...prev, relieve: prev.relieve.filter(r => r.request_id !== requestId) }));
            } else {
                setPendingRequests(prev => ({ ...prev, onboarding: prev.onboarding.filter(r => r.request_id !== requestId) }));
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Action Failed', text: 'Action failed. Check server connection.' });
        }
    };

    const viewCandidateDetails = async (empId) => {
        if (!empId) return;

        // Find existing basic info from local states if possible
        const existingApp = pendingRequests.applications.find(a => a.employee_id === empId);
        const existingRelieve = pendingRequests.relieve.find(r => r.employee_id === empId);
        const existingOnboard = pendingRequests.onboarding.find(r => r.employee_id === empId);
        const existingActive = (activeEmployees.employees || []).find(e => e.employee_id === empId);

        const basicInfo = existingApp || existingRelieve || existingOnboard || existingActive || { employee_id: empId };

        // Set basic info immediately
        setSelectedCandidate({
            ...basicInfo,
            name: basicInfo.name || basicInfo.employee_name || "Loading...",
            id: empId,
            isLoadingDetails: true
        });

        try {
            const res = await axios.get(`${API_BASE}/api/secure_search/${empId}`);

            // Also fetch analytics
            let analyticsData = null;
            try {
                const analyticsRes = await axios.get(`${API_BASE}/api/analytics/employee/${empId}`);
                analyticsData = analyticsRes.data;
            } catch (aErr) { console.warn(aErr); }

            setSelectedCandidate(prev => {
                if (!prev || prev.id !== empId) return prev;
                return {
                    ...prev,
                    ...res.data,
                    analytics: analyticsData,
                    isLoadingDetails: false
                };
            });
            setChatDrawerOpen(false);
        } catch (err) {
            console.error("Failed to fetch candidate details:", err);
            setSelectedCandidate(prev => prev ? { ...prev, isLoadingDetails: false } : null);
        }
    };

    const handleRequestReveal = async (candidate) => {
        const result = await Swal.fire({
            title: 'Request Reveal?',
            text: `Send a cryptographically secured reveal request to ${candidate.name}?`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444',
            confirmButtonText: 'Yes, send request'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await axios.post(`${API_BASE}/api/hr/request_reveal`, {
                employer_id: user.id,
                company_name: user.company_name,
                employee_id: candidate.employee_id
            }, authHeader);
            Swal.fire({ icon: 'info', title: 'Reveal Requested', text: res.data.message });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Request Failed', text: 'Failed to send reveal request.' });
        }
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
        const total = (activeEmployees.employees?.length || 0) || 1;
        let males = 0, females = 0, trans = 0;
        let under1 = 0, under3 = 0, over3 = 0;

        (activeEmployees.employees || []).forEach(emp => {
            if (emp.gender === 'Male') males++;
            else if (emp.gender === 'Female') females++;
            else if (emp.gender === 'Transgender') trans++;

            const job = emp.experience?.find(e => e.end_date === 'Present' && e.firm?.toLowerCase().trim() === user?.company_name?.toLowerCase().trim());
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

    const pwdStrength = (pwd => {
        let score = 0;
        if (!pwd) return 0;
        if (pwd.length >= 8) score += 25;
        if (/[A-Z]/.test(pwd)) score += 25;
        if (/[a-z]/.test(pwd)) score += 25;
        if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 25;
        return score;
    })(passwordForm.newPassword);
    const passwordsMatch = passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword;

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.oldPassword === passwordForm.newPassword) {
            setPasswordStatus({ msg: "New password cannot be the same as current.", type: "error" });
            return;
        }
        if (pwdStrength < 100) {
            setPasswordStatus({ msg: "Please meet all complexity requirements.", type: "error" });
            return;
        }
        if (!passwordsMatch) {
            setPasswordStatus({ msg: "Passwords do not match.", type: "error" });
            return;
        }

        const result = await Swal.fire({
            title: 'Update Security Passkey?',
            text: 'This will permanently change your credentials for the professional portal.',
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
            await axios.post(`${API_BASE}/api/auth/change_password/${user.id}`, {
                old_password: passwordForm.oldPassword, new_password: passwordForm.newPassword, confirm_password: passwordForm.confirmPassword
            }, authHeader);
            Swal.fire({
                icon: 'success',
                title: 'Passkey Updated',
                text: 'Your credentials have been securely updated.',
                background: '#060a14',
                color: '#fff',
                confirmButtonColor: '#f43f5e'
            });
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
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

    // --- Helper to calculate age from DOB ---
    const calculateAge = (dob) => {
        if (!dob || dob === "N/A" || dob === "Hidden by Incognito") return "N/A";
        const birthDate = new Date(dob);
        if (isNaN(birthDate)) return "N/A";
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <div className="flex min-h-screen text-slate-100 relative overflow-hidden bg-transparent">

            {/* DECORATIVE FLOATING ORBS (Extra depth for dashboard) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="orb orb-primary w-96 h-96 -top-48 -left-48 opacity-20" />
                <div className="orb orb-accent w-80 h-80 top-1/2 -right-40 opacity-15" />
                <div className="orb orb-cyan w-64 h-64 bottom-0 left-1/4 opacity-10" />
            </div>

            {/* MOBILE SIDEBAR OVERLAY */}
            <AnimatePresence>
                {showMobileMenu && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={() => setShowMobileMenu(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden" 
                    />
                )}
            </AnimatePresence>

            {/* SIDEBAR */}
            <div className={`
                fixed md:relative inset-y-0 left-0 w-72 flex flex-col glass-sidebar z-[70] transition-transform duration-300 transform
                ${showMobileMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                <Hexagon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-white">CETS HR</span>
                        </div>
                        <button onClick={() => setShowMobileMenu(false)} className="p-2 bg-white/[0.06] rounded-xl md:hidden text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-4">Command Center</p>
                    <nav className="space-y-1.5">
                        {[
                            { id: 'profile', icon: Building2, label: 'Company Profile' },
                            { id: 'workforce', icon: PieChart, label: 'Workforce Insights' },
                            { id: 'post_job', icon: Briefcase, label: 'Post Recruitment' },
                            { id: 'applications', icon: Users, label: 'Candidate CRM' },
                            { id: 'notifications', icon: Bell, label: 'Notifications' },
                            { id: 'approvals', icon: FileSignature, label: 'Ledger Approvals', badge: (pendingRequests.relieve?.length || 0) + (pendingRequests.onboarding?.length || 0) },
                        ].map((item, idx) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    if (item.id === 'notifications') markNotificationsRead();
                                    setShowMobileMenu(false);
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id ? 'sidebar-tab-active' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}
                            >
                                <div className="flex items-center"><item.icon className={`mr-3 w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-600'}`} /> {item.label}</div>
                                {item.id === 'notifications' && unreadCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
                                {(item.badge || 0) > 0 && item.id !== 'notifications' && <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === item.id ? 'bg-indigo-400/20 text-indigo-300' : 'bg-rose-500/20 text-rose-400'}`}>{item.badge}</span>}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="mt-auto p-8 border-t border-white/[0.04]">
                    <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-medium">
                        <LogOut className="mr-3 w-5 h-5" /> Log Out
                    </button>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10">
                <header className="h-28 px-4 md:px-10 flex items-center justify-between glass-header sticky top-0 z-50 transition-all">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowMobileMenu(true)} className="p-3 bg-white/[0.06] rounded-2xl md:hidden text-indigo-400 hover:bg-indigo-500/10 transition-all border border-white/[0.08]">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                                <Building2 className="hidden sm:inline w-5 h-5 text-indigo-400" />
                                Welcome back, <span className="text-indigo-400 truncate max-w-[120px] sm:max-w-none">{user?.company_name || 'Partner'}</span>
                            </h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">Employer Command Center • Workforce Ledger</p>
                            <div className="flex items-center gap-2 md:gap-3 mt-1.5 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-400/80">Secured by Blockchain</span>
                            </div>
                            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
                                <Activity className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-tighter text-indigo-400/80">Protected by Cognitive Firewall</span>
                            </div>
                        </div>
                    </div>
                </div>

                    <div className="flex items-center space-x-6">
                        {/* NOTIFICATION BELL */}
                        <div className="relative" ref={notificationDropdownRef}>
                            <button onClick={() => setShowNotificationDropdown(!showNotificationDropdown)} className={`relative p-2.5 rounded-full transition-all bg-white/[0.06] hover:bg-white/[0.1] ${unreadCount > 0 ? 'glow-pulse' : ''}`}>
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 border-2 border-slate-900 text-[9px] font-bold text-white shadow-lg z-10">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            <AnimatePresence>
                                {showNotificationDropdown && (
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 mt-3 w-80 shadow-2xl glass-card overflow-hidden !bg-slate-900/95 z-50 border border-white/[0.08]">
                                        <div className="p-3 border-b border-white/[0.06] flex justify-between items-center bg-white/[0.02]">
                                            <p className="text-sm font-bold flex items-center"><Bell className="w-4 h-4 mr-2 text-indigo-400" /> Notifications</p>
                                            <button onClick={markNotificationsRead} className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors">Mark all read</button>
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-slate-500 italic text-xs">No new notifications.</div>
                                            ) : (
                                                notifications.slice().reverse().slice(0, 5).map((n, idx) => (
                                                    <div key={idx} className={`p-4 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors ${!n.is_read ? 'bg-indigo-500/[0.03]' : ''}`}>
                                                        <p className="text-xs font-medium text-slate-300 leading-relaxed line-clamp-2">{n.message}</p>
                                                        <span className="text-[9px] text-slate-500 mt-2 block font-mono">{new Date(n.timestamp || Date.now()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {notifications.length > 5 && (
                                            <div className="p-2 border-t border-white/[0.06]">
                                                <button onClick={() => { setActiveTab('notifications'); setShowNotificationDropdown(false); markNotificationsRead(); }} className="w-full py-2 rounded-lg text-xs text-indigo-400 hover:bg-indigo-500/10 transition-colors font-bold">
                                                    Show All
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

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
                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 mt-3 w-56 shadow-2xl glass-card overflow-hidden !bg-slate-900/95">
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
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <div className="p-10">
                    <AnimatePresence>

                        {/* TAB 1: PROFILE */}
                        {activeTab === 'profile' && (
                            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-5xl space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="stat-card bg-gradient-to-br from-indigo-500/[0.06] to-transparent">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Active Workforce</p>
                                        <h3 className="text-5xl font-black text-indigo-400">{companyAnalytics.active_workforce}</h3>
                                        <p className="text-xs mt-2 font-medium text-slate-400">Currently deployed on ledger</p>
                                    </div>
                                    <div className="stat-card bg-gradient-to-br from-emerald-500/[0.06] to-transparent" style={{ "--stat-color": "#10b981" }}>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Retention Rate</p>
                                        <h3 className="text-5xl font-black text-emerald-400">{companyAnalytics.avg_retention_rate} <span className="text-2xl font-bold text-slate-500">Yrs</span></h3>
                                        <p className="text-xs mt-2 font-medium text-slate-400">Platform-wide average</p>
                                    </div>
                                    <div className="stat-card flex flex-col justify-between bg-gradient-to-br from-amber-500/[0.06] to-transparent">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Login</p>
                                            <h3 className="text-lg font-black text-amber-400 mt-1 leading-tight">{user?.last_login ? new Date(user.last_login).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'First Session'}</h3>
                                        </div>
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.06]">
                                            <p className="text-[10px] mt-2 font-medium text-slate-500 font-mono">IP: {user?.last_login_ip || 'N/A'}</p>
                                            <div title={user?.last_login_device || 'Unknown Device'} className="p-1.5 rounded-lg bg-white/[0.04]">
                                                {getDeviceIcon(user?.last_login_device)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="stat-card flex flex-col justify-between bg-gradient-to-br from-rose-500/[0.06] to-transparent" style={{ "--stat-color": "#f43f5e" }}>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Workforce Reliability Score</p>
                                            <h3 className="text-5xl font-black text-rose-400">{companyAnalytics.workforce_trust_index} <span className="text-xl font-bold text-slate-500">/ 10</span></h3>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/[0.04] rounded-full mt-4 overflow-hidden border border-white/[0.06]">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(companyAnalytics.workforce_trust_index / 10) * 100}%` }}
                                                className="h-full bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                                            />
                                        </div>
                                        <p className="text-[10px] mt-2 font-medium text-slate-400 uppercase tracking-tighter">Based on your workforce evaluations</p>
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
                                    {isWorkforceLoading || isAnalyticsLoading ? (
                                        <div className="space-y-8 animate-pulse">
                                            <div>
                                                <div className="h-4 w-32 bg-white/[0.05] rounded mb-3"></div>
                                                <div className="w-full h-8 rounded-full bg-white/[0.05]"></div>
                                            </div>
                                            <div>
                                                <div className="h-4 w-40 bg-white/[0.05] rounded mb-3"></div>
                                                <div className="w-full h-8 rounded-full bg-white/[0.05]"></div>
                                            </div>
                                        </div>
                                    ) : (!activeEmployees.employees || activeEmployees.employees.length === 0) ? (
                                        <p className="text-center text-slate-500 italic py-8 border border-dashed rounded-xl border-white/[0.08]">Hire employees to generate real-time analytics.</p>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center">
                                                    <h4 className="text-sm font-bold text-slate-400 mb-6 w-full text-left">Gender Diversity</h4>
                                                    <div className="w-full max-w-[200px]">
                                                        <Doughnut
                                                            data={{
                                                                labels: ['Male', 'Female', 'Trans'],
                                                                datasets: [{
                                                                    data: [stats.gender.m, stats.gender.f, stats.gender.t],
                                                                    backgroundColor: ['#3b82f6', '#ec4899', '#10b981'],
                                                                    hoverOffset: 4,
                                                                    borderWidth: 0
                                                                }]
                                                            }}
                                                            options={{
                                                                plugins: {
                                                                    legend: {
                                                                        position: 'bottom',
                                                                        labels: { color: '#94a3b8', font: { size: 10, weight: 'bold' }, padding: 20 }
                                                                    }
                                                                },
                                                                cutout: '70%'
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                                                    <h4 className="text-sm font-bold text-slate-400 mb-6">Employee Tenure Breakdown</h4>
                                                    <div className="h-[200px]">
                                                        <Bar
                                                            data={{
                                                                labels: ['< 1yr', '1-3yrs', '> 3yrs'],
                                                                datasets: [{
                                                                    label: 'Percentage (%)',
                                                                    data: [stats.tenure.u1, stats.tenure.u3, stats.tenure.o3],
                                                                    backgroundColor: ['#06b6d4', '#6366f1', '#9333ea'],
                                                                    borderRadius: 8,
                                                                }]
                                                            }}
                                                            options={{
                                                                responsive: true,
                                                                maintainAspectRatio: false,
                                                                scales: {
                                                                    y: {
                                                                        beginAtZero: true,
                                                                        max: 100,
                                                                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                                                        ticks: { color: '#64748b', font: { size: 10 } }
                                                                    },
                                                                    x: {
                                                                        grid: { display: false },
                                                                        ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
                                                                    }
                                                                },
                                                                plugins: {
                                                                    legend: { display: false }
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                        <h3 className="text-xl font-bold">Current Roster</h3>

                                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                            {/* Search Bar */}
                                            <div className="relative flex-1 md:w-64 min-w-[200px]">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search name or ID..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="glass-input w-full pl-10 py-2.5 text-sm"
                                                />
                                            </div>

                                            {/* Sort Select */}
                                            <div className="relative md:w-48 min-w-[150px]">
                                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <select
                                                    value={sortOption}
                                                    onChange={(e) => setSortOption(e.target.value)}
                                                    className="glass-input w-full pl-10 py-2.5 text-sm appearance-none cursor-pointer"
                                                >
                                                    <option value="joining_desc" className="bg-slate-900">Joined: Newest</option>
                                                    <option value="joining_asc" className="bg-slate-900">Joined: Oldest</option>
                                                    <option value="name_az" className="bg-slate-900">Name: A-Z</option>
                                                    <option value="name_za" className="bg-slate-900">Name: Z-A</option>
                                                    <option value="id_asc" className="bg-slate-900">ID: Ascending</option>
                                                    <option value="id_desc" className="bg-slate-900">ID: Descending</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {isWorkforceLoading ? (
                                            <div className="space-y-4">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="h-20 w-full rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse"></div>
                                                ))}
                                            </div>
                                        ) : filteredAndSortedEmployees.length === 0 ? (
                                            <div className="text-center py-12 border border-dashed rounded-2xl border-white/[0.08]">
                                                <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                                <p className="text-slate-500 italic">
                                                    {searchTerm ? "No employees match your search criteria." : "No employees currently active on ledger."}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredAndSortedEmployees.map((emp, i) => (
                                                <RosterEmployeeRow
                                                    key={emp.employee_id || emp.id || i}
                                                    emp={emp}
                                                    handleEmployeeClick={handleEmployeeClick}
                                                    setStealthTarget={setStealthTarget}
                                                    setShowStealthModal={setShowStealthModal}
                                                    user={user}
                                                />
                                            ))
                                        )}
                                    </div>

                                    <Pagination
                                        currentPage={activeEmployees.page}
                                        totalItems={activeEmployees.total}
                                        itemsPerPage={30}
                                        onPageChange={(page) => setActiveEmployees(p => ({ ...p, page }))}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* TAB 3: POST RECRUITMENT (Redesigned & Stabilized) */}
                        {activeTab === 'post_job' && (
                            <motion.div key="post_job" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4, ease: "easeOut" }} className="max-w-6xl space-y-8">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h2 className="text-3xl font-black flex items-center tracking-tight text-white"><Briefcase className="mr-4 w-8 h-8 text-indigo-400" /> Broadcast Job Opening</h2>
                                        <p className="text-slate-500 font-medium mt-1">Publish a high-fidelity requirement to the global blockchain noticeboard.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center">
                                            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verified Posting
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handlePostJob} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Column 1: Core Identity */}
                                    <div className="lg:col-span-2 space-y-6">
                                        <div className="glass-card p-6 space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Job Designation</label>
                                                <div className="relative">
                                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                                    <input required type="text" value={newJob.job_title} onChange={e => setNewJob({ ...newJob, job_title: e.target.value })} className="glass-input w-full pl-12 !py-4 text-white font-bold" placeholder="e.g. Lead Systems Architect" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Open Vacancies</label>
                                                    <div className="relative">
                                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                                        <input required type="number" min="1" value={newJob.vacancy} onChange={e => setNewJob({ ...newJob, vacancy: e.target.value })} className="glass-input w-full pl-12 !py-4 font-bold" />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Mode</label>
                                                    <div className="flex p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-inner">
                                                        {['Onsite', 'Hybrid', 'Remote'].map(mode => (
                                                            <button type="button" key={mode} onClick={() => setNewJob({ ...newJob, location: mode })} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tighter transition-all ${newJob.location === mode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/[0.04]'}`}>
                                                                {mode}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="glass-card p-6 space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                                                    Salary Package (LPA)
                                                    <span className="text-indigo-400 font-black text-lg">₹ {newJob.salary}.00 L</span>
                                                </label>
                                                <div className="px-4 py-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] relative">
                                                    <input type="range" min="1" max="50" value={newJob.salary} onChange={e => setNewJob({ ...newJob, salary: parseInt(e.target.value) })} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                                    <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase mt-4 tracking-tighter">
                                                        <span>₹ 1L (Minimum)</span>
                                                        <span>₹ 25L (Mid)</span>
                                                        <span>₹ 50L+ (Executive)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                                                    Technical Skills & Expertise
                                                    <span className="text-slate-500">{newJob.skills.length}/10 Tagged</span>
                                                </label>
                                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                                    <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                                                        {newJob.skills.length === 0 && <p className="text-[10px] text-slate-600 italic py-2">No skills tagged yet...</p>}
                                                        {newJob.skills.map((skill, i) => (
                                                            <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold group">
                                                                {skill}
                                                                <X className="w-3.5 h-3.5 cursor-pointer opacity-50 group-hover:opacity-100 hover:text-rose-400 transition-all" onClick={() => setNewJob({ ...newJob, skills: newJob.skills.filter((_, idx) => idx !== i) })} />
                                                            </motion.span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input disabled={newJob.skills.length >= 10} type="text" placeholder="Add technical skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} className="glass-input flex-1 !p-3.5 text-sm font-medium disabled:opacity-30" />
                                                        <button type="button" disabled={newJob.skills.length >= 10} onClick={handleAddSkill} className="px-5 bg-indigo-500/15 text-indigo-400 rounded-2xl border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-30">
                                                            <Plus className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Side Controls & Summary */}
                                    <div className="space-y-6">
                                        <div className="glass-card p-6 space-y-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Experience Level</label>
                                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
                                                    <button type="button" onClick={() => setNewJob({ ...newJob, experience: Math.max(0, newJob.experience - 1) })} className="p-2.5 bg-white/[0.06] rounded-xl hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-white/[0.1]"><Minus className="w-4 h-4" /></button>
                                                    <div className="text-center flex flex-col">
                                                        <span className="text-2xl font-black text-white">{newJob.experience === 0 ? '0' : newJob.experience}</span>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mt-0.5">{newJob.experience === 0 ? 'Freshers' : 'Years Exp'}</span>
                                                    </div>
                                                    <button type="button" onClick={() => setNewJob({ ...newJob, experience: newJob.experience + 1 })} className="p-2.5 bg-white/[0.06] rounded-xl hover:bg-emerald-500/20 hover:text-emerald-400 transition-all border border-white/[0.1]"><Plus className="w-4 h-4" /></button>
                                                </div>
                                                                                     <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center">
                                                    <Calendar className="w-3.5 h-3.5 mr-2 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                    Application Deadline
                                                </label>
                                                <div className="relative">
                                                    <input required type="datetime-local" value={newJob.lastDate} onChange={e => setNewJob({ ...newJob, lastDate: e.target.value })} className="glass-input w-full px-4 !py-4 text-xs font-bold" />
                                                </div>
                                                <p className="text-[9px] text-slate-500 font-medium px-1">Candidates cannot apply after this window closes.</p>
                                            </div>
     </div>
                                        </div>

                                        <div className="glass-card p-6 bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/20">
                                            <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-indigo-400" /> Posting Summary</h4>
                                            <ul className="space-y-3 text-[11px] font-bold text-slate-400">
                                                <li className="flex justify-between items-center"><span className="text-slate-500 uppercase tracking-tighter">Reach</span> <span className="text-white">Global (10k+ Candidates)</span></li>
                                                <li className="flex justify-between items-center"><span className="text-slate-500 uppercase tracking-tighter">Status</span> <span className="text-indigo-400">Ready to Broadcast</span></li>
                                            </ul>
                                            <button type="submit" className="btn-premium w-full mt-8 py-5 rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-500/20 border border-indigo-400/30 group">
                                                Publish Opportunity
                                                <Send className="w-4 h-4 ml-2 inline transition-transform group-hover:translate-x-1" />
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                        {/* TAB 4: CANDIDATE CRM */}
                        {activeTab === 'applications' && (
                            <motion.div key="applications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-6xl space-y-6">
                                <div className="glass-card p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                        <div>
                                            <h2 className="text-3xl font-black flex items-center tracking-tight text-white">
                                                <Users className="mr-4 w-8 h-8 text-indigo-400" /> Candidate CRM
                                            </h2>
                                            <p className="text-slate-500 font-medium mt-1">Automatically sorted by Behavioral Trust Index and verified performance.</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center shadow-lg shadow-emerald-500/10">
                                                <Activity className="w-3.5 h-3.5 mr-2" /> AI-Powered Sorting Active
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {pendingRequests.applications.length === 0 ? (
                                            <div className="col-span-full text-center py-16 border border-dashed rounded-3xl border-white/[0.08] bg-white/[0.01]">
                                                <Users className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                                                <p className="text-slate-500 text-lg font-medium italic">No incoming applications yet.</p>
                                            </div>
                                        ) : (
                                            [...pendingRequests.applications]
                                                .sort((a, b) => (b.behavioral_trust_score || 0) - (a.behavioral_trust_score || 0))
                                                .map((app, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: i * 0.05 }}
                                                        className="glass-card p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:bg-white/[0.08] transition-all cursor-pointer group relative overflow-hidden h-full"
                                                        onClick={() => viewCandidateDetails(app.employee_id)}
                                                    >
                                                        {/* Top Corner Badge for Trust Score */}
                                                        <div className="absolute top-0 right-0 px-4 py-2 bg-indigo-500/10 border-b border-l border-white/5 rounded-bl-2xl">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Trust Score</span>
                                                                <span className="text-lg font-black text-indigo-400">{(app.behavioral_trust_score || 0).toFixed(1)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-indigo-500/40 transition-colors">
                                                                    <User className="text-indigo-400 w-7 h-7" />
                                                                </div>
                                                                <div className="pr-12">
                                                                    <h3 className="font-black text-xl text-white truncate group-hover:text-indigo-300 transition-colors">{app.employee_name}</h3>
                                                                    <p className="text-xs font-bold text-slate-500 flex items-center mt-0.5">
                                                                        <Briefcase className="w-3 h-3 mr-1 text-indigo-500" /> {app.job_title}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 pt-2">
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">About Me</p>
                                                                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed font-medium italic">
                                                                        {app.candidate_about || "Professional profile summary not provided."}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-3 pt-2">
                                                                    <div className="flex-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col items-center">
                                                                        <span className="text-[8px] font-black text-slate-500 uppercase">Verified Ledger</span>
                                                                        <span className="text-sm font-black text-emerald-400 flex items-center">
                                                                            <ShieldCheck className="w-3 h-3 mr-1" /> {app.verified_jobs_count || 0}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col items-center">
                                                                        <span className="text-[8px] font-black text-slate-500 uppercase">Experience</span>
                                                                        <span className="text-sm font-black text-amber-400">
                                                                            {app.experience_years || 0} Yrs
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-6">
                                                            <button className="w-full flex items-center justify-center px-5 py-3 bg-indigo-500/10 text-indigo-400 rounded-2xl text-xs font-black tracking-widest uppercase border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition-all shadow-lg group-hover:shadow-indigo-500/30">
                                                                <Eye className="w-4 h-4 mr-2" /> Review Full Profile
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))
                                        )}
                                    </div>

                                    <div className="mt-8 border-t border-white/5 pt-6">
                                        <Pagination
                                            currentPage={pendingRequests.applications_page}
                                            totalItems={pendingRequests.total_applications}
                                            itemsPerPage={30}
                                            onPageChange={(page) => setPendingRequests(p => ({ ...p, applications_page: page }))}
                                        />
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

                        {/* THE NEW PREMIUM SECURITY TAB IS INJECTED AT THE END OF THE ANIMATEPRESENCE BLOCK */}

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
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 rounded-[2rem] glass-card !bg-slate-900/95 border border-white/[0.1]">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 relative shadow-2xl">
                                            <User className="w-12 h-12 text-indigo-400" />
                                            {selectedCandidate?.isLoadingDetails && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-3xl">
                                                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-black text-white tracking-tight">{selectedCandidate?.name || "Loading..."}</h2>
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl text-xs uppercase tracking-widest">{selectedCandidate.employee_id || selectedCandidate.id}</span>
                                                <div className="h-4 w-px bg-white/[0.1] mx-1 hidden sm:block"></div>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-slate-300 font-bold text-xs">{selectedCandidate.dob || selectedCandidate.personal_info?.dob || "N/A"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-slate-300 font-bold text-xs">{selectedCandidate.gender || selectedCandidate.personal_info?.gender || "Not Specified"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                                    <span className="text-indigo-400 font-black text-xs uppercase tracking-tighter">Age: {calculateAge(selectedCandidate.dob || selectedCandidate.personal_info?.dob)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedCandidate(null)} className="p-3 bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-400 rounded-2xl transition-all border border-white/[0.05]"><X className="w-6 h-6" /></button>
                                </div>

                                {/* PRIMARY INSIGHTS GRID */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                    {/* ACADEMIC STANDING */}
                                    <div className="glass-card p-5 border-l-4 border-l-indigo-500 flex flex-col justify-between bg-white/[0.02]">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Academic Standing</p>
                                            <h4 className="text-lg font-black text-white leading-tight">
                                                {typeof selectedCandidate?.academic_standing === 'object' ? selectedCandidate.academic_standing.description :
                                                    (typeof selectedCandidate?.analytics?.academic_standing === 'object' ? selectedCandidate.analytics.academic_standing.description : "Incomplete Data")}
                                            </h4>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-2xl font-black text-indigo-400">
                                                {typeof selectedCandidate?.academic_standing === 'object' ? selectedCandidate.academic_standing.grade :
                                                    (typeof selectedCandidate?.analytics?.academic_standing === 'object' ? selectedCandidate.analytics.academic_standing.grade : "N/A")}
                                            </span>
                                            <div className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                <GraduationCap className="w-4 h-4 text-indigo-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* AVERAGE SCORE */}
                                    <div className="glass-card p-5 border-l-4 border-l-emerald-500 flex flex-col justify-between bg-white/[0.02]">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Average Academic Score</p>
                                            <h4 className="text-4xl font-black text-emerald-400">
                                                {selectedCandidate?.average_academic_score || selectedCandidate?.analytics?.average_academic_score || "0.0"}
                                                <span className="text-xl text-slate-500 ml-1">%</span>
                                            </h4>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Aggregate across all records</p>
                                    </div>

                                    {/* AVERAGE TENURE */}
                                    <div className="glass-card p-5 border-l-4 border-l-amber-500 flex flex-col justify-between bg-white/[0.02]">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Average Tenure</p>
                                            <h4 className="text-4xl font-black text-amber-400">
                                                {selectedCandidate?.average_tenure || selectedCandidate?.analytics?.average_tenure || "0.0"}
                                                <span className="text-xl text-slate-500 ml-1">Yrs</span>
                                            </h4>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">Verified Career Stability</p>
                                    </div>

                                    {/* TRUST SCORE */}
                                    <div className="glass-card p-5 border-l-4 border-l-rose-500 flex flex-col justify-between bg-white/[0.02]">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Behavioral Trust Score</p>
                                            <h4 className="text-4xl font-black text-rose-400">
                                                {selectedCandidate?.behavioral_trust_score || selectedCandidate?.analytics?.behavioral_trust_score || "0.0"}
                                                <span className="text-xl text-slate-500 ml-1">/ 10</span>
                                            </h4>
                                        </div>
                                        <div className="w-full h-1 bg-white/[0.05] rounded-full mt-3 overflow-hidden">
                                            <div
                                                className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                                                style={{ width: `${((selectedCandidate?.behavioral_trust_score || selectedCandidate?.analytics?.behavioral_trust_score || 0) / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ACADEMIC FINGERPRINT BADGES */}
                                <div className="mb-0">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-black flex items-center uppercase tracking-widest">
                                            <Sparkles className="w-5 h-5 mr-3 text-indigo-400" />
                                            AI Academic Fingerprint
                                        </h3>
                                        <div className="h-px flex-1 bg-white/[0.06] mx-6"></div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Live Insights</span>
                                        </div>
                                    </div>
                                    <AcademicFingerprint userId={selectedCandidate.employee_id || selectedCandidate.id} />
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

                    {/* TAB: SECURITY */}
                    {activeTab === 'security' && (
                        <motion.div key="security" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-2xl space-y-6">
                            <div className="glass-card p-6 md:p-10 relative overflow-hidden mt-6 mb-8">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <ShieldAlert className="w-24 h-24 text-rose-500" />
                                </div>
                                <div className="relative z-10">
                                    <h2 className="text-xl md:text-2xl font-bold mb-2 flex items-center">
                                        <Lock className="mr-3 text-rose-500 w-6 h-6" /> Update Security Passkey
                                    </h2>
                                    <p className="text-slate-400 text-xs md:text-sm mb-8">Change your account credentials. Follow enterprise security standards for maximum protection.</p>

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
                                                    value={passwordForm.oldPassword} 
                                                    onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} 
                                                    className="glass-input w-full !pl-12 !py-4 font-mono text-rose-400 placeholder:text-slate-700" 
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">New Security Key</label>
                                            <div className="relative group">
                                                <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-rose-500 transition-colors" />
                                                <input 
                                                    required 
                                                    type="password" 
                                                    placeholder="Define new security sequence..."
                                                    value={passwordForm.newPassword} 
                                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                                                    className={`glass-input w-full !pl-12 !py-4 font-mono text-rose-400 placeholder:text-slate-700 ${pwdStrength === 100 ? 'focus:border-emerald-500/50' : 'focus:border-rose-500/50'}`} 
                                                />
                                            </div>
                                            
                                            {/* Security Checklist */}
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                {[
                                                    { label: '8+ Characters', met: passwordForm.newPassword.length >= 8 },
                                                    { label: 'Uppercase Unit', met: /[A-Z]/.test(passwordForm.newPassword) },
                                                    { label: 'Lowercase Unit', met: /[a-z]/.test(passwordForm.newPassword) },
                                                    { label: 'Numeric/Symbol', met: /[0-9!@#$%^&*]/.test(passwordForm.newPassword) }
                                                ].map((req, i) => (
                                                    <div key={i} className={`flex items-center space-x-2 text-[10px] uppercase tracking-wider font-bold ${req.met ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                        {req.met ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-700"></div>}
                                                        <span>{req.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Confirm Validation Sequence</label>
                                                {passwordForm.confirmPassword && (
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${passwordsMatch ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {passwordsMatch ? 'Match Confirmed' : 'Mismatch Detected'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative group">
                                                <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${passwordForm.confirmPassword ? (passwordsMatch ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-600 group-focus-within:text-rose-500'}`} />
                                                <input 
                                                    required 
                                                    type="password" 
                                                    placeholder="Re-enter sequence..."
                                                    value={passwordForm.confirmPassword} 
                                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
                                                    className={`glass-input w-full !pl-12 !py-4 font-mono text-rose-400 placeholder:text-slate-700 ${passwordForm.confirmPassword ? (passwordsMatch ? 'border-emerald-500/30 focus:border-emerald-500/50' : 'border-rose-500/30 focus:border-rose-500/50') : ''}`} 
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            disabled={pwdStrength < 100 || !passwordsMatch} 
                                            type="submit" 
                                            className="w-full flex justify-center items-center py-4 rounded-xl font-black text-sm transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white group"
                                        >
                                            <Lock className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                                            Execute Security Override
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MESSAGING DRAWER (Tied to Selected Candidate) */}
                <AnimatePresence>
                    {chatDrawerOpen && selectedCandidate && (
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed top-0 right-0 h-full w-96 bg-slate-900/95 border-l border-indigo-500/30 shadow-2xl z-[70] flex flex-col backdrop-blur-xl">
                            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 border border-indigo-500/30 text-indigo-400 font-bold">{selectedCandidate?.name?.charAt(0) || '?'}</div>
                                    <div>
                                        <h3 className="font-bold">{selectedCandidate?.name || 'Loading...'}</h3>
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

                {/* COMPANY SETTINGS MODAL */}
                <AnimatePresence>
                    {showEditProfileModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-2xl p-10 rounded-[2.5rem] glass-card shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[90vh] !bg-slate-900/90 border border-white/[0.1]">
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h2 className="text-3xl font-black flex items-center bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"><Settings className="w-8 h-8 mr-4 text-amber-400" /> Company Settings</h2>
                                        <p className="text-slate-500 text-sm mt-2 font-medium">Update your organization's verified profile across CETS.</p>
                                    </div>
                                    <button onClick={() => setShowEditProfileModal(false)} className="p-3 bg-white/[0.06] rounded-2xl hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-white/[0.08]"><X className="w-6 h-6" /></button>
                                </div>

                                <div className="space-y-8">
                                    {/* Company Name */}
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex justify-between items-center">
                                            Organization Name
                                            <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-[10px] border border-amber-500/20">
                                                {user?.name_edits_remaining !== undefined ? `${user.name_edits_remaining} out of 5 edits left` : '5 out of 5 left'}
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                                            <input type="text" placeholder="e.g. Acme Corp" value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} className="glass-input w-full pl-14 !py-5 text-lg font-bold shadow-inner" />
                                        </div>
                                    </div>

                                    {/* Email & Year Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Contact</label>
                                            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="glass-input w-full !py-4 text-base font-bold text-amber-400 shadow-inner" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex justify-between items-center">
                                                Est. Year
                                                <span className="text-amber-400 text-[10px]">
                                                    {user?.dob_edits_remaining !== undefined ? `${user.dob_edits_remaining} out of 3 Left` : '3 out of 3 Left'}
                                                </span>
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                                                <select value={editForm.establishment_year} onChange={(e) => setEditForm({ ...editForm, establishment_year: e.target.value })} className="glass-input w-full pl-14 !py-4 text-base font-bold shadow-inner appearance-none cursor-pointer">
                                                    <option value="">Select Year</option>
                                                    {Array.from({ length: 126 }, (_, i) => 2025 - i).map(year => (
                                                        <option key={year} value={year}>{year}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* UID Row */}
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Organization Unique ID</label>
                                        <input type="text" value={user?.id || ''} disabled className="glass-input w-full opacity-40 cursor-not-allowed !py-4 text-base font-mono font-bold text-emerald-400 bg-black/20" />
                                    </div>

                                    {/* Phone Row */}
                                    <div className="space-y-3">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Official Mobile</label>
                                        <PhoneInput
                                            ref={phoneInputRef}
                                            value={editForm.phone}
                                            onChange={(number) => setEditForm(prev => ({ ...prev, phone: number }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-4 mt-12 pt-8 border-t border-white/[0.1]">
                                    <button onClick={() => setShowEditProfileModal(false)} className="px-8 py-4 text-sm font-black text-slate-500 hover:text-slate-200 transition-colors">Discard</button>
                                    <button onClick={handleUpdateProfileV2} className="btn-premium px-10 py-4 rounded-2xl text-sm font-black flex items-center shadow-[0_10px_25px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #ea580c)' }}><Save className="w-5 h-5 mr-3" /> Save Changes</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>

            {/* STEALTH SURVEY MODAL (Triggered automatically on relieve) */}
            <StealthSurveyModal isOpen={showStealthModal} target={stealthTarget} onClose={() => setShowStealthModal(false)} user={user} />

        </div>
    );
}