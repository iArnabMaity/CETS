import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hexagon, User, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

export default function RoleSelectionPage({ onNavigateToAuth, onBack }) {
  useEffect(() => {
    AOS.init({ duration: 800, once: false });
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden bg-transparent pt-20 pb-10 px-4">
      
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="absolute top-8 left-8 p-3 rounded-full bg-slate-900/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-all z-20 shadow-md group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      </button>

      {/* Main Container */}
      <div 
        className="w-full max-w-4xl glass-card-premium p-1 relative overflow-hidden flex flex-col items-center z-10"
        data-aos="fade-up"
      >
        <div className="w-full text-center py-12 px-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 mb-4"
          >
            <Hexagon className="w-8 h-8 text-indigo-400 fill-indigo-400/20" />
            <span className="text-xl md:text-2xl font-black tracking-widest text-white uppercase">Initialize System Access</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 text-white" data-aos="zoom-in" data-aos-delay="100">
            Select Your <span className="text-vibrant text-glow">Identity Path</span>
          </h2>
          <p className="max-w-xl mx-auto text-slate-400 text-sm md:text-base leading-relaxed" data-aos="fade-up" data-aos-delay="200">
            Please choose the appropriate portal to continue. Your career data is cryptographically protected based on your specific role within the ecosystem.
          </p>
        </div>

        <div className="relative w-full grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-10 bg-black/20">
          {/* Employee Card */}
          <motion.div 
            data-aos="fade-right" data-aos-delay="300"
            whileHover={{ y: -5, scale: 1.01 }}
            onClick={() => onNavigateToAuth('employee')}
            className="group relative h-full flex flex-col p-8 rounded-3xl border border-indigo-500/20 hover:border-indigo-500/60 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all cursor-pointer overflow-hidden shadow-2xl shadow-indigo-500/5 hover:shadow-indigo-500/20"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <User className="w-32 h-32 text-indigo-400" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/10 border border-indigo-500/30">
              <User className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black mb-2 text-white group-hover:text-vibrant-indigo transition-colors tracking-tight">For Professionals</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-grow font-medium">Manage your verifiable career passport. Access tamper-proof records and seamlessly share your verified skills with the global workforce network.</p>
            <div className="flex items-center font-bold text-xs uppercase tracking-[0.2em] text-indigo-400 group-hover:translate-x-2 transition-transform">
              Initialize Passport <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </motion.div>

          {/* Employer Card */}
          <motion.div 
            data-aos="fade-left" data-aos-delay="400"
            whileHover={{ y: -5, scale: 1.01 }}
            onClick={() => onNavigateToAuth('employer')}
            className="group relative h-full flex flex-col p-8 rounded-3xl border border-rose-500/20 hover:border-rose-500/60 bg-rose-500/5 hover:bg-rose-500/10 transition-all cursor-pointer overflow-hidden shadow-2xl shadow-rose-500/5 hover:shadow-rose-500/20"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <Building2 className="w-32 h-32 text-rose-400" />
            </div>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/10 border border-rose-500/30">
              <Building2 className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-2xl font-black mb-2 text-white group-hover:text-vibrant-rose transition-colors tracking-tight">For Organizations</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-grow font-medium">Secure your workforce integrity. Verify candidate credentials directly and manage your talent pool with 100% cryptographic certainty.</p>
            <div className="flex items-center font-bold text-xs uppercase tracking-[0.2em] text-rose-400 group-hover:translate-x-2 transition-transform">
              Access Portal <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
