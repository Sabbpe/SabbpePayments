# NDPS Payment Gateway - Complete Integration

Complete implementation of NDPS (NTT DATA Payment Services India) Payment Gateway with all APIs.

## 🎯 API Coverage - ALL 4 APIs IMPLEMENTED ✅

### ✅ 1. AUTH API (Payment Initiation)
- **Endpoint:** `POST /api/payment/initiate`
- **NDPS URL:** `https://paynetzuat.atomtech.in/ots/aipay/auth`
- **Purpose:** Get atomTokenId to initiate payment
- **Request Parameters:**
  - `amount` (number) - Payment amount
  - `email` (string) - Customer email
  - `mobile` (string) - Customer mobile (10 digits)
  - `product` (string) - Settlement account (default: "NSE")
  - `paymentMethod` (string) - Optional payment filter
- **Encryption:** AES-256-CBC with REQ_ENC_KEY
- **Response:** Decrypted with RES_ENC_KEY
- **Success Code:** OTS0000
- **Returns:** atomTokenId for payment popup

### ✅ 2. TRANSACTION STATUS API (Status Enquiry)
- **Endpoint:** `POST /api/payment/status-requery`
- **NDPS URL:** `https://paynetzuat.atomtech.in/ots/v2/payment/status`
- **Purpose:** Check transaction status anytime
- **Request Parameters:**
  - `merchTxnId` (string) - Your transaction ID
  - `merchTxnDate` (string) - Transaction date (YYYY-MM-DD)
  - `amount` (number) - Transaction amount
- **Signature Required:** HMAC-SHA512 (merchId + merchTxnId + amount + currency)
- **Response Codes:**
  - `OTS0000` - Transaction successful
  - `OTS0351` - Transaction initiated/pending
  - `OTS0401` - Transaction not found
  - Plus 16 other status codes
- **Returns:** Complete transaction details with settlement status

### ✅ 3. REFUND STATUS API
- **Endpoint:** `POST /api/payment/refund-status`
- **NDPS URL:** `https://caller.atomtech.in/ots/payment/status`
- **Purpose:** Track refund status for transactions
- **Request Parameters:**
  - `atomTxnId` (number) - Atom transaction ID from original payment
  - `prodName` (string) - Product/settlement account (usually "NSE")
- **Authentication:** Base64 encoded password
- **Response:** Array of refund details with status timeline
- **Refund Statuses:**
  - REFUND INITIATED
  - REFUND PROCESSED
  - REFUND PENDING
  - REFUND FAILED
  - REFUND REJECTED

### ✅ 4. CALLBACK HANDLER
- **Endpoint:** `POST /api/payment/callback`
- **Purpose:** Receive payment completion notification from NDPS
- **Security:** Signature verification required
- **Signature Components:** merchId + atomTxnId + merchTxnId + totalAmount + statusCode + subChannel + bankTxnId
- **Response:** Sends "OK" acknowledgment to NDPS

---

## 🔐 Your Configuration

```javascript
Merchant ID: 446442
Password: Test@123
Product: NSE
Environment: UAT

Request Encryption Key: A4476C2062FFA58980DC8F79EB6A799E
Request Salt: A4476C2062FFA58980DC8F79EB6A799E
Request Hash Key: KEY123657234

Response Decryption Key: 75AEF0FA1B94B3C10D4F5B268F757F11
Response Salt: 75AEF0FA1B94B3C10D4F5B268F757F11
Response Hash Key: KEYRESP123657234
```

---

## 📁 Project Structure

