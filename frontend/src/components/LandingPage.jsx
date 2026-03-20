import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; import axios from 'axios';
import { Building2, LogOut, Users, Briefcase, FileSignature, PieChart, Lock, ShieldCheck, Bell, Plus, X, Eye, CheckCircle, XCircle, Calendar, MapPin, IndianRupee, KeyRound, Minus, User, Phone, Check, Save, Moon, Sun, Settings, ChevronDown, ChevronUp, MessageSquare, Send, Hexagon, Activity, Code, BookOpen, GraduationCap, Info, AlertOctagon, Download, Loader2, Sparkles, EyeOff, Smartphone, Tablet, Laptop, Monitor, Edit2, Shield, Search, Briefcase as Portfolio, Globe, Zap, ArrowRight, Database } from 'lucide-react';
import Swal from 'sweetalert2';
import AOS from 'aos';
import 'aos/dist/aos.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function LandingPage({ onNavigateToRoleSelection, onNavigateToAdminAuth, setUser, darkMode }) {

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    AOS.init({ duration: 1000, once: false });
  }, []);

  // --- Modals State ---
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);



  return (
    <div className="relative min-h-screen overflow-hidden selection:bg-indigo-500/30 transition-colors duration-500 bg-transparent text-slate-100">

      {/* 1. Magical Glowing Orbs (Handled by App.jsx particles, adding extra depth here) */}
      {/* 1. Magical Glowing Orbs v2 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="orb-v2 w-[600px] h-[600px] -top-48 -left-48 bg-indigo-500/20" style={{ animationDelay: '0s' }} />
        <div className="orb-v2 w-[500px] h-[500px] top-1/2 -right-24 bg-rose-500/10" style={{ animationDelay: '-10s' }} />
        <div className="orb-v2 w-[700px] h-[700px] -bottom-48 left-1/4 bg-cyan-500/10" style={{ animationDelay: '-5s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05),transparent_70%)]" />
      </div>

      {/* 2. Sticky Glassmorphism Navbar */}
      <nav className="fixed top-0 w-full z-40 border-b glass-header transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Hexagon className="w-6 h-6 text-indigo-400 fill-indigo-400/20" />
            <span className="text-xl font-black tracking-tighter text-white">CETS</span>
          </motion.div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#about" className="transition-all hover:text-indigo-400 hover:tracking-wide">Platform</a>
            <a href="#features" className="transition-all hover:text-indigo-400 hover:tracking-wide">Features</a>
            <a href="#security" className="transition-all hover:text-indigo-400 hover:tracking-wide">Security</a>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={onNavigateToRoleSelection}
              className="btn-premium flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* 3. Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center z-10" data-aos="fade-up">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          <span className={`inline-flex items-center px-3 py-1 text-sm font-bold rounded-full mb-6 shadow-sm border ${darkMode ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-100/80 border-indigo-200'}`}>
            <span className={`flex w-2 h-2 rounded-full mr-2 animate-pulse ${darkMode ? 'bg-indigo-400' : 'bg-indigo-600'}`}></span>
            v2.0 Blockchain Ledger Online
          </span>

          <h1 className={`text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            The Future of <br className="hidden md:block" />
            <span className="text-vibrant text-glow">
              Verified Career Tracking
            </span>
          </h1>

          <p className="max-w-xl mx-auto text-base md:text-lg mb-10 leading-relaxed font-medium text-slate-400">
            Eliminate resume fraud. Streamline corporate onboarding. CETS provides a cryptographically secure, immutable ledger bridging top-tier talent with enterprise employers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={onNavigateToRoleSelection}
              className="btn-vibrant w-full sm:w-auto px-8 py-4 text-base font-bold rounded-xl text-white shadow-lg shadow-indigo-500/20"
            >
              Join the Ecosystem
            </button>
            <button
              href="#about"
              className="w-full sm:w-auto px-8 py-4 text-base font-bold rounded-xl border border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800 transition-all"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </button>
          </div>

        </motion.div>
      </section>

      {/* --- PLATFORM SECTION --- */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-20 z-10 relative" data-aos="fade-right">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-black mb-6 leading-tight text-white">
                Build Trust with <br />
                <span className="text-vibrant-indigo text-glow">Immutable Proof</span>
              </h2>
              <p className="text-base mb-6 leading-relaxed text-slate-400">The CETS platform represents a paradigm shift in career verification. Instead of relying on easily forged PDF resumes or unverified LinkedIn profiles, we leverage blockchain architecture to create cryptographic proofs of employment and skills.</p>
              <ul className="space-y-4 text-slate-300">
                {['Decentralized Identity Management', 'Smart Contract Based Validations', 'Real-time Organization Sync'].map((item, idx) => (
                  <li key={idx} className="flex items-center text-slate-tint"><CheckCircle className="w-5 h-5 text-indigo-400 mr-3" /> {item}</li>
                ))}
              </ul>
            </motion.div>
          </div>
          <div className="md:w-1/2 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-card-premium p-8 rounded-3xl relative overflow-hidden group"
            >
              <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent flex flex-col items-center justify-center p-8 text-center border border-indigo-500/30 group-hover:border-indigo-500/50 transition-colors">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x)_var(--y),rgba(99,102,241,0.15),transparent_40%)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <Hexagon className="w-20 h-20 text-indigo-400 mb-6 animate-[slow-spin_15s_linear_infinite]" />
                <p className="font-mono text-xs tracking-widest text-indigo-300/80 uppercase">
                  Protocols: ACTIVE<br />
                  Block_Height: 8,495,201<br />
                  Network_Integrity: 99.9%
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section id="features" className="py-20 relative z-10 border-y bg-slate-900/20 border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">Enterprise-Grade <span className="text-vibrant-rose text-glow">Features</span></h2>
            <p className="max-w-xl mx-auto text-base text-slate-400">Designed for scale, built for security. Everything you need to manage your organization's talent truth.</p>
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
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
                whileHover={{
                  y: -8,
                  boxShadow: "0 15px 30px rgba(99, 102, 241, 0.1)",
                }}
                key={i}
                className="glass-card-premium p-8 group cursor-default h-full"
              >
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-all duration-500 group-hover:scale-110 shadow-lg shadow-black/10">
                  <f.icon className="w-7 h-7 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-vibrant-rose transition-colors tracking-tight">{f.title}</h3>
                <p className="leading-relaxed text-slate-400 text-sm group-hover:text-slate-300 transition-colors">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* --- SECURITY SECTION --- */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 z-10 relative" data-aos="fade-left">
        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="md:w-1/2">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center px-3 py-1 text-sm font-bold rounded-full mb-6 text-rose-500 bg-rose-500/10 border border-rose-500/20">
                <Shield className="w-4 h-4 mr-2" />
                Military-Grade Encryption
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-6 text-white leading-tight">Zero-Knowledge <br /> <span className="text-vibrant-rose text-glow">Data Architecture</span></h2>
              <p className="text-base mb-6 leading-relaxed text-slate-400">Your personal data never leaves your control. We utilize Zero-Knowledge Proofs (zk-SNARKs) to verify your credentials to employers without ever revealing the underlying sensitive information.</p>
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
      <section className="py-16 relative z-10 border-y bg-slate-950/40 border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12" data-aos="fade-up">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">Who Can <span className="text-vibrant-emerald text-glow">Join?</span></h2>
            <p className="max-w-xl mx-auto text-base text-slate-400">CETS is designed for two core pillars of the workforce ecosystem.</p>
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
              whileHover={{ y: -8, scale: 1.02 }}
              className="p-10 rounded-3xl border bg-gradient-to-br from-indigo-500/[0.1] to-purple-500/[0.05] border-indigo-500/30 hover:border-indigo-400/60 transition-all shadow-2xl shadow-indigo-500/10 group h-full"
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-indigo-500/20 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/20">
                <Users className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-white group-hover:text-vibrant-indigo transition-all">Employees & Professionals</h3>
              <p className="leading-relaxed mb-4 text-slate-400 text-base">Build a tamper-proof professional identity. Your skills, experience, and achievements are cryptographically sealed — giving you a verifiable career passport that no one can forge.</p>
              <ul className="space-y-3 text-sm text-slate-400">
                {['Career history with blockchain-backed proof', 'AI-powered skill recommendations', 'One-click verified resume export'].map((item, i) => (
                  <li key={i} className="flex items-center"><CheckCircle className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />{item}</li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } }
              }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="p-10 rounded-3xl border bg-gradient-to-br from-amber-500/[0.1] to-orange-500/[0.05] border-amber-500/30 hover:border-amber-400/60 transition-all shadow-2xl shadow-amber-500/10 group h-full"
            >
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-amber-500/20 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/20">
                <Activity className="w-10 h-10 text-amber-400" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-white group-hover:text-vibrant-rose transition-all">Employers & Organizations</h3>
              <p className="leading-relaxed mb-6 text-rose-tint/80 text-lg">Eliminate hiring fraud. Verify candidate credentials instantly. Manage your workforce with a real-time dashboard backed by immutable records and AI-driven anomaly detection.</p>
              <ul className="space-y-4 text-base text-rose-tint/70">
                {['Instant credential verification API', 'Advanced AI firewall for detection', 'Workforce analytics & onboarding CRM'].map((item, i) => (
                  <li key={i} className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />{item}</li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- WHY JOIN SECTION --- */}
      <section id="why-join" className="max-w-7xl mx-auto px-6 py-16 z-10 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4 text-white">Why <span className="text-vibrant-indigo text-glow">Join CETS?</span></h2>
          <p className="max-w-xl mx-auto text-base text-slate-400">We're not just another HR platform. Here's what sets us apart.</p>
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
              className="p-8 rounded-2xl border transition-all glass-card-premium h-full group"
            >
              <span className="text-4xl mb-6 block group-hover:scale-125 transition-transform duration-500">{item.emoji}</span>
              <h3 className="text-xl font-bold mb-3 text-white group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{item.title}</h3>
              <p className="text-base leading-relaxed text-slate-400 group-hover:text-slate-300 transition-colors">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* --- HOW IT WORKS SECTION --- */}
      <section className="py-16 relative z-10 border-y bg-slate-900/20 border-slate-800">
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
      <section id="stats" className="max-w-7xl mx-auto px-6 py-16 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Verified Professionals', value: '54,935+', icon: Users, darkColor: 'text-indigo-400', darkBg: 'bg-indigo-500/10' },
            { label: 'Active Employers', value: '2,000+', icon: Activity, darkColor: 'text-emerald-400', darkBg: 'bg-emerald-500/10' },
            { label: 'Immutable Hashes', value: '1.2M+', icon: Database, darkColor: 'text-purple-400', darkBg: 'bg-purple-500/10' }
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={i}
              className="glass-card-premium p-10 rounded-3xl transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="flex justify-between items-start mb-6">
                <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">{stat.label}</p>
                <div className={`p-3 rounded-2xl ${stat.darkBg} group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.darkColor}`} />
                </div>
              </div>
              <p className="text-5xl font-black text-white tracking-tighter group-hover:text-vibrant transition-all duration-500">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. Modern Footer with Admin Access */}
      <footer className="footer-vibrant border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-3xl relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex flex-col items-center md:items-start space-y-4">
              <div className="flex items-center space-x-3">
                <Hexagon className="w-8 h-8 text-indigo-500 animate-[slow-spin_12s_linear_infinite]" />
                <span className="text-3xl font-black tracking-tighter text-white">CETS</span>
              </div>
              <p className="text-slate-500 text-sm max-w-xs text-center md:text-left">Building the future of immutable career verification on the blockchain.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-sm font-bold text-slate-400 capitalize">
              <button onClick={() => setShowPrivacy(true)} className="transition-all hover:text-indigo-400 hover:scale-110">Privacy</button>
              <button onClick={() => setShowTerms(true)} className="transition-all hover:text-indigo-400 hover:scale-110">Terms</button>
              <button onClick={onNavigateToAdminAuth} className="flex items-center transition-all group text-slate-600 hover:text-rose-400 hover:scale-110 font-bold">
                <Lock className="w-4 h-4 mr-2 group-hover:animate-pulse" /> System Access
              </button>
            </div>

            <button
              onClick={scrollToTop}
              className="p-4 rounded-2xl transition-all shadow-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-400 hover:-translate-y-2 group"
            >
              <ChevronUp className="w-6 h-6 group-hover:animate-bounce" />
            </button>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-900 text-center text-[10px] font-mono text-slate-700 tracking-widest uppercase">
            &copy; 2026 CETS PROTOCOL. ALL RIGHTS RESERVED. SECURED BY SHA-256.
          </div>
        </div>
      </footer>



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

        {/* --- ROLE SELECTION MODAL --- */}
      </AnimatePresence>
    </div>
  );
}