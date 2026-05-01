import React from 'react';
import { NavLink } from 'react-router-dom';

const activeLinkStyle = {
  color: 'var(--accent-gold)',
  borderBottom: '2px solid var(--accent-gold)'
};

export const Shell: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="min-h-screen">
    <header className="bg-background-elevated/80 backdrop-filter backdrop-blur-lg border-b border-border-color sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <img className="h-8 w-auto" src="https://i.imgur.com/3Z3jT3H.png" alt="BizForma" />
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            <NavLink to="/" exact activeStyle={activeLinkStyle} className="text-text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Home</NavLink>
                            <NavLink to="/formation/new" activeStyle={activeLinkStyle} className="text-text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">New Formation</NavLink>
                            <NavLink to="/compliance" activeStyle={activeLinkStyle} className="text-text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Compliance</NavLink>
                            <NavLink to="/documents" activeStyle={activeLinkStyle} className="text-text-secondary hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Documents</NavLink>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    </header>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="glass-card">
        {children}
      </div>
    </main>
  </div>
);
