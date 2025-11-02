# 📋 Transaction Status & Refund Status APIs - Complete Guide

## 🎯 Overview

This guide covers two additional NDPS APIs that have been implemented:

1. **Transaction Status Requery API (TXNVERIFICATION)** - Check payment status
2. **Refund Status Query API (REFUNDSTATUS)** - Track refund status

---

## 1️⃣ Transaction Status Requery API

### **Purpose**
Verify the current status of a transaction when:
- Customer inquires about payment status
- Payment callback was not received
- Need to reconcile transaction records
- Investigating payment issues

### **API Endpoint**
```
POST /api/payment/status-requery
```

### **Request Parameters**

```javascript
{
  "merchTxnId": "SBP1698765432000",     // Required - Your transaction ID
  "merchTxnDate": "2025-02-06",          // Required - Format: YYYY-MM-DD
  "amount": 10.00,                       // Required - Transaction amount
  "atomTxnId": "11000000631738"          // Optional - NDPS transaction ID
}
```

### **Sample Request to NDPS (Encrypted)**

```json
{
  "payInstrument": {
    "headDetails": {
      "api": "TXNVERIFICATION",
      "source": "OTS"
    },
    "merchDetails": {
      "merchId": 446442,
      "password": "Test@123",
      "merchTxnId": "67a44ce2ed4c6",
      "merchTxnDate": "2025-02-06"
    },
    "payDetails": {
      "atomTxnId": "11000000631738",
      "amount": 10.00,
      "txnCurrency": "INR",
      "signature": "f6baf5a945f3f1f0..."
    }
  }
}
```

### **Signature Generation**

```javascript
// Signature String = merchId + merchTxnId + amount + txnCurrency
const signatureString = '446442' + 'SBP1698765432000' + '10' + 'INR';

// Generate HMAC-SHA512
const signature = crypto
    .createHmac('sha512', 'KEY123657234')
    .update(signatureString)
    .digest('hex');
```

**⚠️ Important:** Amount must be integer (no decimals) for signature

### **Sample Response (Decrypted)**

```json
{
  "payInstrument": [
    {
      "settlementDetails": {
        "reconStatus": "NRNS"
      },
      "merchDetails": {
        "merchId": 446442,
        "merchTxnId": "67a44ce2ed4c6",
        "merchTxnDate": "2025-02-06 11:17:50"
      },
      "payDetails": {
        "atomTxnId": 11000000631738,
        "product": "NSE",
        "amount": 10.00,
        "surchargeAmount": 0.00,
        "totalAmount": 10.00
      },
      "payModeSpecificData": {
        "subChannel": "NB",
        "bankDetails": {
          "bankTxnId": "NBnL0kjrRRpBIr2KYVR5",
          "otsBankName": "Atom Bank"
        }
      },
      "responseDetails": {
        "statusCode": "OTS0000",
        "message": "SUCCESS",
        "description": "TRANSACTION IS SUCCESSFUL"
      }
    }
  ]
}
```

### **Response Status Codes**

| Code | Status | Description | User Action |
|------|--------|-------------|-------------|
| **OTS0000** | SUCCESS | Transaction successful | ✅ Payment received |
| **OTS0002** | SUCCESS | Force success | ✅ Payment received |
| **OTS0201** | FAILED | Transaction timeout | ⏳ Wait and retry |
| **OTS0301** | INITIALIZED | Transaction initialized | ⏳ Payment in progress |
| **OTS0351** | INITIATED | Transaction initiated | ⏳ Payment in progress |
| **OTS0551** | PENDING FROM BANK | Bank pending | ⏳ Wait for bank |
| **OTS0001** | FAILED | Auto reversal | ❌ Payment failed |
| **OTS0101** | CANCELLED | User cancelled | ❌ Payment cancelled |
| **OTS0401** | NODATA | Data not found | ❌ Invalid transaction |
| **OTS0506** | FAILED | Signature mismatch | ❌ Verification failed |
| **OTS0600** | ABORTED/FAILED | Transaction failed | ❌ Payment failed |
| **OTS0951** | FAILED | Something went wrong | ❌ System error |

### **Settlement Status (reconStatus)**

| Status | Description |
|--------|-------------|
| **RS** | Reconciled Settled - Payment reconciled and settled |
| **RNS** | Reconciled Not Settled - Payment reconciled but not settled yet |
| **NRNS** | Not Reconciled Not Settled - Payment not reconciled and not settled |
| **PNRNS** | Payment Not Reconciled Not Settled - T0 settlement, not reconciled |
| **PNRS** | Payment Not Reconciled Settled - Not reconciled but settled |

### **Frontend Usage**

**Navigate to:** `http://localhost:3000/admin`

**Steps:**
1. Enter your Transaction ID
2. Select transaction date
3. Enter amount
4. Optionally enter Atom Transaction ID
5. Click "Check Transaction Status"

**Result Display:**
- ✅ Green = Success (OTS0000, OTS0002)
- ⏳ Yellow = Pending (OTS0201, OTS0301, OTS0351, OTS0551)
- ❌ Red = Failed (All other codes)

---

