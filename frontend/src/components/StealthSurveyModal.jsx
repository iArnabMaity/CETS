import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSignature, ShieldCheck, CheckCircle, Info, ChevronRight, X } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';

const questions = [
  {
    id: 'onboarding',
    title: 'Onboarding & Integration',
    options: {
      A: "Took initiative to learn systems independently and adapted flawlessly.",
      B: "Required standard orientation but settled in without major issues.",
      C: "Struggled with basic company protocols despite repeated guidance."
    }
  },
  {
    id: 'reliability',
    title: 'Reliability under Pressure',
    options: {
      A: "Volunteered to handle critical issues and delivered consistently.",
      B: "Managed their assigned workload adequately during peak times.",
      C: "Frequently missed internal deadlines and required constant follow-up."
    }
  },
  {
    id: 'collaboration',
    title: 'Team Dynamics & Collaboration',
    options: {
      A: "Elevated the team's morale and actively mentored peers.",
      B: "Worked well within their silo and avoided conflicts.",
      C: "Often created friction or derailed productive team meetings."
    }
  },
  {
    id: 'quality',
    title: 'Quality of Output',
    options: {
      A: "Consistently exceeded standards with zero-defect deliverables.",
      B: "Met the basic requirements outlined in their job description.",
      C: "Deliverables frequently required major revisions by superiors."
    }
  },
  {
    id: 'adaptability',
    title: 'Adaptability to Change',
    options: {
      A: "Championed new workflows and helped others transition smoothly.",
      B: "Accepted changes eventually after initial hesitation.",
      C: "Actively resisted new processes and clung to outdated methods."
    }
  },
  {
    id: 'ethics',
    title: 'Professional Ethics',
    options: {
      A: "Demonstrated impeccable integrity even when unobserved.",
      B: "Followed standard company compliance policies without issue.",
      C: "Displayed concerning behaviors regarding company resources."
    }
  },
  {
    id: 'communication',
    title: 'Clarity in Communication',
    options: {
      A: "Articulated complex ideas perfectly to non-technical stakeholders.",
      B: "Communicated adequately but often required clarifying questions.",
      C: "Emails and updates were frequently confusing or misleading."
    }
  },
  {
    id: 'innovation',
    title: 'Problem Solving & Innovation',
    options: {
      A: "Identified systemic issues and permanently resolved them.",
      B: "Fixed immediate problems using established company playbooks.",
      C: "Repeatedly ignored obvious issues until they became critical."
    }
  },
  {
    id: 'leadership',
    title: 'Implicit Leadership',
    options: {
      A: "Naturally took point on chaotic projects and organized the chaos.",
      B: "Followed instructions well but rarely stepped forward.",
      C: "Actively avoided responsibility or blamed others for failures."
    }
  },
  {
    id: 'departure',
    title: 'Departure Professionalism',
    options: {
      A: "Provided meticulous handover documentation and ensured no disruption.",
      B: "Completed the standard notice period with basic transition tasks.",
      C: "Left abruptly or checked out entirely during their notice period."
    }
  }
];

