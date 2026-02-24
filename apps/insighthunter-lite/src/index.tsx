/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { parse } from 'papaparse';
import type { R2Bucket } from '@cloudflare/workers-types';
import { serveStatic } from 'hono/cloudflare-workers';
import { getCookie, setCookie } from 'hono/cookie';

// Define the environment bindings
interface Env {
  CSV_BUCKET: R2Bucket;
  // For production, you should have a JWT_SECRET to validate tokens
  // JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();
const secure = new Hono<{ Bindings: Env }>();

// --- Authentication Middleware ---
// This middleware is applied to the 'secure' Hono instance.
secure.use('*', async (c, next) => {
  const token = getCookie(c, 'auth_token');
  // In a real application, you would also validate the token here.
  // e.g. const payload = await verify(token, c.env.JWT_SECRET);
  if (!token) {
    return c.redirect('/login');
  }
  await next();
});


// --- PUBLIC ROUTES ---

// Static file serving for PWA assets and sample CSV
app.get('/public/*', serveStatic({ root: './' }));
app.get('/sw.js', serveStatic({ path: './public/sw.js' }));

// The login route redirects the user to your main site to authenticate.
// You should replace the URL with your actual production signup URL.
app.get('/login', (c) => {
  const signupUrl = 'https://insighthunter.io/signup.html'; // Placeholder URL
  return c.redirect(signupUrl, 302);
});

// After successful login, your main site should redirect back to this URL,
// passing the authentication token as a query parameter.
app.get('/auth/callback', (c) => {
  const token = c.req.query('token');
  if (token) {
    setCookie(c, 'auth_token', token, {
      path: '/',
      secure: true, // Should be true in production
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return c.redirect('/');
  }
  return c.text('Authentication failed: No token provided.', 400);
});


// --- UI Components (using Hono's built-in JSX) ---
const Layout = (props: { children: any; title: string }) => (
  <html>
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{props.title}</title>
      <link rel="manifest" href="/public/manifest.json" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f0f2f5; }
        .header { background-color: #ffffff; padding: 1rem; border-bottom: 1px solid #dcdfe3; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 1.5rem; margin: 0; font-weight: 700; }
        .nav a { margin-left: 1rem; color: #555; text-decoration: none; }
        .nav a:hover { color: #000; }
        .main { padding: 1rem; }
        .card { background-color: #ffffff; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .card h2 { font-size: 1.25rem; margin-top: 0; font-weight: 600; }
        .button { display: inline-block; background-color: #007aff; color: #ffffff; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 500; border: 0; cursor: pointer; }
        .button-secondary { background-color: #f0f2f5; color: #000; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #dcdfe3; }
        th { background-color: #f7f7f7; font-weight: 600; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .metric-card { background-color: #f7f7f7; padding: 1.5rem; border-radius: 8px; text-align: center; }
        .metric-card .label { font-size: 1rem; font-weight: 500; margin-bottom: 0.5rem; }
        .metric-card .value { font-size: 2rem; font-weight: 700; }
      `}</style>
    </head>
    <body>
      <header class="header">
        <h1>InsightHunter Lite</h1>
        <nav class="nav">
          <a href="/">Dashboard</a>
          <a href="/upload">Upload</a>
        </nav>
      </header>
      <main class="main">{props.children}</main>
      <script>
        {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
              }, err => {
                console.log('ServiceWorker registration failed: ', err);
              });
            });
          }
        `}
      </script>
    </body>
  </html>
);

const Dashboard = (
  { data, metrics }: { data: string[][] | null; metrics: any | null; }
) => (
  <Layout title="Dashboard">
    {!data && (
      <div class="card">
        <h2>Welcome!</h2>
        <p>Upload your financial data as a CSV to get a clear snapshot of your cash, burn, and runway.</p>
        <a href="/upload" class="button">Upload CSV</a>
      </div>
    )}
    {metrics && (
      <div class="card">
        <h2>Financial Snapshot</h2>
        <div class="metrics">
          <div class="metric-card">
            <div class="label">Current Cash</div>
            <div class="value">{metrics.currentCash}</div>
          </div>
          <div class="metric-card">
            <div class="label">Monthly Burn</div>
            <div class="value">{metrics.monthlyBurn}</div>
          </div>
          <div class="metric-card">
            <div class="label">Runway</div>
            <div class="value">{metrics.runway}</div>
          </div>
        </div>
      </div>
    )}
    {data && (
      <div class="card">
        <h2>Recent Transactions</h2>
        <table>
          <thead>
            <tr>{data[0].map((header) => <th>{header}</th>)}</tr>
          </thead>
          <tbody>
            {data.slice(1, 6).map((row) => (
              <tr>{row.map((cell) => <td>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Layout>
);

const UploadPage = () => (
  <Layout title="Upload CSV">
    <div class="card">
      <h2>Upload Transaction Data</h2>
      <p>
        Upload a CSV file with your bank transactions. The file should contain at least a 'Date' and 'Amount' column. 
        <a href="/public/sample-transactions.csv" download>Download a sample CSV file</a> to see the required format.
      </p>
      <form action="/upload" method="post" encType="multipart/form-data">
        <div>
          <label htmlFor="csvFile">Select a CSV file to upload.</label>
          <input type="file" id="csvFile" name="csvFile" accept=".csv" required />
        </div>
        <br />
        <button type="submit" class="button">Upload</button>
      </form>
    </div>
  </Layout>
);

// --- Data Processing Logic ---
function calculateMetrics(data: string[][]) {
  const dateIndex = 0;
  const amountIndex = 2;

  let transactions = data.slice(1)
    .map((row) => ({ date: new Date(row[dateIndex]), amount: parseFloat(row[amountIndex]) }))
    .filter((t) => !isNaN(t.date.getTime()) && !isNaN(t.amount));

  if (transactions.length === 0) return null;

  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  const currentCash = transactions.reduce((acc, t) => acc + t.amount, 0);

  const firstDate = transactions[transactions.length - 1].date;
  const lastDate = transactions[0].date;
  const months = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) || 1;

  const totalSpend = transactions.filter((t) => t.amount < 0).reduce((acc, t) => acc + t.amount, 0);
  const monthlyBurn = totalSpend / months;

  const runway = monthlyBurn < 0 ? Math.abs(currentCash / monthlyBurn) : 0;

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return {
    currentCash: formatCurrency(currentCash),
    monthlyBurn: formatCurrency(monthlyBurn),
    runway: `${runway.toFixed(1)} months`,
  };
}

// --- PROTECTED ROUTES ---

// Main Dashboard
secure.get('/', async (c) => {
  const list = await c.env.CSV_BUCKET.list({ limit: 100 });
  if (!list.objects.length) {
    return c.html(<Dashboard data={null} metrics={null} />);
  }

  const latest = list.objects.sort((a, b) => b.uploaded.getTime() - a.uploaded.getTime())[0];
  const object = await c.env.CSV_BUCKET.get(latest.key);
  if (!object) {
    return c.html(<Dashboard data={null} metrics={null} />);
  }

  const csvText = await object.text();
  const parsed = parse<string[]>(csvText, { header: false, skipEmptyLines: true });
  const metrics = calculateMetrics(parsed.data);

  return c.html(<Dashboard data={parsed.data} metrics={metrics} />);
});

// Upload Page
secure.get('/upload', (c) => c.html(<UploadPage />));

// Handle File Upload
secure.post('/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('csvFile');

  if (file instanceof File && file.name.endsWith('.csv')) {
    const key = `uploads/${Date.now()}-${file.name}`;
    await c.env.CSV_BUCKET.put(key, file.stream());
    return c.redirect('/');
  } else {
    return c.text('Invalid file. Please upload a CSV.', 400);
  }
});

// Mount the secure sub-app under the main app
app.route('/', secure);

export default app;
