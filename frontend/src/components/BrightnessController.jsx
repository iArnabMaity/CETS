import React, { useState, useEffect } from 'react';
import { Sun, Moon, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BrightnessController = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [brightness, setBrightness] = useState(50); // 50% is the baseline "Normal"

  // Apply brightness to the entire app via filter on #root
  useEffect(() => {
    // 50% slider value = default brightness(1)
    // 0% slider value = brightness(0.5)
    // 100% slider value = brightness(1.5)
    const filterValue = (brightness / 50); // This makes 50 -> 1.0, 100 -> 2.0, 0 -> 0
    // However, the user said 0-100%. Usually, 100% is max brightness.
    // Let's use a more natural range: 50 is 1.0. 0 is 0.5. 100 is 1.5.
    const mappedValue = 0.5 + (brightness / 100); 
    document.documentElement.style.filter = `brightness(${mappedValue})`;
    
    // Cleanup if component unmounts
    return () => {
      document.documentElement.style.filter = 'none';
    };
  }, [brightness]);

  const increment = () => setBrightness(prev => Math.min(prev + 10, 100));
  const decrement = () => setBrightness(prev => Math.max(prev - 10, 0));

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="glass-card p-4 w-64 shadow-2xl flex flex-col gap-4 mb-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Sun size={16} className="text-yellow-400" /> Brightness
              </span>
              <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                {brightness}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={decrement}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <Minus size={14} />
              </button>
              
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="10" 
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <button 
                onClick={increment}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
              <span>Darker</span>
              <span>Normal (50%)</span>
              <span>Brighter</span>
            </div>
            
            {/* Instruction note */}
            <p className="text-[10px] text-slate-500 italic mt-1 text-center">
              Adjusting global visual intensity
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
          isOpen 
            ? 'bg-indigo-600 text-white rotate-90' 
            : 'glass-card bg-indigo-500/20 text-indigo-400 hover:text-white'
        }`}
      >
        {isOpen ? <Minus size={24} /> : <Sun size={24} className={brightness > 70 ? 'animate-pulse' : ''} />}
      </motion.button>
    </div>
  );
};

export default BrightnessController;
