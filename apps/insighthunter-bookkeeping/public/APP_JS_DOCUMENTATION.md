# app.js - Complete Feature Documentation

## Overview
The app.js file is the client-side JavaScript application that powers the Insighthunter Lite PWA. It handles all frontend logic, IndexedDB storage, financial calculations, UI rendering, and offline functionality.

## File Location
`public/app.js` (745 lines)

---

## Table of Contents

1. [PWA Features](#pwa-features)
2. [IndexedDB Storage](#indexeddb-storage)
3. [Financial Calculations](#financial-calculations)
4. [User Interface](#user-interface)
5. [Bank Connection](#bank-connection)
6. [Data Management](#data-management)
7. [Export Functionality](#export-functionality)
8. [Utility Functions](#utility-functions)

---

## PWA Features

### Service Worker Registration (Lines 1-13)
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  });
}
```
**Purpose:** Registers the service worker for offline functionality

### Install Prompt Management (Lines 15-40)
```javascript
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPrompt.classList.add('show');
});
```
**Features:**
- Captures install prompt event
- Shows custom install button
- Handles user install choice
- Hides prompt after installation

### Online/Offline Status (Lines 42-57)
```javascript
function updateOnlineStatus() {
  if (navigator.onLine) {
    statusIndicator.textContent = '● Local-First';
  } else {
    statusIndicator.textContent = '● Offline Mode';
  }
}
```
**Purpose:** Updates status indicator based on network connectivity

---

## IndexedDB Storage

### Database Configuration (Lines 59-65)
```javascript
const DB_NAME = 'insighthunter-db';
const DB_VERSION = 1;
const TRANSACTIONS_STORE = 'transactions';
const SETTINGS_STORE = 'settings';
```

### Database Operations

#### openDB() - Lines 67-92
Opens or creates the IndexedDB database with proper schema
```javascript
function openDB(): Promise<IDBDatabase>
```
**Creates:**
- Transactions store with indexes (date, type, category)
- Settings store for app configuration

#### saveTransaction() - Lines 94-104
Saves a single transaction to IndexedDB
```javascript
async function saveTransaction(transaction): Promise<number>
```

#### getAllTransactions() - Lines 106-116
Retrieves all transactions from storage
```javascript
async function getAllTransactions(): Promise<Array>
```

#### clearAllTransactions() - Lines 118-128
Deletes all transactions (with confirmation)
```javascript
async function clearAllTransactions(): Promise<void>
```

#### saveSetting() - Lines 130-140
Stores app settings and preferences
```javascript
async function saveSetting(key, value): Promise<void>
```

#### getSetting() - Lines 142-152
Retrieves saved settings
```javascript
async function getSetting(key): Promise<any>
```

---

## Financial Calculations

### calculateMetrics() - Lines 154-218
**The core financial calculation engine**

```javascript
function calculateMetrics(transactions): FinancialMetrics
```

**Calculates:**
1. **Profit & Loss**
   - Total revenue (all income)
   - Total expenses (all spending)
   - Net income (revenue - expenses)

2. **Cash Flow**
   - Starting balance (default: $0)
   - Current balance (starting + all transactions)
   - Net change (difference from start)
   - Monthly breakdown

3. **Burn Rate**
   - Monthly burn (average monthly expenses)
   - Daily burn (monthly / 30)

4. **Runway**
   - Months remaining (balance / monthly burn)
   - Days remaining (months × 30)
   - Returns null if infinite runway

**Monthly Data Structure:**
```javascript
monthlyData[month] = {
  revenue: 0,
  expenses: 0,
  netCashFlow: 0,
  transactions: []
}
```

### Formatting Functions

#### formatCurrency() - Lines 220-225
```javascript
function formatCurrency(amount): string
// Returns: "$1,234.56"
```

#### formatNumber() - Lines 227-229
```javascript
function formatNumber(num, decimals = 1): string
// Returns: "12.5"
```

---

## User Interface

### Tab Navigation (Lines 231-245)
Handles switching between dashboard tabs:
- Overview
- P&L
- Cash Flow
- Burn & Runway
- Transactions

### Transaction Form (Lines 247-270)
**Handles manual transaction entry**

Fields:
- Name/Description (required)
- Amount (required, number)
- Type (income/expense)
- Date (required, defaults to today)
- Category (dropdown selection)

**Validation:**
- All required fields checked
- Amount must be positive number
- Date must be valid

### Dashboard Refresh (Lines 272-380)
```javascript
async function refreshDashboard()
```

**Updates all dashboard sections:**
1. Overview metrics (balance, revenue, expenses, burn)
2. P&L statement
3. Cash flow analysis
4. Burn rate & runway
5. Transaction list

**Color coding:**
- Green: Positive values, healthy metrics
- Red: Negative values, critical alerts
- Yellow: Warning states
- Blue: Neutral information

### Runway Alert System (Lines 340-365)
**Automatic alerts based on runway:**

| Runway | Status | Color | Alert |
|--------|--------|-------|-------|
| < 3 months | Critical | Red | Immediate action required |
| 3-6 months | Warning | Yellow | Plan fundraising/cost cuts |
| 6-18 months | Good | Blue | Monitor closely |
| > 18 months | Excellent | Green | Strong position |
| Infinite | Excellent | Green | Revenue > Expenses |

---

## Bank Connection

### Connection Simulation (Lines 272-340)

#### connectBankBtn Event (Lines 293-325)
Simulates connecting to a bank:
1. Shows "connecting" notification
2. Waits 2 seconds (simulated API call)
3. Generates sample transactions
4. Saves to IndexedDB
5. Updates UI
6. Shows success notification

#### generateSampleTransactions() - Lines 342-385
**Creates realistic demo data:**
- 90 days of transactions
- Income: Random client payments ($1,000-$6,000)
- Expenses: AWS, Google Workspace, rent, marketing, contractors, utilities
- Realistic frequency (income less frequent than expenses)

#### disconnectBankBtn Event (Lines 327-340)
Disconnects bank (preserves transaction data)

---

## Chart Rendering

### renderPnLChart() - Lines 454-496
**Renders Profit & Loss breakdown by month**

Features:
- Monthly revenue vs expenses table
- Net income calculation per month
- Color-coded positive/negative values
- Alternating row colors for readability

### renderCashFlowChart() - Lines 498-530
**Renders cash flow analysis**

Features:
- Net cash flow by month
- Transaction count per month
- Color-coded cash flow (green/red)

### renderTransactions() - Lines 532-571
**Renders transaction list**

Features:
- Sorted by date (newest first)
- Income/expense visual distinction
- Category and date display
- Color-coded amounts

---

## Export Functionality

### PDF Export (Lines 580-665)
```javascript
exportPdfBtn.addEventListener('click', async () => {...})
```

**Creates investor-ready HTML report:**

**Sections:**
1. Executive Summary
   - Current balance
   - Monthly burn rate
   - Runway calculation

2. Profit & Loss Table
   - Total revenue
   - Total expenses
   - Net income

3. Recent Transactions (last 20)
   - Date, description, category, amount
   - Color-coded by type

**Export Process:**
1. Generate HTML with embedded CSS
2. Create Blob object
3. Generate download link
4. Auto-download as HTML file
5. User can open in browser and print to PDF

**File naming:**
`insighthunter-report-YYYY-MM-DD.html`

---

## Data Management

### Clear Data (Lines 667-683)
```javascript
clearDataBtn.addEventListener('click', async () => {...})
```

**Safety features:**
- Confirmation dialog
- Cannot be undone warning
- Clears all transactions from IndexedDB
- Refreshes dashboard
- Shows notification

---

## Utility Functions

### escapeHtml() - Lines 686-690
**Prevents XSS attacks**
```javascript
function escapeHtml(text): string
```
Safely escapes HTML in user input before rendering

### showNotification() - Lines 692-722
**Toast notification system**

```javascript
function showNotification(message, type = 'success')
```

**Types:**
- `success` - Green (operations completed)
- `error` - Red (failures)
- `info` - Blue (informational)
- `warning` - Yellow (cautions)

**Features:**
- Animated slide in/out
- Auto-dismiss after 4 seconds
- Positioned top-right
- Max width 400px

---

## Initialization

### init() - Lines 725-742
**Application startup function**

**Runs on page load:**
1. Checks if bank is connected
2. Loads bank name and last sync time
3. Updates UI accordingly
4. Calls refreshDashboard()

**Called at:** Line 744

---

## Data Flow Diagram

```
User Input
    ↓
Transaction Form
    ↓
saveTransaction()
    ↓
IndexedDB
    ↓
getAllTransactions()
    ↓
calculateMetrics()
    ↓
refreshDashboard()
    ↓
UI Update (Charts, Tables, Metrics)
```

---

## Storage Schema

### IndexedDB Structure

**Database:** `insighthunter-db`

**Stores:**
1. **transactions**
   - KeyPath: `id` (auto-increment)
   - Indexes: `date`, `type`, `category`
   - Contains: Transaction objects

2. **settings**
   - KeyPath: `key`
   - Contains: Key-value pairs

**Transaction Object:**
```javascript
{
  id: number,              // Auto-generated
  name: string,            // Description
  amount: number,          // Dollar amount
  type: 'income'|'expense',// Transaction type
  date: string,            // YYYY-MM-DD
  category: string,        // Category name
  timestamp: string        // ISO 8601
}
```

**Settings Keys:**
- `bankConnected`: boolean
- `bankName`: string
- `lastSync`: ISO 8601 timestamp

---

## Performance Considerations

### Optimizations
1. **IndexedDB Indexes** - Fast queries by date, type, category
2. **Batch Rendering** - Updates all UI elements together
3. **Async Operations** - Non-blocking database calls
4. **Efficient Sorting** - Client-side transaction sorting
5. **Cached Calculations** - Metrics calculated once per refresh

### Browser Compatibility
- **IndexedDB:** All modern browsers
- **Service Workers:** Chrome, Firefox, Safari, Edge
- **PWA Features:** Full support in Chrome/Edge, partial in Safari

---

## Event Listeners

| Event | Element | Function |
|-------|---------|----------|
| load | window | Service worker registration |
| beforeinstallprompt | window | PWA install prompt |
| appinstalled | window | PWA installed |
| online | window | Update status indicator |
| offline | window | Update status indicator |
| click | tab | Switch dashboard tabs |
| submit | transactionForm | Add transaction |
| click | connectBankBtn | Simulate bank connection |
| click | disconnectBankBtn | Disconnect bank |
| click | exportPdfBtn | Export report |
| click | clearDataBtn | Clear all data |

---

## Error Handling

### Try-Catch Blocks
All async operations wrapped in try-catch:
- Database operations
- File exports
- Bank connection simulation

### User Feedback
All errors show notifications:
```javascript
showNotification('Error message', 'error')
```

---

## Future Enhancements

Areas ready for expansion:
1. Cloud sync integration
2. Real Plaid API connection
3. Budget tracking
4. Recurring transactions
5. Multi-currency support
6. Advanced filtering
7. Custom categories
8. Export to CSV/Excel
9. Charts with Chart.js
10. Forecast projections

---

## Dependencies

**None!** 

The app.js file uses only:
- Native JavaScript (ES6+)
- Web APIs (IndexedDB, Service Workers)
- DOM manipulation
- No external libraries

This keeps the bundle size small and performance fast.

---

## Total Lines of Code: 745

**Breakdown:**
- PWA Features: ~60 lines
- IndexedDB: ~95 lines
- Calculations: ~100 lines
- UI Rendering: ~320 lines
- Bank Features: ~120 lines
- Export: ~90 lines
- Utilities: ~60 lines
