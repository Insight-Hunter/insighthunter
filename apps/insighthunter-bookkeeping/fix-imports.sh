#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/jamesmichaelhunterturner/Documents/insighthunter/apps/insighthunter-bookkeeping"
cd "$ROOT"

mkdir -p src/backend/lib

cat > src/backend/lib/currencyUtils.ts <<'TS'
export function toMinorUnits(amount: number | string, _currency = "USD"): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return Math.round(n * 100);
}

export function fromMinorUnits(amount: number, _currency = "USD"): number {
  return amount / 100;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(fromMinorUnits(amount, currency));
}
TS

python3 - <<'PY'
from pathlib import Path

replacements = {
    'src/backend/services/categorizationServices.ts': {
        "import type { Transaction, CategoryRule } from '../types/accounting';": "import type { Transaction, CategoryRule } from '../../types/accounting';",
        "import { logger } from '../lib/logger';": "import { logger } from '../middleware/logger';",
    },
    'src/backend/services/exportServices.ts': {
        "import type { Transaction } from '../types/accounting';": "import type { Transaction } from '../../types/accounting';",
        "import type { PLStatement, BalanceSheet, CashFlowStatement } from '../types/statements';": "import type { PLStatement, BalanceSheet, CashFlowStatement } from '../../types/statements';",
    },
    'src/backend/services/importServices.ts': {
        "import type { CreateTransactionInput } from './transactionService';": "import type { CreateTransactionInput } from './transactionServices';",
        "import { logger } from '../lib/logger';": "import { logger } from '../middleware/logger';",
    },
    'src/backend/services/plServices.ts': {
        "import type { PLStatement, PLLineItem } from '../types/statements';": "import type { PLStatement, PLLineItem } from '../../types/statements';",
        "import { AccountType, AccountSubType } from '../types/accounting';": "import { AccountType, AccountSubType } from '../../types/accounting';",
        "import { netBalance } from '../lib/doubleEntry';": "import { netBalance } from '../utils/doubleEntry';",
    },
    'src/backend/services/reconciliationService.ts': {
        "import type { ReconciliationRecord, Transaction } from '../types/accounting';": "import type { ReconciliationRecord, Transaction } from '../../types/accounting';",
        "import { ReconciliationStatus, TransactionStatus } from '../types/accounting';": "import { ReconciliationStatus, TransactionStatus } from '../../types/accounting';",
        "import { logger } from '../lib/logger';": "import { logger } from '../middleware/logger';",
    },
    'src/backend/services/transactionServices.ts': {
        "import type { Transaction } from '../types/accounting';": "import type { Transaction } from '../../types/accounting';",
        "import { TransactionStatus } from '../types/accounting';": "import { TransactionStatus } from '../../types/accounting';",
        "import { logger } from '../lib/logger';": "import { logger } from '../middleware/logger';",
    },
    'src/frontend/components/layout/accounts/AccountForm.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/accounts/ChartoFAccounts.tsx': {
        'import { useAccounts } from "../../hooks/useAccounts";': 'import { useAccounts } from "../../../hooks/useAccounts";',
    },
    'src/frontend/components/layout/ai/ClassificationQueue.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/journal/JournalEntryForm.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/journal/JournalEntryList.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/quickbooks/QBConnectButton.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/quickbooks/QBSettings.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/reconciliation/ReconciliationBoard.tsx': {
        'import { useApiBase } from "../../hooks/useApi";': 'import { useApiBase } from "../../../hooks/useApi";',
    },
    'src/frontend/components/layout/transactions/TransactionLedger.tsx': {
        'import { useTransactions } from "../../hooks/useTransactions";': 'import { useTransactions } from "../../../hooks/useTransactions";',
    },
}

for rel, mapping in replacements.items():
    path = Path(rel)
    if not path.exists():
        print(f"SKIP missing: {rel}")
        continue
    text = path.read_text()
    original = text
    for old, new in mapping.items():
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        print(f"UPDATED: {rel}")
    else:
        print(f"NO CHANGE: {rel}")
PY

echo
echo "Now install the missing dependency:"
echo "pnpm add papaparse"
