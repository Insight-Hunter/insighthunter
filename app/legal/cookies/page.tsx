'use client';

import { motion } from 'framer-motion';

export default function CookiePolicyPage() {
  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={FADE_IN}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-white">Cookie Policy</h1>
      </motion.div>

      <div className="max-w-4xl mx-auto bg-elevated-background rounded-2xl shadow-lg p-8">
        <div className="text-muted-text space-y-4">
          <p>Last updated: October 26, 2023</p>
          <p>This Cookie Policy explains what cookies are and how We use them. You should read this policy so You can understand what type of cookies We use, or the information We collect using Cookies and how that information is used.</p>
          <h2 className="text-2xl font-bold text-white mt-8">What are Cookies?</h2>
          <p>Cookies are small files that are placed on Your computer, mobile device or any other device by a website, containing the details of Your browsing history on that website among its many uses.</p>
          <h2 className="text-2xl font-bold text-white mt-8">How we use Cookies</h2>
          <p>We use cookies to enhance your browsing experience by:</p>
          <ul className="list-disc list-inside">
            <li>Remembering your preferences</li>
            <li>Enabling certain functions of the Service</li>
            <li>Providing analytics</li>
            <li>Storing your preferences</li>
          </ul>
          <h2 className="text-2xl font-bold text-white mt-8">Your choices regarding Cookies</h2>
          <p>If You&apos;d like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.</p>
        </div>
      </div>
    </div>
  );
}