export default function StealthSurveyModal({ isOpen, target, onClose, user, lockoutMonths = 6 }) {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback to avoid error before target loads
  if (!isOpen || !target) return null;

  const handleSelect = (qId, optionKey) => {
    setAnswers({ ...answers, [qId]: optionKey });
    // Auto advance if not the last question
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(prev => prev + 1), 300);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      Swal.fire({ icon: 'warning', title: 'Survey Incomplete', text: 'Please complete all sections of the behavioral survey.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        evaluator_id: user.id,
        evaluatee_id: target.employee_id || target.id,
        company_name: user.company_name,
        role: "employer",
        answers: answers,
        lockout_months: target.lockoutMonths || 3
      };
      
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
      await axios.post(`${API_BASE}/api/evaluations/submit`, payload);
      
      Swal.fire({ icon: 'success', title: 'Evaluation Hashed', text: 'Evaluation securely processed and hashed to the central ledger.' });
      onClose();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Submission Failed', text: err.response?.data?.detail || "Failed to submit the evaluation." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.95 }} 
          className="w-full max-w-2xl p-8 rounded-3xl glass-card relative overflow-hidden !bg-slate-900/95"
        >
          {/* SECURE HEADER */}
          <div className="border-b border-rose-500/20 pb-4 mb-6 flex justify-between items-center">
             <div>
               <h2 className="text-xl font-black text-rose-400 flex items-center">
                 <ShieldCheck className="w-5 h-5 mr-2" /> HR Verification Sweep
               </h2>
               <p className="text-xs text-slate-400 mt-1 font-mono">Target: {target?.employee_name || 'Candidate'} | ID: {target?.employee_id}</p>
             </div>
             <button onClick={async () => {
               const result = await Swal.fire({
                 title: 'Skip Compliance?',
                 text: 'Are you sure you want to skip the compliance evaluation? This is highly discouraged for audit purposes.',
                 icon: 'warning',
                 showCancelButton: true,
                 confirmButtonColor: '#ef4444',
                 cancelButtonColor: '#64748b',
                 confirmButtonText: 'Yes, skip it'
               });
               if (result.isConfirmed) onClose();
             }} className="text-xs text-slate-500 hover:text-rose-400 font-bold transition-colors">Skip (Not Recommended)</button>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Info className="inline w-4 h-4 mr-2 text-indigo-400" />
            Select the statement that most accurately describes the candidate's historical behavior at your company. This data is converted into an anonymous aggregate metric to prevent bias.
          </p>

          <div className="mb-6">
             <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                 <span>Parameter {currentStep + 1} of {questions.length}</span>
                 <span><span className="text-indigo-400">{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span> Assessed</span>
             </div>
             <div className="strength-bar h-1">
                 <div className="strength-bar-fill bg-indigo-500 transition-all duration-300" style={{ width: `${((currentStep) / questions.length) * 100}%` }}></div>
             </div>
          </div>

           <AnimatePresence mode="wait">
              <motion.div 
                key={currentQ.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                 <h3 className="text-lg font-bold text-white flex items-center mb-4">
                     <span className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.1] text-indigo-400 flex items-center justify-center text-xs mr-3">{currentStep + 1}</span>
                     {currentQ.title}
                 </h3>

                 <div className="space-y-2">
                    {Object.entries(currentQ.options).map(([key, text]) => (
                        <button 
                          key={key} 
                          onClick={() => handleSelect(currentQ.id, key)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${answers[currentQ.id] === key ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] text-slate-300 hover:border-white/[0.1]'}`}
                        >
                            <span className="text-sm font-medium leading-relaxed">{text}</span>
                        </button>
                    ))}
                 </div>
              </motion.div>
           </AnimatePresence>

           <div className="mt-8 flex justify-between items-center pt-4 border-t border-white/[0.05]">
               <button 
                  disabled={currentStep === 0} 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="text-xs font-bold text-slate-500 disabled:opacity-30 flex items-center hover:text-slate-300"
               >
                   Previous
               </button>
               
               {currentStep < questions.length - 1 ? (
                   <button 
                      disabled={!answers[currentQ.id]}
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="btn-premium px-6 py-2 rounded-xl text-xs flex items-center disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                       Next Parameter <ChevronRight className="w-4 h-4 ml-1" />
                   </button>
               ) : (
                   <button 
                      disabled={Object.keys(answers).length < questions.length || isSubmitting}
                      onClick={handleSubmit}
                      className="btn-premium px-8 py-2.5 rounded-xl text-sm font-bold flex items-center"
                      style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 4px 15px -3px rgba(225, 29, 72, 0.4)' }}
                   >
                       {isSubmitting ? 'Securing Data...' : 'Finalize & Sign Ledger'} <FileSignature className="w-4 h-4 ml-2" />
                   </button>
               )}
           </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
