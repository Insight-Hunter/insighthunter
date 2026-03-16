import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="dark-neon-glow border-t border-secondary-neon mt-auto">
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <p className="text-foreground">&copy; 2024 InsightHunter. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href="#" className="text-foreground hover:text-primary-neon">Twitter</Link>
            <Link href="#" className="text-foreground hover:text-primary-neon">GitHub</Link>
            <Link href="#" className="text-foreground hover:text-primary-neon">LinkedIn</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
