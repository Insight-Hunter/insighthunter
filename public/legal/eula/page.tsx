'use client';

import { motion } from 'framer-motion';

export default function EULAPage() {
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
        <h1 className="text-5xl font-bold text-white">End-User License Agreement</h1>
      </motion.div>

      <div className="max-w-4xl mx-auto bg-elevated-background rounded-2xl shadow-lg p-8">
        <div className="text-muted-text space-y-4">
          <p>Last updated: October 26, 2023</p>
          <p>Please read this End-User License Agreement carefully before clicking the &quot;I Agree&quot; button, downloading or using InsightHunter.</p>
          <h2 className="text-2xl font-bold text-white mt-8">Interpretation and Definitions</h2>
          <p>This End-User License Agreement (the &quot;Agreement&quot;) is a legal agreement between you (&quot;You&quot; or &quot;Your&quot;) and InsightHunter (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) for the use of our software application (the &quot;Software&quot;).</p>
          <p>By downloading, installing, or using the Software, you agree to be bound by the terms of this Agreement. If you do not agree to the terms of this Agreement, do not download, install, or use the Software.</p>
          <h2 className="text-2xl font-bold text-white mt-8">License Grant</h2>
          <p>The Company grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the Software solely for your personal, non-commercial purposes strictly in accordance with the terms of this Agreement.</p>
          <h2 className="text-2xl font-bold text-white mt-8">Restrictions</h2>
          <p>You agree not to, and you will not permit others to:</p>
          <ul className="list-disc list-inside">
            <li>License, sell, rent, lease, assign, distribute, transmit, host, outsource, disclose, or otherwise commercially exploit the Software or make the Software available to any third party.</li>
            <li>Modify, make derivative works of, disassemble, decrypt, reverse compile, or reverse engineer any part of the Software.</li>
            <li>Remove, alter, or obscure any proprietary notice (including any notice of copyright or trademark) of the Company or its affiliates, partners, suppliers, or the licensors of the Software.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