## 2️⃣ Refund Status Query API

### **Purpose**
Track the status of refunds initiated for customer transactions:
- Check if refund was processed
- Verify refund amount
- Get refund transaction ID
- Monitor refund timeline

### **⚠️ Merchant Use Only**
This API is for **merchants only** to track refunds they have initiated. Customers cannot initiate refunds through this interface.

### **API Endpoint**
```
POST /api/payment/refund-status
```

### **Request Parameters**

```javascript
{
  "atomTxnId": "11000000631738",    // Required - NDPS transaction ID
  "prodName": "NSE"                  // Required - Product/settlement account
}
```

### **Sample Request to NDPS (Encrypted)**

```json
{
  "payInstrument": {
    "headDetails": {
      "api": "REFUNDSTATUS",
      "source": "OTS_ARS"
    },
    "merchDetails": {
      "merchId": 446442,
      "password": "VGVzdEAxMjM="    // Base64 encoded: Test@123
    },
    "payDetails": {
      "atomTxnId": 11000000223788,
      "prodDetails": [
        {
          "prodName": "NSE"
        }
      ]
    }
  }
}
```

**⚠️ Important:** Password must be Base64 encoded for this API

### **Sample Response (Decrypted)**

```json
{
  "payInstrument": {
    "refundStatusDetails": {
      "refundDetails": [
        {
          "prodName": "NSE",
          "refundStatus": [
            {
              "refundTxnId": 1519,
              "refundAmt": 4000,
              "refundInitiatedDate": "2022-05-16",
              "remarks": "REFUND INITIATED",
              "prodRefundId": "189333256"
            }
          ]
        }
      ]
    },
    "payDetails": {
      "atomTxnId": 11000000223788
    },
    "responseDetails": {
      "statusCode": "OTS0000",
      "message": "SUCCESS",
      "description": "REFUND STATUS FETCHED SUCCESSFULLY"
    }
  }
}
```

### **Response Fields Explained**

| Field | Description |
|-------|-------------|
| `refundTxnId` | NDPS refund transaction ID |
| `refundAmt` | Amount refunded (in paise if >1000, rupees if <1000) |
| `refundInitiatedDate` | Date refund was initiated |
| `remarks` | Current status (REFUND INITIATED, REFUND PROCESSED, etc.) |
| `prodRefundId` | Your refund reference ID |

### **Refund Status Values**

| Status | Description |
|--------|-------------|
| **REFUND INITIATED** | Refund request sent to bank |
| **REFUND PROCESSED** | Refund completed successfully |
| **REFUND PENDING** | Refund in progress |
| **REFUND FAILED** | Refund failed |
| **REFUND REJECTED** | Refund rejected by bank |

### **Frontend Usage**

**Navigate to:** `http://localhost:3000/admin`

**Steps:**
1. Enter Atom Transaction ID (from successful payment)
2. Enter Product Name (usually "NSE")
3. Click "Check Refund Status"

**Result Display:**
- Shows all refunds for that transaction
- Refund amount, date, and current status
- Multiple refunds supported (partial refunds)

---

## 🔧 Implementation Details

### **Server Routes Added**

```javascript
// Transaction Status Requery
POST /api/payment/status-requery

// Refund Status Query  
POST /api/payment/refund-status

// Admin Dashboard
GET /admin
```

### **New Files**

1. **admin.html** (26KB)
   - Merchant admin dashboard
   - Transaction status requery form
   - Refund status query form
   - Real-time result display

2. **server.js** (Updated to 43KB)
   - Transaction status requery endpoint
   - Refund status query endpoint
   - Signature generation for status API
   - Base64 encoding for refund API

### **Key Features**

✅ **Transaction Status Requery:**
- Check any transaction by your transaction ID
- Optional Atom transaction ID lookup
- Shows complete transaction details
- Settlement status included

✅ **Refund Status Query:**
- Track refunds by Atom transaction ID
- Multiple refunds per transaction supported
- Shows refund timeline and status
- Merchant-only access

✅ **User Interface:**
- Beautiful responsive design
- Real-time status updates
- Color-coded results (success/pending/failed)
- Detailed transaction information
- Easy-to-use forms with validation

---

## 🧪 Testing Guide

### **Test 1: Check Successful Transaction**

**Using Admin Dashboard:**
1. Go to `http://localhost:3000/admin`
2. Enter a successful transaction ID
3. Enter transaction date
4. Enter amount
5. Click "Check Transaction Status"

**Expected Result:**
```
✅ SUCCESS
Status Code: OTS0000
Description: TRANSACTION IS SUCCESSFUL
Transaction Details: [Full details displayed]
```

---

### **Test 2: Check Pending Transaction**

**Scenario:** Payment initiated but not completed

**Expected Result:**
```
⏳ INITIATED
Status Code: OTS0351
Description: TRANSACTION IS INITIATED
[Transaction details with pending status]
```

---

### **Test 3: Check Non-existent Transaction**

**Scenario:** Invalid transaction ID

**Expected Result:**
```
❌ NODATA
Status Code: OTS0401
Description: Data not found
```

---

### **Test 4: Check Refund Status**

