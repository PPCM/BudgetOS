# Bank Reconciliation

Manual bank reconciliation feature allowing users to mark transactions as reconciled with their bank statements.

## Overview

Bank reconciliation is the process of comparing your recorded transactions with your bank statement to ensure they match. This feature provides a dedicated mode for efficiently reconciling transactions.

## User Interface

### Enabling Reconciliation Mode

1. Navigate to the **Transactions** page
2. Click the **Rapprochement** (Reconciliation) button in the top-right corner
3. The button turns green and displays "Quitter rapprochement" (Exit reconciliation)

### Reconciling Transactions

While in reconciliation mode:

- **Edit and Delete buttons are hidden** to prevent accidental modifications
- **Hover over a transaction** to reveal a checkmark icon on the right
- **Click the checkmark** to toggle the reconciliation status
- **Reconciled transactions** are highlighted with a green background

### Visual Indicators

| State | Visual |
|-------|--------|
| Not reconciled | Normal white background |
| Reconciled | Green background (`bg-green-50`) |
| Hover (not reconciled) | Gray checkmark icon appears |
| Hover (reconciled) | Green checkmark icon, changes to red on hover |

### Exiting Reconciliation Mode

Click the **Quitter rapprochement** button to return to normal transaction view with edit/delete capabilities.

## API

### Toggle Reconciliation Status

```
PATCH /api/v1/transactions/:id/reconcile
```

Toggles the reconciliation status of a single transaction.

**Response:**

```json
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "isReconciled": true,
      "reconciledAt": "2026-01-21T22:00:00.000Z",
      "status": "reconciled"
    }
  }
}
```

**Status values:**
- When reconciled: `status = "reconciled"`, `isReconciled = true`, `reconciledAt = timestamp`
- When unreconciled: `status = "cleared"`, `isReconciled = false`, `reconciledAt = null`

## Implementation Details

### Backend

- **Model**: `src/models/Transaction.js` - `toggleReconcile()` method
- **Controller**: `src/controllers/transactionController.js` - `toggleReconcile` handler
- **Route**: `src/routes/transactions.js` - `PATCH /:id/reconcile`

### Frontend

- **Page**: `client/src/pages/Transactions.jsx`
- **State**: `reconcileMode` boolean to toggle UI mode
- **Mutation**: `toggleReconcileMutation` using React Query
- **API**: `client/src/lib/api.js` - `transactionsApi.toggleReconcile()`

## Filtering and Sorting

### Reconciliation Status Filter

A dropdown filter allows you to display:
- **All statuses**: Show all transactions
- **Reconciled**: Show only reconciled transactions
- **Not reconciled**: Show only non-reconciled transactions

### Quick Date Periods

A dropdown menu provides quick date filters:
- **Current week**: From the first day of the week to today
- **Last 7 days**: Previous 7 days including today
- **Current month**: From the 1st of the month to today
- **Last 30 days**: Previous 30 days including today
- **Current year**: From January 1st to today
- **Last 365 days**: Previous 365 days including today

The first day of the week can be configured in **Settings > Preferences** (Monday, Sunday, or Saturday).

### Column Sorting

Click on any column header to sort transactions:
- **First click**: Sort descending
- **Second click**: Sort ascending
- **Third click**: Reset to default (date descending)

Sortable columns: Date, Description, Payee, Category, Account, Amount.

## Workflow Recommendations

1. **Download your bank statement** in CSV or PDF format
2. **Enable reconciliation mode** in BudgetOS
3. **Use quick date filter** to match your statement period (e.g., "Current month")
4. **Filter by account** if you have multiple accounts
5. **Sort by date** to match your statement order
6. **Compare each transaction** with your statement and click the checkmark when matched
7. **Filter by "Not reconciled"** to review any remaining unmatched items
