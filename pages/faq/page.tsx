'use client';

import { motion } from 'framer-motion';

export default function FaqPage() {
  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  const faqs = [
    {
      question: 'What is InsightHunter?',
      answer: 'InsightHunter is a platform that provides financial insights and analysis for businesses.',
    },
    {
      question: 'How do I get started?',
      answer: 'You can get started by signing up for a free trial. No credit card required.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we take data security very seriously. All of your data is encrypted and stored securely.',
    },
    {
      question: 'Do you offer a free trial?',
      answer: 'Yes, we offer a 14-day free trial. You can sign up for a free trial on our website.',
    },
  ];

  return (
    <div className="p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={FADE_IN}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-white">Frequently Asked Questions</h1>
      </motion.div>

      <div className="max-w-4xl mx-auto bg-elevated-background rounded-2xl shadow-lg p-8">
        <ul className="space-y-8">
          {faqs.map((faq, index) => (
            <motion.li key={index} variants={FADE_IN}>
              <h2 className="text-2xl font-bold text-white mb-2">{faq.question}</h2>
              <p className="text-muted-text">{faq.answer}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
