'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LegalPage() {
  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const links = [
    { href: '/legal/terms', name: 'Terms of Service' },
    { href: '/legal/eula', name: 'End-User License Agreement' },
    { href: '/legal/privacy', name: 'Privacy Policy' },
    { href: '/legal/cookies', name: 'Cookie Policy' },
    { href: '/legal/security', name: 'Security' },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={FADE_IN}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-white">Legal</h1>
      </motion.div>

      <div className="max-w-4xl mx-auto bg-elevated-background rounded-2xl shadow-lg p-8">
        <ul className="space-y-4">
          {links.map((link, index) => (
            <motion.li key={index} variants={FADE_IN}>
              <Link href={link.href} legacyBehavior>
                <a className="block p-4 bg-background-light rounded-lg hover:bg-background-lighter transition-colors">
                  <h2 className="text-2xl font-bold text-white">{link.name}</h2>
                </a>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
