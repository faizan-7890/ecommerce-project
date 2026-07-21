'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function CategorySkeleton() {
  return (
    <div className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-900 bg-slate-900/40">
      <motion.div 
        className="h-5 w-24 rounded bg-slate-800/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div 
        className="mt-3 h-3 w-16 rounded bg-slate-800/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      />
    </div>
  );
}
