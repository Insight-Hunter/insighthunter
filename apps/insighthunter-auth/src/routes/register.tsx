
import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const RegistrationForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const processRedirect = async () => {
      if (!stripe) return;

      const clientSecret = new URLSearchParams(window.location.search).get('setup_intent_client_secret');
      if (!clientSecret) return;

      const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);
      if (setupIntent?.status === 'succeeded') {
        const registrationData = localStorage.getItem('registrationData');
        if (!registrationData) {
          setError('Registration data not found. Please try again.');
          return;
        }

        const { firstName, lastName, email, password } = JSON.parse(registrationData);
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password, setup_intent_id: setupIntent.id }),
          });

          const data = await response.json();
          if (!response.ok) {
            setError(data.error || 'Registration failed after payment confirmation.');
          } else {
            localStorage.removeItem('registrationData');
            window.location.href = '/auth/login';
          }
        } catch (err) {
          setError('Network error during final registration step.');
        }
      }
    };

    processRedirect();
  }, [stripe]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!stripe || !elements) {
      setError('Stripe has not loaded yet.');
      setLoading(false);
      return;
    }

    localStorage.setItem('registrationData', JSON.stringify({ firstName, lastName, email, password }));

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href.split('?')[0],
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'An unexpected error occurred.');
      localStorage.removeItem('registrationData');
    }

    setLoading(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f7f7f7' }}>
      <div style={{ width: '400px', padding: '40px', background: 'white', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>Create Your Account</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>Get started with Insight Hunter.</p>
        {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '20px' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
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
          <div style={{ marginBottom: '20px' }}>
            <PaymentElement />
          </div>
          <button type="submit" disabled={loading || !stripe} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {loading ? 'Processing…' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
          Already have an account? <a href="/auth/login" style={{ color: '#007bff', fontWeight: 'bold', textDecoration: 'none' }}>Sign in →</a>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    const fetchStripeSetup = async () => {
      try {
        const response = await fetch('/api/auth/payment/setup-intent', { method: 'POST' });
        const data = await response.json();
        if (data.clientSecret && data.stripePublicKey) {
          setClientSecret(data.clientSecret);
          setStripePromise(loadStripe(data.stripePublicKey));
        }
      } catch (error) {
        console.error('Failed to fetch Stripe setup', error);
      }
    };
    fetchStripeSetup();
  }, []);

  return (
    <>
      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <RegistrationForm />
        </Elements>
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
};

export default RegisterPage;
