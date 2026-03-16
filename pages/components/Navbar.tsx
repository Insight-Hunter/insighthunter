'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-md dark-neon-glow">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold dark-neon-text shrink-0">
              InsightHunter
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/#features" className="text-foreground hover:text-primary-neon px-3 py-2 rounded-md text-sm font-medium">Features</Link>
                <Link href="/pricing" className="text-foreground hover:text-primary-neon px-3 py-2 rounded-md text-sm font-medium">Pricing</Link>
                <Link href="/dashboard" className="text-foreground hover:text-primary-neon px-3 py-2 rounded-md text-sm font-medium">Dashboard</Link>
              </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login" className="dark-neon-button">
              Sign In
            </Link>
            <Link href="/auth/signup" className="dark-neon-button">
              Sign Up
            </Link>
          </div>

          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-primary-neon hover:text-accent-neon focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-background/95">
            <Link href="/#features" className="text-foreground hover:text-primary-neon block px-3 py-2 rounded-md text-base font-medium">Features</Link>
            <Link href="/pricing" className="text-foreground hover:text-primary-neon block px-3 py-2 rounded-md text-base font-medium">Pricing</Link>
            <Link href="/dashboard" className="text-foreground hover:text-primary-neon block px-3 py-2 rounded-md text-base font-medium">Dashboard</Link>
            <div className="pt-4 pb-2 border-t border-secondary-neon">
              <Link href="/auth/login" className="dark-neon-button block text-center mt-2">Sign In</Link>
              <Link href="/auth/signup" className="dark-neon-button block text-center mt-2">Sign Up</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
