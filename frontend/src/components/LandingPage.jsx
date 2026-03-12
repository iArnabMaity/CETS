import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Activity, Users, ArrowRight, ChevronUp, Lock, Hexagon, Database, X, Shield, CheckCircle, Zap, Sun, Moon, User, Eye, EyeOff } from 'lucide-react';
import ParticleBackground from './ParticleBackground';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function LandingPage({ onNavigateToAuth, setUser, darkMode }) {

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // --- Modals State ---
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // --- Admin Login State ---
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminCaptcha, setAdminCaptcha] = useState({ q: '', a: 0 });
  const [adminCaptchaInput, setAdminCaptchaInput] = useState('');

  // Generate a simple math captcha for admin login
  const generateAdminCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setAdminCaptcha({ q: `${num1} + ${num2}`, a: num1 + num2 });
    setAdminCaptchaInput('');
  };

  const handleShowAdminModal = () => {
    generateAdminCaptcha();
    setShowAdminModal(true);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        email: adminEmail,
        password: adminPassword,
        latency: 45.0, packet_size: 3000.0, login_attempts: 1, error_rate: 0.01, country: "India"
      });
      if (response.data.role !== 'admin') {
        setAdminError('ACCESS DENIED: This portal is restricted to System Administrators only.');
        setAdminLoading(false);
        return;
      }
      setUser(response.data);
    } catch (err) {
      if (err.response?.status === 403) setAdminError('CONNECTION TERMINATED: Firewall blocked this request.');
      else setAdminError(err.response?.data?.detail || 'Invalid credentials or connection error.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden selection:bg-indigo-500/30 transition-colors duration-500 bg-[#020817] text-slate-100">

      {/* 1. Magical Glowing Background Blob & Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 z-0 opacity-60">
          <ParticleBackground />
        </div>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[30%] -left-[10%] w-[70vw] h-[70vw] filter blur-[120px] rounded-full bg-indigo-600/20 mix-blend-screen opacity-70" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[30%] -right-[10%] w-[70vw] h-[70vw] filter blur-[120px] rounded-full bg-purple-600/20 mix-blend-screen opacity-70" />
      </div>

      {/* 2. Sticky Glassmorphism Navbar */}
      <nav className="fixed top-0 w-full z-40 border-b backdrop-blur-2xl transition-all duration-500 bg-slate-950/50 border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hexagon className="w-8 h-8 text-indigo-400 fill-indigo-400/20" />
            <span className="text-2xl font-black tracking-tighter text-white">CETS</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#about" className="transition-colors hover:text-indigo-400">Platform</a>
            <a href="#features" className="transition-colors hover:text-indigo-400">Features</a>
            <a href="#security" className="transition-colors hover:text-indigo-400">Security</a>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onNavigateToAuth}
              className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white transition-all duration-300 bg-indigo-600 rounded-full active:scale-95 hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
            >
              Register / Login
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          <span className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full mb-6 shadow-sm border ${darkMode ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-100/80 border-indigo-200'}`}>
            <span className={`flex w-2 h-2 rounded-full mr-2 animate-pulse ${darkMode ? 'bg-indigo-400' : 'bg-indigo-600'}`}></span>
            v2.0 Blockchain Ledger Online
          </span>

          <h1 className={`text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            The Future of <br className="hidden md:block" />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${darkMode ? 'from-indigo-400 via-purple-400 to-pink-400' : 'from-indigo-600 via-purple-600 to-pink-600'}`}>
              Verified Career Tracking
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl mb-10 leading-relaxed font-medium text-slate-400">
            Eliminate resume fraud. Streamline corporate onboarding. CETS provides a cryptographically secure, immutable ledger bridging top-tier talent with enterprise employers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onNavigateToAuth} className="w-full sm:w-auto px-8 py-4 font-bold rounded-full hover:scale-105 transition-all shadow-xl active:scale-95 text-slate-900 bg-white shadow-white/10">
              Join the Ecosystem
            </button>
          </div>

        </motion.div>
      </section>

      {/* --- PLATFORM SECTION --- */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-20 z-10 relative">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-white">Build Trust with <br /> <span className="text-indigo-500">Immutable Proof</span></h2>
              <p className="text-lg mb-6 leading-relaxed text-slate-400">The CETS platform represents a paradigm shift in career verification. Instead of relying on easily forged PDF resumes or unverified LinkedIn profiles, we leverage blockchain architecture to create cryptographic proofs of employment and skills.</p>
              <ul className="space-y-4 text-slate-300">
                {['Decentralized Identity Management', 'Smart Contract Based Validations', 'Real-time Organization Sync'].map((item, idx) => (
                  <li key={idx} className="flex items-center"><CheckCircle className="w-5 h-5 text-indigo-500 mr-3" /> {item}</li>
                ))}
              </ul>
            </motion.div>
          </div>
          <div className="md:w-1/2 w-full">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="p-8 rounded-3xl border bg-slate-900/50 border-slate-800 shadow-2xl">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex flex-col items-center justify-center p-6 text-center border border-indigo-500/30">
                <Hexagon className="w-16 h-16 text-indigo-500 mb-4 animate-[spin_10s_linear_infinite]" />
                <p className="font-mono text-sm text-indigo-300">BLOCK_HEIGHT: 8,495,201<br />LAST_HASH: 0x4f...92a<br />NETWORK_STATUS: OPTIMAL</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section id="features" className="py-20 relative z-10 border-y bg-slate-900/20 border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">Enterprise-Grade <span className="text-purple-500">Features</span></h2>
            <p className="max-w-2xl mx-auto text-lg text-slate-400">Designed for scale, built for security. Everything you need to manage your organization's talent truth.</p>
          </div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.2 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { icon: Zap, title: "Instant Verification", desc: "Validate an entire career topology in milliseconds via our high-throughput read nodes." },
              { icon: Lock, title: "Tamper-Proof Records", desc: "Once a record is committed to the CETS ledger, it cannot be altered or deleted by malicious actors." },
              { icon: Database, title: "API Integration", desc: "Seamlessly integrate our verification endpoints into your existing HR systems (Workday, SAP, etc)." }
            ].map((f, i) => (
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                }}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                key={i} 
                className="p-8 rounded-3xl border bg-slate-950/50 border-slate-800 hover:bg-slate-900 transition-colors shadow-lg hover:shadow-indigo-500/10 cursor-default"
              >
                <f.icon className="w-10 h-10 mb-6 text-purple-400" />
                <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                <p className="leading-relaxed text-slate-400">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- SECURITY SECTION --- */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 z-10 relative">
        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="md:w-1/2">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center px-3 py-1 text-sm font-bold rounded-full mb-6 text-rose-500 bg-rose-500/10 border border-rose-500/20">
                <Shield className="w-4 h-4 mr-2" />
                Military-Grade Encryption
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-white">Zero-Knowledge <br /> <span className="text-rose-500">Data Architecture</span></h2>
              <p className="text-lg mb-6 leading-relaxed text-slate-400">Your personal data never leaves your control. We utilize Zero-Knowledge Proofs (zk-SNARKs) to verify your credentials to employers without ever revealing the underlying sensitive information.</p>
              <ul className="space-y-4 text-slate-300">
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-rose-500 mr-3" /> SOC2 Type II Certified</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-rose-500 mr-3" /> AES-256 Data-at-Rest Encryption</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-rose-500 mr-3" /> GDPR & CCPA Fully Compliant</li>
              </ul>
            </motion.div>
          </div>
          <div className="md:w-1/2 w-full">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="p-8 rounded-3xl border bg-slate-900/50 border-rose-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiM0NzU1NjkiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] mix-blend-overlay"></div>
              <pre className="font-mono text-xs overflow-hidden text-rose-400/70">
                {`function verifyProof(bytes calldata proof, uint[2] calldata input) public view returns (bool) {
    return validator.verifyTx(
        proof,
        input
    );
}
// VERIFIED: TRUE
// LATENCY: 12ms`}
              </pre>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- WHO CAN JOIN SECTION --- */}
      <section className="py-24 relative z-10 border-y bg-slate-950/40 border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">Who Can <span className="text-emerald-500">Join?</span></h2>
            <p className="max-w-2xl mx-auto text-lg text-slate-400">CETS is designed for two core pillars of the workforce ecosystem.</p>
          </div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.3 }
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
          >
            <motion.div 
              variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } }
              }}
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-3xl border bg-indigo-500/[0.06] border-indigo-500/20 hover:border-indigo-400/40 transition-all shadow-xl"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-indigo-500/10">
                <Users className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Employees & Professionals</h3>
              <p className="leading-relaxed mb-4 text-slate-400">Build a tamper-proof professional identity. Your skills, experience, and achievements are cryptographically sealed — giving you a verifiable career passport that no one can forge.</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Career history with blockchain-backed proof', 'AI-powered skill recommendations', 'One-click verified resume export'].map((item, i) => (
                  <li key={i} className="flex items-center"><CheckCircle className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />{item}</li>
                ))}
              </ul>
            </motion.div>
            <motion.div 
              variants={{
                hidden: { opacity: 0, x: 30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } }
              }}
              whileHover={{ scale: 1.02 }}
              className="p-8 rounded-3xl border bg-amber-500/[0.06] border-amber-500/20 hover:border-amber-400/40 transition-all shadow-xl"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-amber-500/10">
                <Activity className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">Employers & Organizations</h3>
              <p className="leading-relaxed mb-4 text-slate-400">Eliminate hiring fraud. Verify candidate credentials instantly. Manage your workforce with a real-time dashboard backed by immutable records and AI-driven anomaly detection.</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Instant credential verification API', 'Advanced AI firewall for fraud detection', 'Workforce analytics & onboarding CRM'].map((item, i) => (
                  <li key={i} className="flex items-center"><CheckCircle className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" />{item}</li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- WHY JOIN SECTION --- */}
      <section className="max-w-7xl mx-auto px-6 py-24 z-10 relative">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">Why <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">Join CETS?</span></h2>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">We're not just another HR platform. Here's what sets us apart.</p>
        </div>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[
            { emoji: '🔐', title: 'AI Cognitive Firewall', desc: 'Real-time behavioral analysis — latency profiling, device fingerprinting, keystroke dynamics — to stop bots and intruders.' },
            { emoji: '⛓️', title: 'Blockchain Integrity', desc: 'Every employment record is SHA-256 hashed and chained. Tampering is computationally impossible.' },
            { emoji: '🤖', title: 'Autonomous AI Agent', desc: 'OpenClaw integration lets employers manage approvals and employees get career alerts via Telegram or WhatsApp.' },
            { emoji: '📊', title: 'Smart Analytics', desc: 'Real-time workforce dashboards, skill gap analysis, and predictive attrition models for enterprise decision-making.' },
            { emoji: '📄', title: 'One-Click Resume Export', desc: 'Generate a clean, verified PDF resume from your immutable blockchain profile in seconds.' },
            { emoji: '🌍', title: 'MCP Protocol Ready', desc: 'Model Context Protocol server ready for AI assistants to securely query your career data via standardized APIs.' },
          ].map((item, i) => (
            <motion.div 
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
              }}
              whileHover={{ y: -5, borderColor: "rgba(99, 102, 241, 0.5)", transition: { duration: 0.2 } }}
              key={i} 
              className="p-6 rounded-2xl border transition-all bg-slate-900/40 border-slate-800"
            >
              <span className="text-3xl mb-4 block">{item.emoji}</span>
              <h3 className="text-lg font-bold mb-2 text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --- HOW IT WORKS SECTION --- */}
      <section className="py-24 relative z-10 border-y bg-slate-900/20 border-slate-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4 text-white">How It <span className="text-cyan-500">Works</span></h2>
            <p className="max-w-2xl mx-auto text-lg text-slate-400">Getting started is simple. Four steps to a verifiable career identity.</p>
          </div>
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
            }}
            className="space-y-8"
          >
            {[
              { step: '01', title: 'Register & Authenticate', desc: 'Create your account as an Employee or Employer. Our AI Cognitive Firewall analyzes your request in real-time to ensure security.', color: 'indigo' },
              { step: '02', title: 'Build Your Profile', desc: 'Add your skills, experience, education, and languages. Each entry is hashed and added to the immutable blockchain ledger.', color: 'purple' },
              { step: '03', title: 'Get Verified', desc: 'Employers verify your credentials directly from their dashboard. A SHA-256 cryptographic hash confirms every detail.', color: 'cyan' },
              { step: '04', title: 'Stay Protected', desc: 'Our continuous monitoring system tracks login patterns, device fingerprints, and behavioral anomalies 24/7.', color: 'emerald' },
            ].map((item, i) => (
              <motion.div 
                variants={{
                  hidden: { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } }
                }}
                key={i} 
                className="flex items-start gap-6 p-6 rounded-2xl border transition-all bg-slate-950/50 border-slate-800 hover:border-slate-700"
              >
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg bg-${item.color}-500/10 text-${item.color}-400`}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">{item.title}</h3>
                  <p className="leading-relaxed text-slate-400">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. Shadcn-Style Live Stats Grid */}
      <section className="max-w-7xl mx-auto px-6 py-10 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Verified Professionals', value: '54,935+', icon: Users, darkColor: 'text-blue-400', darkBg: 'bg-blue-500/10' },
            { label: 'Active Employers', value: '2,000+', icon: Activity, darkColor: 'text-emerald-400', darkBg: 'bg-emerald-500/10' },
            { label: 'Immutable Hashes', value: '1.2M+', icon: Database, darkColor: 'text-purple-400', darkBg: 'bg-purple-500/10' }
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (i * 0.1) }}
              key={i}
              className="p-6 rounded-3xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 border bg-slate-900/50 border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:border-indigo-500/30"
            >
              <div className="flex justify-between items-start mb-4">
                <p className="font-bold text-slate-400">{stat.label}</p>
                <div className={`p-2 rounded-xl ${stat.darkBg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.darkColor}`} />
                </div>
              </div>
              <p className="text-4xl font-black text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. Modern Footer with Admin Access */}
      <footer className="border-t mt-20 transition-colors duration-500 backdrop-blur-xl border-slate-800 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Hexagon className="w-6 h-6 text-indigo-500" />
            <span className="text-xl font-black tracking-tighter text-white">CETS</span>
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-4 md:space-x-6 text-sm font-medium text-slate-400">
            <button onClick={() => setShowPrivacy(true)} className="transition-colors hover:text-indigo-400">Privacy Policy</button>
            <button onClick={() => setShowTerms(true)} className="transition-colors hover:text-indigo-400">Terms of Service</button>
            {/* Admin Access Trigger */}
            <button onClick={handleShowAdminModal} className="flex items-center transition-colors group text-slate-600 hover:text-rose-400">
              <Lock className="w-3 h-3 mr-1 group-hover:animate-pulse" /> System Access
            </button>
          </div>

          <button onClick={scrollToTop} className="mt-8 md:mt-0 p-3 rounded-full transition-colors shadow-sm bg-slate-800 hover:bg-slate-700 text-slate-300">
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* ADMIN TERMINAL MODAL */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-sm bg-[#0A0E17] border border-rose-500/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-rose-500/30 bg-rose-500/10">
                <p className="text-xs font-mono text-rose-500 flex items-center">root@cets-firewall:~# <span className="ml-2 w-1.5 h-3 bg-rose-500 animate-pulse"></span></p>
                <button onClick={() => { setShowAdminModal(false); setAdminError(''); }} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
                {adminError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs font-mono">{adminError}</div>
                )}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-700 group-focus-within:text-rose-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input required type="text" placeholder="Admin ID (Email)" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-3 pl-10 bg-black border border-slate-800 rounded text-rose-500 font-mono text-sm outline-none focus:border-rose-500 placeholder-slate-800" />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-700 group-focus-within:text-rose-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input required type={showAdminPassword ? "text" : "password"} placeholder="Passkey" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-3 pl-10 pr-10 bg-black border border-slate-800 rounded text-rose-500 font-mono text-sm outline-none focus:border-rose-500 placeholder-slate-800" />
                  <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-700 hover:text-rose-500">
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Math Captcha */}
                <div className="flex items-center space-x-3 bg-black/50 p-3 rounded border border-slate-800">
                  <div className="text-xs font-mono text-slate-500 shrink-0">Security Code: <span className="text-rose-500">{adminCaptcha.q} =</span></div>
                  <input 
                    type="number" 
                    value={adminCaptchaInput} 
                    onChange={e => setAdminCaptchaInput(e.target.value)} 
                    placeholder="?"
                    className="w-16 bg-transparent border-b border-slate-700 text-rose-500 outline-none focus:border-rose-500 px-1 text-center font-mono"
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono">
                  <button type="button" onClick={() => alert("ADMIN RECOVERY PROTOCOL: Please use your physical hardware key or contact technical lead for emergency reset.")} className="text-slate-600 hover:text-rose-400 decoration-dotted underline">Forgot Passkey?</button>
                  <span className="text-slate-800">CETS V2.Secure</span>
                </div>

                <button 
                  type="submit" 
                  disabled={adminLoading || parseInt(adminCaptchaInput) !== adminCaptcha.a} 
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-30 disabled:shadow-none"
                >
                  {adminLoading ? 'VERIFYING...' : 'INITIATE OVERRIDE'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRIVACY & TERMS MODALS */}
      <AnimatePresence>
        {showPrivacy && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl shadow-2xl p-8 relative`}>
              <button onClick={() => setShowPrivacy(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-500/20 transition-colors"><X className="w-5 h-5" /></button>
              <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Privacy Policy</h2>
              <div className="space-y-4 text-sm leading-relaxed">
                <p><strong>Effective Date:</strong> March 12, 2026</p>
                <p>At CETS, protecting your privacy and the security of your data is fundamental to how we operate. This Privacy Policy outlines our practices.</p>
                <h3 className={`text-lg font-bold mt-6 mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>1. Data Control and Ownership</h3>
                <p>You own your data. CETS acts merely as an immutable ledger and verification engine. Records submitted are cryptographically hashed; the raw sensitive data remains encrypted and under your control or that of your authorized employer.</p>
                <h3 className={`text-lg font-bold mt-6 mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>2. Zero-Knowledge Architecture</h3>
                <p>We utilize Zero-Knowledge Proofs (ZKP) which allows us to verify the authenticity of your credentials to third parties without actually possessing or seeing the underlying data. We cannot sell your data because we do not have access to it.</p>
                <h3 className={`text-lg font-bold mt-6 mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>3. Third-party Sharing</h3>
                <p>Your employment verification statuses are only accessible by explicit consent provided via our smart-contract layer. We do not share data with marketing agencies or aggregators.</p>
              </div>
            </motion.div>
          </div>
        )}

        {showTerms && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl shadow-2xl p-8 relative`}>
              <button onClick={() => setShowTerms(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-500/20 transition-colors"><X className="w-5 h-5" /></button>
              <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Terms of Service</h2>
              <div className="space-y-4 text-sm leading-relaxed">
                <p><strong>Effective Date:</strong> March 12, 2026</p>
                <p>Welcome to Career Employment Tracking System (CETS). By using our services, you agree to these terms.</p>
                <h3 className={`text-lg font-bold mt-6 mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>1. Acceptance of Terms</h3>
                <p>By accessing or using the CETS platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, simply do not use the Platform.</p>
                <h3 className={`text-lg font-bold mt-6 mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>2. Enterprise & Employee Responsibilities</h3>
                <p>Employers are responsible for the accuracy of the records they commit to the ledger. Employees must ensure their authorization tokens remain secure. Both parties agree that fraudulent entry attempts will be permanently logged and flagged across the network.</p>
                <h3 className={`text-lg font-bold mt-6 mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>3. Immutability Clause</h3>
                <p>Due to the cryptographic architecture of CETS, records appended to the ledger cannot be retroactively altered. Disputes must be resolved through a superseding amendment block.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}