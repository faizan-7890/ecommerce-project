'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-900 bg-slate-900/40 p-4">
      <motion.div 
        className="aspect-square w-full rounded-xl bg-slate-800/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="mt-4 flex flex-1 flex-col space-y-3">
        <motion.div 
          className="h-3 w-1/3 rounded bg-slate-800/50"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="h-5 w-3/4 rounded bg-slate-800/50"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
        />
        <motion.div 
          className="h-4 w-full rounded bg-slate-800/50"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        />
        <div className="mt-4 flex items-center justify-between">
          <motion.div 
            className="h-6 w-1/4 rounded bg-slate-800/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
          <motion.div 
            className="h-10 w-10 rounded-xl bg-slate-800/50"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
}
