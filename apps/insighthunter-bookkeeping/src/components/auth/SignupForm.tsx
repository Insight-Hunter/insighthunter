// src/components/auth/SignupForm.tsx
import { useState } from 'react';
import { FiMail, FiLock, FiUser, FiBriefcase } from 'react-icons/fi';
import '../../styles/bookkeeping.css';

export default function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Create user account (implement your auth logic)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }

      // Redirect to onboarding
      window.location.href = '/onboarding';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>
          <FiUser /> Full Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          required
        />
      </div>

      <div className="form-group">
        <label>
          <FiMail /> Email Address
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@company.com"
          required
        />
      </div>

      <div className="form-group">
        <label>
          <FiBriefcase /> Company Name
        </label>
        <input
          type="text"
          value={formData.companyName}
          onChange={(e) =>
            setFormData({ ...formData, companyName: e.target.value })
          }
          placeholder="Your Company Inc."
          required
        />
      </div>

      <div className="form-group">
        <label>
          <FiLock /> Password
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Min. 8 characters"
          required
        />
      </div>

      <div className="form-group">
        <label>
          <FiLock /> Confirm Password
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
          placeholder="Confirm your password"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      <p className="terms-text">
        By creating an account, you agree to our{' '}
        <a href="/terms">Terms of Service</a> and{' '}
        <a href="/privacy">Privacy Policy</a>
      </p>
    </form>
  );
}
