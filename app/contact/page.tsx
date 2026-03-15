'use client';

import { motion } from 'framer-motion';

export default function ContactPage() {
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
        <h1 className="text-5xl font-bold text-white">Get in touch</h1>
        <p className="mt-4 text-muted-text max-w-2xl mx-auto">Have a question or want to work with us? We&apos;d love to hear from you.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={FADE_IN}
          className="bg-elevated-background rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
          <div className="space-y-4 text-muted-text">
            <p>123 Main Street, Suite 456<br />Anytown, USA 12345</p>
            <p>Email: contact@insighthunter.com</p>
            <p>Phone: (123) 456-7890</p>
          </div>
        </motion.div>
        <motion.form
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
          className="bg-elevated-background rounded-2xl shadow-lg p-8 space-y-6"
        >
          <motion.div variants={FADE_IN}>
            <label htmlFor="name" className="block text-sm font-medium text-muted-text">Name</label>
            <input type="text" id="name" className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" placeholder="Your Name" />
          </motion.div>
          <motion.div variants={FADE_IN}>
            <label htmlFor="email" className="block text-sm font-medium text-muted-text">Email</label>
            <input type="email" id="email" className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" placeholder="you@example.com" />
          </motion.div>
          <motion.div variants={FADE_IN}>
            <label htmlFor="message" className="block text-sm font-medium text-muted-text">Message</label>
            <textarea id="message" rows={4} className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" placeholder="Your message"></textarea>
          </motion.div>
          <motion.div variants={FADE_IN}>
            <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-accent transition-all">Send Message</button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}
