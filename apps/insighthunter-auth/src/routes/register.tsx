
import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const CheckoutForm = ({ onPaymentSuccess }: { onPaymentSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet.');
      setLoading(false);
      return;
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An unexpected error occurred.');
      setLoading(false);
      return;
    }

    onPaymentSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
      <button type="submit" disabled={!stripe || loading} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}>
        {loading ? 'Processing…' : 'Pay and Create Account'}
      </button>
    </form>
  );
};

const RegisterPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    const fetchSetupIntent = async () => {
      try {
        const response = await fetch('/api/auth/payment/setup-intent', {
          method: 'POST',
        });
        const data = await response.json();

        if (data.clientSecret && data.stripePublicKey) {
          setClientSecret(data.clientSecret);
          const stripeInstance = await loadStripe(data.stripePublicKey);
          setStripe(stripeInstance);
        } else {
          setError('Failed to initialize payment.');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      }
    };

    fetchSetupIntent();
  }, []);

  const handlePaymentSuccess = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      window.location.href = '/auth/login';
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f7f7f7' }}>
      <div style={{ width: '400px', padding: '40px', background: 'white', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Create Your Account</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>Get started with Insight Hunter.</p>
        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}
        <form>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </form>
        {stripe && clientSecret && (
          <Elements stripe={stripe} options={{ clientSecret }}>
            <CheckoutForm onPaymentSuccess={handlePaymentSuccess} />
          </Elements>
        )}
        <p style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
          Already have an account? <a href="/auth/login" style={{ color: '#007bff', fontWeight: 'bold', textDecoration: 'none' }}>Sign in →</a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