**Prerequisites:**
- Have a successful transaction
- Refund has been initiated for that transaction

**Steps:**
1. Go to `http://localhost:3000/admin`
2. Scroll to "Refund Status Query" section
3. Enter Atom Transaction ID
4. Enter Product Name (NSE)
5. Click "Check Refund Status"

**Expected Result:**
```
✅ SUCCESS
Refund Status Fetched Successfully

Refunds Found:
Product: NSE
  Refund TXN ID: 1519
  Amount: ₹40.00
  Initiated: 2022-05-16
  Status: REFUND INITIATED
  Refund ID: 189333256
```

---

## 📊 Use Cases

### **Use Case 1: Customer Inquiry**

**Scenario:** Customer calls saying payment was deducted but order not confirmed

**Solution:**
1. Open admin dashboard
2. Enter customer's transaction details
3. Check transaction status
4. If status is SUCCESS but order not created:
   - Create order manually
   - Send confirmation to customer
5. If status is PENDING:
   - Ask customer to wait
   - Check again in 30 minutes
6. If status is FAILED:
   - Inform customer payment will be auto-reversed
   - Provide timeline (T+3 days)

---

### **Use Case 2: Reconciliation**

**Scenario:** Daily reconciliation of payments

**Solution:**
1. Export list of transactions from your database
2. For each transaction marked as "pending":
   - Query status via admin dashboard
   - Update status in database
   - Send confirmations if successful
3. Generate reconciliation report

---

### **Use Case 3: Refund Tracking**

**Scenario:** Customer asking about refund status

**Solution:**
1. Find original transaction ID
2. Open admin dashboard
3. Query refund status
4. Inform customer:
   - If REFUND INITIATED: "Processing, 5-7 business days"
   - If REFUND PROCESSED: "Completed, check your account"
   - If REFUND FAILED: "Will reinitiate refund"

---

## 🔐 Security Considerations

### **Transaction Status API**

✅ **Signature Required**
- Prevents unauthorized status checks
- Uses your secret hash key

✅ **Date Validation**
- Must provide exact transaction date
- Prevents brute force attacks

✅ **Amount Verification**
- Must provide correct amount
- Additional security layer

### **Refund Status API**

✅ **Base64 Password**
- Password encoded for transmission
- Merchant authentication required

✅ **Atom TXN ID Required**
- Must have original transaction ID
- Cannot query arbitrary transactions

✅ **Product Name Match**
- Must specify correct settlement account
- Prevents cross-product queries

---

## 📈 Best Practices

### **When to Use Status Requery**

✅ **Good:**
- Customer inquiry about payment
- Callback not received after 5 minutes
- Daily reconciliation process
- Investigating specific transaction

❌ **Avoid:**
- Checking status immediately after payment
- Automated polling every few seconds
- Bulk status checks without throttling

**Recommendation:** Wait at least 2-3 minutes after payment before checking status

---

### **When to Use Refund Status Query**

✅ **Good:**
- Customer inquiring about refund
- Tracking refund timeline
- Verifying refund completion
- Generating refund reports

❌ **Avoid:**
- Checking refund status immediately after initiation
- Frequent automated queries
- Querying non-refunded transactions

**Recommendation:** Check refund status after 24 hours of initiation

---

## 🐛 Troubleshooting

### **Issue: Signature Mismatch (OTS0506)**

**Cause:** Incorrect signature generation

**Solution:**
```javascript
// Ensure integer amount (no decimals)
const amount = Math.floor(10.50);  // = 10

// Correct order
const signatureString = merchId + merchTxnId + amount + 'INR';

// Use correct hash key
const signature = crypto.createHmac('sha512', 'KEY123657234')...
```

---

### **Issue: Data Not Found (OTS0401)**

**Possible Causes:**
1. Wrong transaction ID
2. Wrong transaction date
3. Transaction too old (>90 days)
4. Transaction from different merchant

**Solution:**
- Verify transaction ID
- Check transaction date format (YYYY-MM-DD)
- Ensure transaction exists in NDPS system

---

### **Issue: Invalid Password (OTS0522)**

**For Refund Status API only**

**Cause:** Password not Base64 encoded

**Solution:**
```javascript
// Correct
const password = Buffer.from('Test@123').toString('base64');
// Result: "VGVzdEAxMjM="

// Wrong
const password = 'Test@123';  // Not encoded
```

---

## ✅ Summary

**New APIs Implemented:**

1. **Transaction Status Requery**
   - Endpoint: `/api/payment/status-requery`
   - Purpose: Check payment status
   - UI: Admin dashboard form
   - Response codes: 19 different statuses

2. **Refund Status Query**
   - Endpoint: `/api/payment/refund-status`
   - Purpose: Track refund status
   - UI: Admin dashboard form
   - Merchant-only feature

**Access:**
- Admin Dashboard: `http://localhost:3000/admin`
- Link from main page footer

**Documentation:**
- This guide: Complete API reference
- Sample requests and responses
- Testing scenarios
- Troubleshooting guide

---

**Ready to use!** 🚀

Navigate to `/admin` to start querying transaction and refund statuses.
