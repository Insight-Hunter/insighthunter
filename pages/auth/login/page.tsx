'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={FADE_IN}
      className="flex flex-col items-center justify-center min-h-screen bg-background p-4"
    >
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <Link href="/" className="inline-block">
                    <h1 className="text-5xl font-extrabold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent pb-2">
                    InsightHunter
                    </h1>
                </Link>
                <p className="mt-4 text-2xl text-slate-300">
                    Welcome Back
                </p>
            </div>

            <div className="bg-elevated-background p-8 rounded-2xl shadow-lg">
                <form className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-muted-text">Email address</label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <EnvelopeIcon className="h-5 w-5 text-muted-text" />
                        </div>
                        <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="block w-full px-10 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="you@example.com"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-muted-text">Password</label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <LockClosedIcon className="h-5 w-5 text-muted-text" />
                        </div>
                        <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="block w-full px-10 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="••••••••"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-accent bg-background border-border-subtle rounded focus:ring-accent" />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-text">Remember me</label>
                    </div>
                    <div className="text-sm">
                    <Link href="#" className="font-medium text-accent hover:text-opacity-80">
                        Forgot your password?
                    </Link>
                    </div>
                </div>
                <div>
                    <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent transition-all"
                    >
                    Sign in
                    </button>
                </div>
                </form>
            </div>
            <div className="text-center mt-6">
                <p className="text-sm text-muted-text">
                    Don&apos;t have an account?
                    <Link href="/auth/signup" className="font-medium text-accent hover:text-opacity-80 ml-1">
                    Sign up
                    </Link>
                </p>
            </div>
        </div>
    </motion.div>
  );
}
