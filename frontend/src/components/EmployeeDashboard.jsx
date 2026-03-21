import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import AcademicFingerprint from './AcademicFingerprint';
import Pagination from './common/Pagination';
import { Building2, LogOut, Users, Briefcase, FileSignature, PieChart, Lock, ShieldCheck, Bell, Plus, X, Eye, CheckCircle, CheckCircle2, XCircle, Calendar, MapPin, IndianRupee, KeyRound, Minus, User, Phone, Check, Save, Moon, Sun, Settings, ChevronDown, MessageSquare, Send, Hexagon, Activity, Code, BookOpen, GraduationCap, Info, AlertOctagon, ShieldAlert, Download, Loader2, Sparkles, EyeOff, Smartphone, Tablet, Laptop, Monitor, Edit2, AlertTriangle, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from './PhoneInput';
import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { Radar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function EmployeeDashboard({ user, setUser, onBack }) {
  const authHeader = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
  const [activeTab, setActiveTab] = useState('profile');
  const [fingerprintKey, setFingerprintKey] = useState(0); // Added for refresh
  const [analytics, setAnalytics] = useState({ average_tenure: 0, remarks: 'Loading...' });
  const [noticeboardJobs, setNoticeboardJobs] = useState({ jobs: [], total: 0, page: 1 });
  const [verifiedJobs, setVerifiedJobs] = useState([]);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });
  const [trustScore, setTrustScore] = useState(0);

  // Registered Employers & Notifications
  const [registeredEmployers, setRegisteredEmployers] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // CV Data State
  const [cvData, setCvData] = useState({ about: "", skills: [], languages: [], hobbies: [], education: [], experience: [] });
  const [personalInfo, setPersonalInfo] = useState({ gender: '', countryCode: '+91', mobile: '', dob: '' });
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const phoneInputRef = useRef(null);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [aboutSavedStatus, setAboutSavedStatus] = useState('');
  const [isIncognito, setIsIncognito] = useState(false);
  const [isVerified, setIsVerified] = useState(true);

  // Profile Avatar Dropdown & Modal
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  const [editForm, setEditForm] = useState({ name: '', email: '', dob: '', phone: '', gender: '' });

  // Approval Request System
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  // Form States
  const [newItem, setNewItem] = useState({ type: '', value: '' });
  const [showExpForm, setShowExpForm] = useState(false);
  const [newExp, setNewExp] = useState({ role: '', firm: '', start: '', end: '', current: false });
  const [showEduForm, setShowEduForm] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', start_year: '', end_year: '', year: '', score: '' });
  const [isEditingEdu, setIsEditingEdu] = useState(false);
  const [editEduId, setEditEduId] = useState(null);

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

  // Company Details Modal State
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);

  // Mobile Navigation State
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Load Data
  useEffect(() => {
    if (user?.id) {
      axios.get(`${API_BASE}/api/analytics/employee/${user.id}`).then(res => setAnalytics(res.data)).catch(console.error);
      axios.get(`${API_BASE}/api/secure_search/${user.id}`)
        .then(res => {
          if (res.data) {
            const loadedExp = res.data.experience || [];
            setVerifiedJobs(loadedExp.filter(exp => exp.is_verified));
            let standing = res.data.academic_standing || { grade: "N/A", description: "No Data", color: "#64748b" };
            if (typeof standing === 'string') {
              standing = { grade: "N/A", description: standing, color: "#64748b" };
            }
            setCvData({
              about: res.data.about || "",
              skills: res.data.skills || [],
              languages: res.data.languages || [],
              hobbies: res.data.hobbies || [],
              education: res.data.education || [],
              experience: loadedExp,
              academic_standing: standing,
              verified_skills: res.data.verified_skills || []
            });
            setIsIncognito(res.data.incognito_mode || false);
            if (res.data.personal_info) {
              setPersonalInfo(prev => ({ ...prev, ...res.data.personal_info }));
            } else {
              setPersonalInfo(prev => ({
                ...prev,
                dob: res.data.dob || '',
                gender: res.data.gender || '',
                mobile: res.data.phone || '',
                countryCode: '+91'
              }));
            }
            if (!user.email && res.data.email) {
              setUser(prev => ({ ...prev, email: res.data.email, name: res.data.name || prev.name }));
            }
          }
        }).catch(console.error);

      axios.get(`${API_BASE}/api/hr/noticeboard?page=${noticeboardJobs.page || 1}&limit=30`).then(res => setNoticeboardJobs(prev => ({ ...res.data, page: res.data?.page || 1 }))).catch(console.error);
      axios.get(`${API_BASE}/api/notifications/${user.id}`).then(res => setNotifications(res.data.notifications || [])).catch(console.error);
      axios.get(`${API_BASE}/api/evaluations/history/${user.id}`).then(res => {
        const scores = res.data.evaluations.map(e => e.final_score);
        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          setTrustScore(parseFloat(avg.toFixed(2)));
        }
      }).catch(console.error);

      AOS.init({
        duration: 1000,
        once: true,
        easing: 'ease-out-quad'
      });
    }
  }, [user, noticeboardJobs.page]);

  // Seperate effect for employers list as it doesn't need to re-fetch on page change
  useEffect(() => {
    if (user?.id) {
       axios.get(`${API_BASE}/api/hr/employers_list`).then(res => setRegisteredEmployers(res.data.employers)).catch(console.error);
    }
  }, [user?.id]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Terminate Session?',
      text: 'Are you sure you want to disconnect from the secure Professional Portal?',
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

  // Close profile dropdown when clicking outside
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

  const getDeviceIcon = (deviceStr) => {
    if (!deviceStr) return <Monitor className="w-6 h-6 text-amber-400 opacity-80" />;
    const ds = deviceStr.toLowerCase();
    if (ds.includes('mobile') || ds.includes('phone') || ds.includes('android') || ds.includes('iphone')) return <Smartphone className="w-6 h-6 text-amber-400 opacity-80" />;
    if (ds.includes('tablet') || ds.includes('ipad')) return <Tablet className="w-6 h-6 text-amber-400 opacity-80" />;
    return <Laptop className="w-6 h-6 text-amber-400 opacity-80" />;
  };

  const openEditModal = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || '',
      dob: personalInfo.dob || '',
      phone: personalInfo.mobile || '',
      gender: personalInfo.gender || ''
    });
    setShowEditProfileModal(true);
  };

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
  const handleAddTag = async (category, limit) => {
    if (cvData[category].length >= limit) {
      Swal.fire({
        icon: 'warning',
        title: 'Limit Reached',
        text: "Please delete a previous entry before adding a new one."
      });
      return;
    }
    const val = newItem.value.trim();
    if (!val) return;
    const isDuplicate = cvData[category].some(item => item.toLowerCase() === val.toLowerCase());
    if (isDuplicate) { 
      Swal.fire({
        icon: 'warning',
        title: 'Duplicate Entry',
        text: `"${val}" is already in your ${category}.`
      });
      return; 
    }

    const updatedItems = [...cvData[category], val];
    const prevCvData = { ...cvData };
    setCvData({ ...cvData, [category]: updatedItems });
    setNewItem({ type: '', value: '' });

    // Sync to database
    try {
      const payload = {
        about: cvData.about,
        skills: category === 'skills' ? updatedItems : cvData.skills,
        languages: category === 'languages' ? updatedItems : cvData.languages,
        hobbies: category === 'hobbies' ? updatedItems : cvData.hobbies
      };
      await axios.put(`${API_BASE}/api/profile/customize/${user.id}`, payload);
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Sync Failed',
        text: `Failed to sync ${category} to database.`
      });
      setCvData(prevCvData); // Rollback on error
    }
  };

  const removeItem = async (category, index) => {
    const itemToRemove = cvData[category][index];
    const result = await Swal.fire({
      title: 'Remove Tag?',
      text: `Are you sure you want to remove "${itemToRemove}" from your ${category}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, remove it!'
    });

    if (!result.isConfirmed) return;

    const updatedItems = cvData[category].filter((_, i) => i !== index);
    setCvData({ ...cvData, [category]: updatedItems });

    // Sync to database
    try {
      const payload = {
        about: cvData.about,
        skills: category === 'skills' ? updatedItems : cvData.skills,
        languages: category === 'languages' ? updatedItems : cvData.languages,
        hobbies: category === 'hobbies' ? updatedItems : cvData.hobbies
      };
      await axios.put(`${API_BASE}/api/profile/customize/${user.id}`, payload);
    } catch (err) {
      console.error(`Failed to sync ${category} deletion:`, err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await axios.put(`${API_BASE}/api/profile/customize/${user.id}`, {
        about: cvData.about, skills: cvData.skills, languages: cvData.languages, hobbies: cvData.hobbies
      });
      await axios.put(`${API_BASE}/api/profile/education/${user.id}`, { education: cvData.education });
      await axios.put(`${API_BASE}/api/profile/personal/${user.id}`, { personal_info: personalInfo });
      Swal.fire({ icon: 'success', title: 'Profile Cached', text: "Profile saved successfully to the database!" });
    } catch (err) { 
      Swal.fire({ icon: 'error', title: 'Save Failed', text: err.response?.data?.detail || "Failed to save profile." }); 
    }
  };

  const handleSaveAbout = async () => {
    const result = await Swal.fire({
      title: 'Update Bio?',
      text: 'This will modify your professional summary displayed to recruiters.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, update bio'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.put(`${API_BASE}/api/profile/customize/${user.id}`, {
        about: cvData.about, skills: cvData.skills, languages: cvData.languages, hobbies: cvData.hobbies
      });
      setAboutSavedStatus('Saved!');
      setTimeout(() => setAboutSavedStatus(''), 2000);
    } catch (err) { 
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: "Failed to save bio."
      });
    }
  };

  const handleUpdateProfileV2 = async () => {
    const iti = phoneInputRef.current?.getInstance();
    if (iti && !iti.isValidNumber()) {
      Swal.fire({ icon: 'warning', title: 'Invalid Number', text: 'Please enter a valid international phone number.' });
      return;
    }

    const result = await Swal.fire({
      title: 'Commit Changes?',
      text: 'Update your verified identity settings? Administrative approval may be required if limits are reached.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, commit changes!'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.put(`${API_BASE}/api/profile/update_v2/${user.id}`, editForm);
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated',
        text: "Profile updated successfully! Note: Edit limits may require a fresh login to reflect accurately."
      });
      setUser({ ...user, name: editForm.name, email: editForm.email });
      setPersonalInfo({ ...personalInfo, dob: editForm.dob, mobile: editForm.phone, gender: editForm.gender });
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
          text: msg || "Failed to update profile."
        });
      }
    }
  };

  const viewCompanyDetails = async (companyName) => {
    setIsCompanyLoading(true);
    setCompanyDetails(null);
    setShowCompanyModal(true);
    try {
      const res = await axios.get(`${API_BASE}/api/hr/company_profile/${companyName}`);
      setCompanyDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch company profile:", err);
      Swal.fire({ icon: 'error', title: 'Fetch Failed', text: 'Could not retrieve company profile information.' });
      setShowCompanyModal(false);
    } finally {
      setIsCompanyLoading(false);
    }
  };

  const submitApprovalRequest = async () => {
    setIsSubmittingApproval(true);
    try {
      await axios.post(`${API_BASE}/api/profile/request_update/${user.id}`, {
        user_id: user.id,
        name: user.name,
        requested_changes: pendingChanges,
        reason: approvalReason
      });
      Swal.fire({
        icon: 'info',
        title: 'Request Submitted',
        text: "Update request submitted! Admin will review and reset your limits shortly."
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

  const handleAddEducation = async (e) => {
    e.preventDefault();

    const result = await Swal.fire({
      title: isEditingEdu ? 'Update Ledger?' : 'Save to Ledger?',
      text: `Are you sure you want to ${isEditingEdu ? 'update' : 'add'} this academic record?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#a855f7',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, proceed!'
    });

    if (!result.isConfirmed) return;

    let updatedEducation;
    if (isEditingEdu) {
      updatedEducation = cvData.education.map(edu => (edu.id || edu._id) === editEduId ? { ...newEdu, id: editEduId } : edu);
    } else {
      updatedEducation = [{ ...newEdu, id: Date.now() }, ...cvData.education];
    }

    setCvData({ ...cvData, education: updatedEducation });
    setIsEditingEdu(false);
    setEditEduId(null);

    // Sync to database
    try {
      await axios.put(`${API_BASE}/api/profile/education/${user.id}`, { education: updatedEducation });

      // Real-time update: Re-fetch analytics and profile data
      const [analyticsRes, profileRes] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/employee/${user.id}`),
        axios.get(`${API_BASE}/api/secure_search/${user.id}`)
      ]);

      if (analyticsRes.data) setAnalytics(analyticsRes.data);
      if (profileRes.data) {
        let standing = profileRes.data.academic_standing || { grade: "N/A", description: "No Data", color: "#64748b" };
        if (typeof standing === 'string') {
          standing = { grade: "N/A", description: standing, color: "#64748b" };
        }
        setCvData(prev => ({
          ...prev,
          education: profileRes.data.education || [],
          academic_standing: standing
        }));
      }

      setFingerprintKey(prev => prev + 1); // Refresh fingerprint component
    } catch (err) {
      console.error("Education sync failed:", err);
      Swal.fire({
        icon: 'warning',
        title: 'Sync Warning',
        text: "Education saved locally but failed to sync to database. Please check your connection."
      });
    }

    setNewEdu({ degree: '', institution: '', start_year: '', end_year: '', year: '', score: '' });
    setShowEduForm(false);
  };

  const handleRemoveEducation = async (eduId) => {
    const result = await Swal.fire({
      title: 'Burn Ledger Entry?',
      text: 'Are you sure you want to permanently delete this education record from the blockchain ledger?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    const updatedEducation = cvData.education.filter(e => (e.id || e._id) !== eduId);
    const prevEducation = cvData.education;
    setCvData({ ...cvData, education: updatedEducation });

    try {
      await axios.put(`${API_BASE}/api/profile/education/${user.id}`, { education: updatedEducation });

      // Real-time update: Re-fetch analytics and profile data
      const [analyticsRes, profileRes] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/employee/${user.id}`),
        axios.get(`${API_BASE}/api/secure_search/${user.id}`)
      ]);

      if (analyticsRes.data) setAnalytics(analyticsRes.data);
      if (profileRes.data) {
        let standing = profileRes.data.academic_standing || { grade: "N/A", description: "No Data", color: "#64748b" };
        if (typeof standing === 'string') {
          standing = { grade: "N/A", description: standing, color: "#64748b" };
        }
        setCvData(prev => ({
          ...prev,
          education: profileRes.data.education || [],
          academic_standing: standing
        }));
      }

      setFingerprintKey(prev => prev + 1);
    } catch (err) {
      console.error("Education deletion sync failed:", err);
      Swal.fire({
        icon: 'error',
        title: 'Sync Failed',
        text: "Failed to sync education deletion. Reverting changes."
      });
      setCvData(prev => ({ ...prev, education: prevEducation }));
    }
  };

  // --- EXPERIENCE LOGIC (BRIDGE BLOCKER) ---
  const handleAddExperience = async (e) => {
    e.preventDefault();
    if (!newExp.firm) { Swal.fire({ icon: 'warning', title: 'Selection Required', text: "Please select a company from the dropdown." }); return; }
    if (newExp.current && cvData.experience.some(exp => exp.end_date === 'Present')) {
      Swal.fire({ icon: 'error', title: 'Active Job Conflict', text: "🚨 You cannot have two active jobs. Please Raise a Relieve Request for your current employer before onboarding to a new one." });
      return;
    }

    const result = await Swal.fire({
      title: 'Dispatch Onboarding?',
      text: `Send a cryptographically secured onboarding request to ${newExp.firm} HR?`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, dispatch!'
    });

    if (!result.isConfirmed) return;

    const pendingExp = { id: Date.now(), role: newExp.role, firm: newExp.firm, start_date: newExp.start, end_date: newExp.current ? 'Present' : newExp.end, is_verified: false };
    setCvData({ ...cvData, experience: [pendingExp, ...cvData.experience] });
    try {
      await axios.post(`${API_BASE}/api/hr/apply`, {
        employee_id: user.id, employee_name: user.name, employer_id: `PENDING_SEARCH`,
        company_name: newExp.firm, job_title: newExp.role, type: "onboarding"
      });
      Swal.fire({
        icon: 'success',
        title: 'Request Sent',
        text: `Onboarding approval request sent to ${newExp.firm} HR.`
      });
    } catch (err) { console.error(err); }
    setNewExp({ role: '', firm: '', start: '', end: '', current: false });
    setShowExpForm(false);
  };

  const handleApply = async (job) => {
    const result = await Swal.fire({
      title: 'Apply for Position?',
      text: `Are you sure you want to officially apply for ${job.job_title} at ${job.company_name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, apply!'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`${API_BASE}/api/hr/apply`, {
        employee_id: user.id, employee_name: user.name, employer_id: job.employer_id,
        company_name: job.company_name, job_title: job.job_title, type: "application"
      }, authHeader);
      Swal.fire({ icon: 'success', title: 'Application Sent', text: `Success! Application submitted to ${job.company_name}.` });
    } catch (err) { Swal.fire({ icon: 'error', title: 'Application Failed', text: "Error submitting application." }); }
  };

  const handleRelieveRequest = async (firm) => {
    const result = await Swal.fire({
      title: 'Relieve Request?',
      text: `Are you absolutely sure you want to leave ${firm} and apply for a Relieve Request? This is a permanent ledger action.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, request relief'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.post(`${API_BASE}/api/hr/request_relieve`, { employee_id: user.id, employee_name: user.name, company_name: firm }, authHeader);
      Swal.fire({ icon: 'success', title: 'Request Sent', text: `Relieve request securely dispatched to ${firm} HR.` });
    } catch (err) { Swal.fire({ icon: 'error', title: 'Internal Error', text: "Failed to send relieve request." }); }
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
      Swal.fire({ icon: 'error', title: 'Generation Failed', text: err.response?.data?.detail || "Failed to generate AI Quiz." });
    } finally {
      setGeneratingSkill(null);
    }
  };

  const handleVerifyQuiz = async (e) => {
    e.preventDefault();
    if (Object.keys(quizAnswers).length < quizData.questions.length) {
      Swal.fire({ icon: 'warning', title: 'Quiz Incomplete', text: "Please select an answer for all questions." });
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

      Swal.fire({ icon: 'info', title: 'Quiz Result', text: res.data.message });
      if (res.data.passed) {
        setCvData(prev => ({ ...prev, verified_skills: [...(prev.verified_skills || []), quizData.skill] }));
      }
      setShowQuizModal(false);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Submission Failed', text: err.response?.data?.detail || "Failed to submit AI Quiz." });
    }
  };

  const toggleIncognito = async () => {
    try {
      const res = await axios.put(`${API_BASE}/api/profile/incognito/${user.id}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setIsIncognito(res.data.incognito_mode);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Action Failed', text: err.response?.data?.detail || "Failed to toggle Incognito Mode." });
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
             <p style="margin: 0; font-size: 12px; color: #64748b;">Class of ${edu.start_year || 'N/A'} — ${edu.end_year || edu.year || 'N/A'} • Score: ${edu.score}%</p>
          </div>
        `).join('')}
      </div>
    `;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `${(user?.name || 'User').replace(/\s/g, '_')}_CETS_Verified_Resume.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // --- RENDER ---
  return (
    <div className="flex min-h-screen text-slate-100 relative overflow-hidden bg-transparent">

      {/* DECORATIVE FLOATING ORBS (Extra depth for dashboard) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="orb orb-primary w-96 h-96 -top-48 -left-48 opacity-20" />
        <div className="orb orb-accent w-80 h-80 top-1/2 -right-40 opacity-15" />
        <div className="orb orb-cyan w-64 h-64 bottom-0 left-1/3 opacity-10" />
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
              <span className="text-xl font-black tracking-tighter text-white">CETS</span>
            </div>
            <button onClick={() => setShowMobileMenu(false)} className="p-2 bg-white/[0.06] rounded-xl md:hidden text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-4">Main Menu</p>
          <nav className="space-y-1.5">
            {[
              { id: 'profile', icon: User, label: 'My Dashboard' },
              { id: 'education', icon: GraduationCap, label: 'Education History' },
              { id: 'ledger', icon: ShieldCheck, label: 'Verified Employment Details' },
              { id: 'noticeboard', icon: Briefcase, label: 'Job Search' },
              { id: 'notifications', icon: Bell, label: 'Notifications' },
            ].map((item) => (
              <button key={item.id} onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'notifications') markNotificationsRead();
                setShowMobileMenu(false);
              }} className={`w-full flex items-center p-3 rounded-xl font-medium transition-all duration-200 ${activeTab === item.id ? 'sidebar-tab-active' : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'}`}>
                <item.icon className={`mr-3 w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-600'}`} /> {item.label}
                {item.id === 'notifications' && unreadCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
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

        {/* HEADER (Matched with Employer Dashboard for consistent spaciousness) */}
        <header className="h-28 px-4 md:px-10 flex items-center justify-between glass-header sticky top-0 z-50 transition-all">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowMobileMenu(true)} className="p-3 bg-white/[0.06] rounded-2xl md:hidden text-indigo-400 hover:bg-indigo-500/10 transition-all border border-white/[0.08]">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <User className="hidden sm:inline w-5 h-5 text-indigo-400" />
                Welcome back, <span className="text-indigo-400 truncate max-w-[120px] sm:max-w-none">{user?.name || 'Professional'}</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">Professional Ecosystem • Workforce Ledger</p>
              <div className="flex items-center gap-2 md:gap-3 mt-1.5 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-400/80">Secured by Blockchain</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
                <Activity className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-tighter text-indigo-400/80">Cognitive Firewall Active</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
            {/* NOTIFICATION BELL & DROPDOWN */}
            <div className="relative" ref={notificationDropdownRef}>
              <button onClick={() => setShowNotificationDropdown(!showNotificationDropdown)} className={`relative p-2.5 rounded-full transition-all bg-white/[0.06] hover:bg-white/[0.1] ${unreadCount > 0 ? 'glow-pulse' : ''}`}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-rose-500 rounded-full text-[9px] font-bold border border-slate-900 shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {showNotificationDropdown && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 mt-3 w-80 shadow-2xl glass-card overflow-hidden !bg-slate-900/95 z-50">
                    <div className="p-3 border-b border-white/[0.06] flex justify-between items-center">
                      <p className="font-bold text-sm">Recent Notifications</p>
                      {unreadCount > 0 && <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{unreadCount} Unread</span>}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto w-full">
                      {notifications.length === 0 ? (
                        <p className="text-center text-slate-500 text-xs py-4">No recent notifications.</p>
                      ) : (
                        notifications.slice().reverse().slice(0, 5).map((n, idx) => (
                          <div key={idx} className={`p-3 border-b border-white/[0.04] transition-all hover:bg-white/[0.04] ${!n.is_read ? 'border-l-2 border-l-indigo-500 bg-indigo-500/[0.03]' : ''}`}>
                            <p className="text-xs font-bold text-slate-300 truncate">{n.title || n.type || "Alert"}</p>
                            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-t border-white/[0.06]">
                      <button onClick={() => { setActiveTab('notifications'); markNotificationsRead(); setShowNotificationDropdown(false); }} className="w-full py-2 rounded-lg text-[11px] font-bold bg-white/[0.04] hover:bg-indigo-500 hover:text-white transition-all text-slate-300">Show more...</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 mt-3 w-56 shadow-2xl glass-card overflow-hidden !bg-slate-900/95">
                    <div className="p-3 border-b border-white/[0.06]">
                      <p className="text-sm font-bold truncate">{user?.name}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">{user?.id}</p>
                    </div>
                    <div className="p-2">
                      <button onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                        <User className="w-4 h-4 mr-3 text-slate-500" /> View Profile
                      </button>
                      <button onClick={() => { openEditModal(); setShowProfileDropdown(false); }} className="w-full flex items-center p-2.5 rounded-xl text-sm text-slate-300 hover:bg-white/[0.06] hover:text-indigo-400 transition-all font-medium">
                        <Settings className="w-4 h-4 mr-3 text-slate-500" /> Edit Profile
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

          <AnimatePresence mode="wait">
            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="space-y-6 w-full">
                
                {/* ACADEMIC FINGERPRINT (TOP POSITION) */}
                <div className="mb-8">
                  <AcademicFingerprint key={fingerprintKey} userId={user.id} />
                </div>

                {/* ANALYTICS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
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
                  <div className="stat-card flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Last Login</p>
                      <h3 className="text-lg font-black text-amber-400 mb-1 leading-tight">{user?.last_login ? new Date(user.last_login).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'First Session'}</h3>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/[0.06]">
                      <p className="text-[10px] text-slate-400 font-medium font-mono">IP: {user?.last_login_ip || 'N/A'}</p>
                      <div title={user?.last_login_device || 'Unknown Device'} className="p-1.5 rounded-lg bg-white/[0.04]">
                        {getDeviceIcon(user?.last_login_device)}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card flex flex-col justify-between bg-gradient-to-br from-rose-500/[0.06] to-transparent" style={{ "--stat-color": "#f43f5e" }}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Behavioral Trust Score</p>
                    <h3 className="text-3xl font-black text-rose-400">{trustScore} <span className="text-base font-bold text-slate-500">/ 10</span></h3>
                    <div className="w-full h-1.5 bg-white/[0.04] rounded-full mt-2 overflow-hidden border border-white/[0.06]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(trustScore / 10) * 100}%` }}
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]"
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 font-medium uppercase tracking-tighter">Aggregate Professional Reputation</p>
                  </div>
                </div>

                <div className="max-w-4xl space-y-6">
                  <div className="glass-card p-8 flex justify-between items-start">
                  <div><h2 className="text-3xl font-black mb-2 flex items-center gap-3">Professional Profile {isVerified && <span className="verified-badge"><ShieldCheck className="w-3 h-3" /> Verified Identity</span>}</h2><p className="text-slate-500 text-sm">Manage your CV, Skills, and Analytics.</p></div>
                  <div className="flex gap-3">
                    <button onClick={exportResume} className="btn-premium px-6 py-3 rounded-xl text-sm flex items-center shadow-lg transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)' }} ><Download className="w-4 h-4 mr-2" /> Export to PDF</button>
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
            </div>
          </motion.div>
        )}

            {/* TAB: EDUCATION */}
            {activeTab === 'education' && (
              <motion.div key="education" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                <div className="glass-card p-10 flex justify-between items-center bg-gradient-to-r from-purple-500/[0.08] to-indigo-500/[0.08] mb-8 gap-8">
                  <div className="flex-1">
                    <h2 className="text-2xl font-extrabold mb-1.5 flex items-center tracking-tight text-white"><GraduationCap className="mr-3 text-purple-400" /> Academic Journey</h2>
                    <p className="text-slate-500 text-sm font-medium">Visualize your educational trajectory and manage your degrees.</p>
                  </div>
                  <button onClick={() => { if (!showEduForm) { setNewEdu({ degree: '', institution: '', start_year: '', end_year: '', year: '', score: '' }); setIsEditingEdu(false); } setShowEduForm(!showEduForm); }} 
                    className="btn-premium px-8 py-3.5 rounded-2xl text-sm flex items-center gap-2.5 shadow-xl shadow-purple-500/25 active:scale-95 transition-all whitespace-nowrap" 
                    style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                  >
                    <Plus className="w-5 h-5 flex-shrink-0" /> 
                    <span className="font-bold">Add Degree</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showEduForm && (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddEducation} className="mb-6 overflow-hidden">
                      <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.06] space-y-6 shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Qualification / Degree</label>
                            <div className="relative"><BookOpen className="absolute left-4 top-4 w-5 h-5 text-indigo-400" /><input type="text" placeholder="e.g. Bachelor of Technology" required value={newEdu.degree} onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })} className="glass-input w-full pl-12 !py-4 text-base" /></div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center"><Calendar className="w-3 h-3 mr-1.5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Starting Year</label>
                            <div className="relative">
                              <select required value={newEdu.start_year} onChange={(e) => setNewEdu({ ...newEdu, start_year: e.target.value })} className="glass-input w-full px-4 appearance-none !py-4 text-base cursor-pointer">
                                <option value="">Select Start Year</option>
                                {[2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Institution Name</label>
                            <div className="relative"><Building2 className="absolute left-4 top-4 w-5 h-5 text-indigo-400" /><input type="text" placeholder="e.g. Adamas University" required value={newEdu.institution} onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })} className="glass-input w-full pl-12 !py-4 text-base" /></div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center"><Calendar className="w-3 h-3 mr-1.5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Ending / Graduation Year</label>
                            <div className="relative">
                              <select required value={newEdu.end_year || newEdu.year} onChange={(e) => setNewEdu({ ...newEdu, end_year: e.target.value, year: e.target.value })} className="glass-input w-full px-4 appearance-none !py-4 text-base cursor-pointer">
                                <option value="">Select End Year</option>
                                {[2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          <div className="md:col-span-1 space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Percentage / CGPA</label>
                            <div className="relative"><Activity className="absolute left-4 top-4 w-5 h-5 text-indigo-400" /><input type="number" step="0.01" placeholder="e.g. 85.50" required value={newEdu.score} onChange={(e) => setNewEdu({ ...newEdu, score: e.target.value })} className="glass-input w-full pl-12 !py-4 text-base" /></div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-4 pt-4">
                          <button type="button" onClick={() => { setShowEduForm(false); setIsEditingEdu(false); }} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors">Discard</button>
                          <button type="submit" className="btn-premium px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/20">{isEditingEdu ? 'Update Ledger' : 'Save to Ledger'}</button>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  {cvData.education.length === 0 ? (
                    <div className="text-center py-20 glass-card border-dashed">
                      <GraduationCap className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                      <p className="text-slate-500 italic">Your educational records will appear here.</p>
                    </div>
                  ) : (
                    cvData.education.map((edu, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="p-7 rounded-3xl glass-card flex justify-between items-center hover:bg-white/[0.04] transition-all border-l-4 border-l-purple-500/50">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                            <BookOpen className="w-7 h-7 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-black text-xl text-white mb-1">{edu.degree}</h4>
                            <p className="text-slate-400 font-bold text-sm tracking-wide">{edu.institution}</p>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="bg-white/[0.06] text-slate-500 text-[10px] font-black px-3 py-1 rounded-lg border border-white/[0.08] uppercase">{edu.start_year || 'N/A'} — {edu.end_year || edu.year || 'N/A'}</span>
                              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-3 py-1 rounded-lg border border-emerald-500/20">SCORE: {edu.score}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setNewEdu(edu); setShowEduForm(true); setIsEditingEdu(true); setEditEduId(edu.id || edu._id); }} className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all" title="Edit Record"><Edit2 className="w-5 h-5" /></button>
                          <button onClick={() => handleRemoveEducation(edu.id || edu._id)} className="p-3 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: LEDGER */}
            {activeTab === 'ledger' && (
              <motion.div key="ledger" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-6">
                <div className="glass-card p-8 flex justify-between items-center bg-gradient-to-r from-emerald-500/[0.06] to-teal-500/[0.06]">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 flex items-center"><ShieldCheck className="mr-3 text-emerald-400" /> Official Employment Ledger</h2>
                    <p className="text-slate-500 text-sm">Blockchain-verified timeline. Active jobs require a Relieve Request to close.</p>
                  </div>
                  <button onClick={() => setShowExpForm(!showExpForm)} className="btn-premium px-6 py-2 rounded-full text-sm" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>Add New Job</button>
                </div>

                <AnimatePresence>
                  {showExpForm && (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddExperience} className="mb-2 overflow-hidden">
                      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-4">
                        <p className="text-xs text-amber-400 font-bold mb-2 flex items-center"><Info className="w-3 h-3 mr-1" /> You must select an existing registered employer for Onboarding Verification.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Job Role / Title</label>
                            <div className="relative"><Briefcase className="absolute left-4 top-4 w-5 h-5 text-indigo-400" /><input type="text" placeholder="e.g. Senior Developer" required value={newExp.role} onChange={(e) => setNewExp({ ...newExp, role: e.target.value })} className="glass-input w-full pl-12 !py-4 text-base" /></div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Registered Employer</label>
                            <div className="relative">
                              <Building2 className="absolute left-4 top-4 w-5 h-5 text-indigo-400" />
                              <select required value={newExp.firm} onChange={(e) => setNewExp({ ...newExp, firm: e.target.value })} className="glass-input w-full pl-12 appearance-none !py-4 text-base cursor-pointer">
                                <option value="" disabled className="bg-slate-900">Select Company...</option>
                                {registeredEmployers.map((emp, i) => <option key={i} value={emp} className="bg-slate-900">{emp}</option>)}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center"><Calendar className="w-3 h-3 mr-1.5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Start Date</label>
                            <div className="relative"><input type="date" required value={newExp.start} onChange={(e) => setNewExp({ ...newExp, start: e.target.value })} className="glass-input w-full px-4 !py-4 text-base" /></div>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center"><Calendar className="w-3 h-3 mr-1.5 text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> End Date / Status</label>
                            <div className="flex items-center gap-4">
                              {!newExp.current ? (
                                <div className="relative flex-1"><input type="date" required={!newExp.current} value={newExp.end} onChange={(e) => setNewExp({ ...newExp, end: e.target.value })} className="glass-input w-full px-4 !py-4 text-base" /></div>
                              ) : (
                                <div className="flex-1 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center"><ShieldCheck className="w-5 h-5 mr-3" /> Still Working at this Company</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-end pb-1">
                            <label className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:bg-white/[0.06] transition-all group">
                              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300">Currently Employed</span>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={newExp.current} onChange={(e) => setNewExp({ ...newExp, current: e.target.checked, end: '' })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                              </div>
                            </label>
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

            {/* TAB: NOTICEBOARD */}
            {activeTab === 'noticeboard' && (
              <motion.div key="noticeboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="max-w-4xl space-y-4">
                {noticeboardJobs.jobs.length === 0 ? (
                  <p className="text-center text-slate-500 py-10 border border-dashed rounded-3xl border-white/[0.08]">No active job postings available.</p>
                ) : (
                  noticeboardJobs.jobs.map((job, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="glass-card p-8">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">{job.job_title}</h3>
                          <p 
                            className="font-medium flex items-center text-slate-400 cursor-pointer hover:text-indigo-400 transition-colors group/company"
                            onClick={() => viewCompanyDetails(job.company_name)}
                          >
                            <Building2 className="w-4 h-4 mr-1 text-indigo-400 group-hover/company:scale-110 transition-transform" /> 
                            <span className="border-b border-transparent group-hover/company:border-indigo-400/50">{job.company_name}</span>
                          </p>
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
                
                <Pagination 
                    currentPage={noticeboardJobs.page}
                    totalItems={noticeboardJobs.total}
                    itemsPerPage={30}
                    onPageChange={(page) => setNoticeboardJobs(p => ({ ...p, page }))}
                />
              </motion.div>
            )}

            {/* TAB: SECURITY */}
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

                <div className="glass-card p-6 md:p-10 relative overflow-hidden mt-6">
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

            {/* TAB: NOTIFICATIONS */}
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
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-2xl p-10 rounded-[2.5rem] glass-card shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-y-auto max-h-[90vh] !bg-slate-900/90 border border-white/[0.1]">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black flex items-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"><Settings className="w-8 h-8 mr-4 text-indigo-400" /> Edit Profile</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Keep your professional identity up to date.</p>
                  </div>
                  <button onClick={() => { setShowEditProfileModal(false); setIsEditingPersonal(false); }} className="p-3 bg-white/[0.06] rounded-2xl hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-white/[0.08]"><X className="w-6 h-6" /></button>
                </div>

                <div className="space-y-8">
                  {/* Name Input */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex justify-between items-center">
                      Full Legal Name
                      <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[10px] border border-indigo-500/20">
                        {user?.name_edits_remaining !== undefined ? `${user.name_edits_remaining} out of 5 edits left` : '5 out of 5 left'}
                      </span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                      <input type="text" placeholder="Your full name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="glass-input w-full pl-14 !py-5 text-lg font-bold shadow-inner" />
                    </div>
                  </div>

                  {/* Email & UID Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email ID</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="glass-input w-full !py-4 text-base font-bold text-indigo-400 shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Employee Unique ID</label>
                      <input type="text" value={user?.id || ''} disabled className="glass-input w-full opacity-40 cursor-not-allowed !py-4 text-base font-mono font-bold text-emerald-400 bg-black/20" />
                    </div>
                  </div>

                  {/* Gender Toggle */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Gender</label>
                    <div className="flex p-2 rounded-2xl bg-black/30 border border-white/[0.08] gap-2">
                      {['Male', 'Female', 'Transgender'].map(g => (
                        <button type="button" key={g} onClick={() => setEditForm({ ...editForm, gender: g })} className={`flex-1 py-3 text-sm rounded-xl font-black transition-all duration-300 ${editForm.gender === g ? 'bg-indigo-600 text-white shadow-[0_5px_15px_rgba(79,70,229,0.4)] translate-y-[-2px]' : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-300'}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DOB Row */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex justify-between items-center">
                      Date of Birth
                      <span className="text-indigo-400 text-[10px]">
                        {user?.dob_edits_remaining !== undefined ? `${user.dob_edits_remaining} out of 3 left` : '3 out of 3 left'}
                      </span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                      <input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} className="glass-input w-full pl-14 !py-4 text-base font-bold [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                    </div>
                  </div>

                  {/* Phone Row */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mobile number</label>
                    <PhoneInput
                      ref={phoneInputRef}
                      value={editForm.phone}
                      onChange={(number) => setEditForm(prev => ({ ...prev, phone: number }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-12 pt-8 border-t border-white/[0.1]">
                  <button onClick={() => setShowEditProfileModal(false)} className="px-8 py-4 text-sm font-black text-slate-500 hover:text-slate-200 transition-colors">Cancel Changes</button>
                  <button onClick={handleUpdateProfileV2} className="btn-premium px-10 py-4 rounded-2xl text-sm font-black flex items-center shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}><Save className="w-5 h-5 mr-3" /> Commit Changes</button>
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
        
        {/* COMPANY DETAILS MODAL */}
        <AnimatePresence>
          {showCompanyModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9, y: 30 }} 
                className="w-full max-w-2xl overflow-hidden rounded-[2rem] glass-card border border-white/[0.1] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)]"
              >
                {isCompanyLoading ? (
                  <div className="p-20 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <p className="text-slate-400 font-bold animate-pulse">Decrypting Company Profile...</p>
                  </div>
                ) : companyDetails ? (
                  <div className="relative">
                    {/* Header/Banner Section */}
                    <div className="h-32 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-indigo-600/20 flex items-center justify-center relative border-b border-white/[0.05]">
                      <div className="absolute top-6 right-6">
                        <button onClick={() => setShowCompanyModal(false)} className="p-3 bg-white/[0.06] rounded-2xl hover:bg-rose-500/20 hover:text-rose-400 transition-all border border-white/[0.08] backdrop-blur-md">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="w-20 h-20 rounded-2xl bg-slate-900/80 border border-white/[0.1] flex items-center justify-center shadow-2xl translate-y-8">
                        <Building2 className="w-10 h-10 text-indigo-400" />
                      </div>
                    </div>

                    <div className="p-10 pt-16 space-y-8">
                      <div className="text-center">
                        <h2 className="text-4xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{companyDetails.company_name}</h2>
                        <p className="text-indigo-400 font-bold mt-2 flex items-center justify-center">
                          <MapPin className="w-4 h-4 mr-2" /> Global Operations
                          <span className="mx-3 text-slate-700">|</span>
                          <Calendar className="w-4 h-4 mr-2" /> Est. {companyDetails.establishment_year || 'N/A'}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Workforce</p>
                          <p className="text-xl font-black text-indigo-400">{companyDetails.analytics.active_workforce}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Retention</p>
                          <p className="text-xl font-black text-emerald-400">{companyDetails.analytics.avg_retention_rate}y</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Trust Index</p>
                          <p className="text-xl font-black text-rose-400">{companyDetails.analytics.workforce_trust_index}/10</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                          <Info className="w-4 h-4 mr-2 text-indigo-400" /> About the Company
                        </h4>
                        <div className="p-6 rounded-2xl bg-black/20 border border-white/[0.06] leading-relaxed text-slate-300 text-sm italic">
                          "{companyDetails.about || "This company hasn't provided a public bio yet. They are a verified employer on our secure professional network."}"
                        </div>
                      </div>

                      <div className="pt-4 flex justify-center">
                        <button 
                          onClick={() => setShowCompanyModal(false)}
                          className="px-10 py-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white font-black transition-all shadow-lg text-sm"
                        >
                          Close Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
      {/* APPROVAL REQUEST MODAL */}
      <AnimatePresence>
        {showApprovalModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0a0f1d]/90 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="glass-card max-w-md w-full p-8 border-rose-500/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center text-rose-400">
                  <AlertTriangle className="mr-3 w-5 h-5" /> Edit Limit Exhausted
                </h3>
                <button onClick={() => setShowApprovalModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                You have reached the maximum allowed edits for these fields (Name/DOB). To proceed with these changes, please submit an approval request to the system administrator.
              </p>

              <div className="space-y-4 mb-8">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Reason for Update</label>
                <textarea
                  className="glass-input w-full min-h-[100px] text-sm py-3 px-4"
                  placeholder="Explain why these changes are necessary (e.g., Typo correction, Legal name change)..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowApprovalModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-400 font-bold hover:bg-white/5 transition-all text-sm">Cancel</button>
                <button
                  onClick={submitApprovalRequest}
                  disabled={isSubmittingApproval || !approvalReason.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmittingApproval ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Request Approval"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