```
project/
├── server.js           # Main Express server with all 4 APIs
├── index.html          # Payment page with 6 payment methods
├── admin.html          # Admin dashboard for status queries
└── package.json        # Dependencies
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

### 3. Access Application
- **Payment Page:** http://localhost:3000
- **Admin Dashboard:** http://localhost:3000/admin

---

## 🧪 Testing Guide

### Test 1: Make a Payment
1. Go to http://localhost:3000
2. Enter amount (e.g., 100)
3. Enter email and mobile
4. Select payment method (or choose "All Methods")
5. Click "Proceed to Pay"
6. Complete payment on NDPS popup

### Test 2: Check Transaction Status
1. Go to http://localhost:3000/admin
2. Enter your transaction ID (shown in console)
3. Enter transaction date
4. Enter amount
5. Click "Check Transaction Status"
6. View complete transaction details

### Test 3: Check Refund Status
1. Go to http://localhost:3000/admin
2. Scroll to "Refund Status Query"
3. Enter Atom Transaction ID (from successful payment)
4. Enter product name (NSE)
5. Click "Check Refund Status"
6. View refund details (if any refunds exist)

---

## 📋 Request/Response Formats

### AUTH API Request (Encrypted)
```json
{
  "payInstrument": {
    "headDetails": {
      "api": "AUTH",
      "version": "OTSv1.1",
      "platform": "FLASH"
    },
    "merchDetails": {
      "merchId": "446442",
      "password": "Test@123",
      "merchTxnId": "TXN_1234567890_abc",
      "merchTxnDate": "2024-10-31 12:00:00"
    },
    "payDetails": {
      "amount": 100,
      "product": "NSE",
      "txnCurrency": "INR"
    },
    "custDetails": {
      "custEmail": "test@example.com",
      "custMobile": "9876543210"
    }
  }
}
```

### AUTH API Response (Decrypted)
```json
{
  "atomTokenId": 15000000033303,
  "responseDetails": {
    "txnStatusCode": "OTS0000",
    "txnMessage": "SUCCESS",
    "txnDescription": "ATOM TOKEN ID HAS BEEN GENERATED SUCCESSFULLY"
  }
}
```

### Status API Request (Encrypted)
```json
{
  "payInstrument": {
    "payDetails": {
      "amount": 100,
      "signature": "generated_hmac_signature",
      "txnCurrency": "INR"
    },
    "merchDetails": {
      "merchId": 446442,
      "merchTxnId": "TXN_1234567890_abc",
      "merchTxnDate": "2024-10-31"
    }
  }
}
```

### Status API Response (Decrypted)
```json
{
  "payInstrument": {
    "merchDetails": {
      "merchId": 446442,
      "merchTxnId": "TXN_1234567890_abc",
      "merchTxnDate": "2024-10-31"
    },
    "payDetails": {
      "atomTxnId": 11000000679315,
      "amount": 100,
      "totalAmount": 102.35,
      "surchargeAmount": 2.35
    },
    "responseDetails": {
      "statusCode": "OTS0000",
      "message": "SUCCESS",
      "description": "TRANSACTION IS SUCCESSFUL"
    },
    "payModeSpecificData": {
      "subChannel": ["CC"],
      "bankDetails": {
        "otsBankName": "HDFC Bank",
        "bankTxnId": "001100000067931524"
      }
    },
    "settlementDetails": {
      "reconStatus": "RS"
    }
  }
}
```

### Refund Status Request (Encrypted)
```json
{
  "payInstrument": {
    "headDetails": {
      "api": "REFUNDSTATUS",
      "source": "OTS_ARS"
    },
    "merchDetails": {
      "merchId": 446442,
      "password": "VGVzdEAxMjM="
    },
    "payDetails": {
      "atomTxnId": 11000000679315,
      "prodDetails": [
        {
          "prodName": "NSE"
        }
      ]
    }
  }
}
```

### Refund Status Response (Decrypted)
```json
{
  "payInstrument": {
    "payDetails": {
      "atomTxnId": 11000000679315
    },
    "responseDetails": {
      "statusCode": "OTS0000",
      "message": "SUCCESS",
      "description": "REFUND STATUS FETCHED SUCCESSFULLY"
    },
    "refundStatusDetails": {
      "refundDetails": [
        {
          "prodName": "NSE",
          "refundStatus": [
            {
              "refundTxnId": 1519,
              "refundAmt": 100,
              "refundInitiatedDate": "2024-10-31",
              "remarks": "REFUND INITIATED",
              "prodRefundId": "REF_123456"
            }
          ]
        }
      ]
    }
  }
}
```

---

## ⚠️ Error Handling

All APIs properly handle errors with decrypted error responses:

### Common Error Codes
- `OTS0451` - Invalid merchant information
- `OTS0506` - Signature mismatch
- `OTS0600` - Validation failed / Token generation failed
- `OTS0401` - Transaction not found

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "statusCode": "OTS0xxx"
}
```

---

## 🔐 Encryption Details

### Request Encryption
- Algorithm: AES-256-CBC
- Key Derivation: PBKDF2-HMAC-SHA512
- Iterations: 65,536
- IV: Fixed [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]
- Output: Uppercase hexadecimal

### Response Decryption
- Same algorithm as request
- Different keys (RES_ENC_KEY, RES_SALT)
- Input: Hexadecimal string
- Output: JSON object

### Signature Generation
- Algorithm: HMAC-SHA512
- Output: Lowercase hexadecimal

---

## 🎯 Payment Methods Supported

1. **ALL** - Show all payment options (default)
2. **NB** - Net Banking only
3. **CC** - Credit Card only
4. **DC** - Debit Card only
5. **UP** - UPI only
6. **MW** - Mobile Wallet only

---

## 📊 Console Logs

The server provides detailed console logs for debugging:

```
💳 Payment initiation: { txnId, amount, email, mobile }
📤 Calling NDPS AUTH API...
📥 NDPS Response: { atomTokenId, responseDetails }
✅ Payment successful: { merchTxnId, atomTxnId, amount }
🔍 Transaction status requery: { merchTxnId, date, amount }
💰 Refund status query: { atomTxnId, prodName }
📨 Payment callback received
✅ Signature verified
```

---

## ✅ Verification Checklist

- [x] AUTH API - Request encryption verified
- [x] AUTH API - Response decryption verified
- [x] AUTH API - Error handling configured
- [x] STATUS API - Signature generation verified
- [x] STATUS API - Request parameters correct
- [x] STATUS API - Response parsing configured
- [x] REFUND STATUS API - Base64 password encoding verified
- [x] REFUND STATUS API - Request format correct
- [x] REFUND STATUS API - Response parsing configured
- [x] CALLBACK - Signature verification implemented
- [x] CALLBACK - Error handling configured
- [x] All encryption keys configured correctly
- [x] All NDPS endpoints correct (UAT)

---

## 🎉 Summary

**All 4 NDPS APIs are fully implemented and verified:**

1. ✅ **Payment Initiation** - Get atomTokenId, open payment popup
2. ✅ **Transaction Status** - Check any transaction status with 19+ codes
3. ✅ **Refund Status** - Track refund timeline and status
4. ✅ **Callback Handler** - Secure payment result processing

**Request parameters match NDPS documentation exactly.**
**Response formats are configured for complete error handling.**
**All encryption/decryption verified with your credentials.**

Ready for UAT testing! 🚀
