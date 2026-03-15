
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), 
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }

    } catch (error) {
      console.error(error);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={FADE_IN}
      className="relative min-h-screen overflow-hidden bg-background text-white"
    >
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <header className="w-full max-w-5xl mx-auto">
          <nav className="flex items-center justify-between py-6">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
              InsightHunter
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/pricing" className="text-sm font-medium text-muted-text hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/auth/login" className="text-sm font-medium text-muted-text hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/auth/signup">
                <button className="px-5 py-2.5 text-sm font-medium text-white bg-accent rounded-lg hover:bg-opacity-90 transition-all">
                  Get Started
                </button>
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex flex-col items-center justify-center flex-grow">
          <motion.h1 
            className="text-6xl md:text-7xl font-extrabold leading-tight tracking-tighter bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent pb-4"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            Your Financial Copilot, Supercharged.
          </motion.h1>
          <motion.p 
            className="max-w-2xl mt-6 text-lg md:text-xl text-muted-text"
            variants={FADE_IN}
          >
            InsightHunter uses AI to automate bookkeeping, forecast financials, and uncover insights that drive your business forward.
          </motion.p>
          <motion.div 
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            variants={FADE_IN}
          >
            <Link href="/auth/signup">
                <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-accent rounded-lg shadow-lg hover:bg-opacity-90 transform hover:scale-105 transition-all duration-300 ease-in-out">
                    Get Started for Free
                </button>
            </Link>
            <Link href="/pricing">
                <button className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-transparent border border-border-subtle rounded-lg hover:bg-elevated-background transition-colors">
                    View Pricing
                </button>
            </Link>
            <button 
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 ease-in-out"
              onClick={handleCheckout}
            >
              Buy Now
            </button>
          </motion.div>
        </main>
      </div>
      <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#667eea_20%,_transparent_70%)]"></div>
      </div>
    </motion.div>
  );
}
