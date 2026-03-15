'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, BarChart2, CreditCard, Mail, FileText } from 'lucide-react';

const links = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/campaigns', icon: BarChart2, label: 'Campaigns' },
  { href: '/pricing', icon: CreditCard, label: 'Pricing' },
  { href: '/contact', icon: Mail, label: 'Contact' },
  { href: '/legal', icon: FileText, label: 'Legal' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-elevated-background p-6 flex flex-col">
      <div className="flex items-center mb-12">
        <Zap size={32} className="text-accent" />
        <span className="text-2xl font-bold ml-2 text-white">InsightHunter</span>
      </div>
      <nav className="flex flex-col space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-muted-text hover:bg-background'
              }`}
            >
              <link.icon size={20} className="mr-3" />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
