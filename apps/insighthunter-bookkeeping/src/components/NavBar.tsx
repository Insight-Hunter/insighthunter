// src/components/NavBar.tsx
import { FiHome, FiUsers, FiDollarSign, FiFileText, FiSettings } from 'react-icons/fi';
import './NavBar.css';

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h1>InsightHunter</h1>
      </div>
      <div className="nav-links">
        <a href="/dashboard" className="nav-link">
          <FiHome /> Dashboard
        </a>
        <a href="/clients" className="nav-link">
          <FiUsers /> Clients
        </a>
        <a href="/reconciliation" className="nav-link">
          <FiDollarSign /> Reconciliation
        </a>
        <a href="/reports" className="nav-link">
          <FiFileText /> Reports
        </a>
        <a href="/settings" className="nav-link">
          <FiSettings /> Settings
        </a>
      </div>
    </nav>
  );
}
