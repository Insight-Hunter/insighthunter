'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignUpPage() {
  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.2,
            },
          },
        }}
        className="w-full max-w-md p-8 space-y-6 bg-elevated-background rounded-2xl shadow-lg"
      >
        <motion.div variants={FADE_IN} className="text-center">
          <h1 className="text-4xl font-bold text-text">Create an Account</h1>
          <p className="mt-2 text-muted-text">Get started with your 14-day free trial.</p>
        </motion.div>

        <motion.form variants={FADE_IN} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-muted-text"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-muted-text"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <motion.div variants={FADE_IN}>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent transition-all"
            >
              Sign up
            </button>
          </motion.div>
        </motion.form>
        
        <motion.p variants={FADE_IN} className="mt-6 text-center text-sm text-muted-text">
          Already have an account?{' '}
          <Link href="/signin" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
