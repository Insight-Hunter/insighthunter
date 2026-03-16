'use client';

import { motion } from 'framer-motion';

export default function SecurityPage() {
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
        <h1 className="text-5xl font-bold text-white">Security</h1>
      </motion.div>

      <div className="max-w-4xl mx-auto bg-elevated-background rounded-2xl shadow-lg p-8">
        <div className="text-muted-text space-y-4">
          <p>Last updated: October 26, 2023</p>
          <p>We take the security of your data seriously. This page outlines the measures we take to protect your information.</p>
          <h2 className="text-2xl font-bold text-white mt-8">Data Encryption</h2>
          <p>All data transmitted to and from our servers is encrypted using SSL/TLS. We also encrypt all of your sensitive information at rest.</p>
          <h2 className="text-2xl font-bold text-white mt-8">Infrastructure Security</h2>
          <p>Our services are hosted on a secure cloud platform that provides a number of physical and network security measures. Access to our servers is restricted to authorized personnel only.</p>
          <h2 className="text-2xl font-bold text-white mt-8">Reporting Security Vulnerabilities</h2>
          <p>If you believe you have found a security vulnerability in our service, please contact us immediately at [security email address]. We will investigate all reports and do our best to fix any issues in a timely manner.</p>
        </div>
      </div>
    </div>
  );
}
