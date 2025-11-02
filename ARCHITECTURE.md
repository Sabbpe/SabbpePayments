# Sabbpe Payment Platform - Technical Architecture

## 📋 Project Overview

**Name:** Sabbpe Payment Platform  
**Type:** B2B Payment Integration Facilitator  
**Architecture:** License-Free Model (Architecture A)  
**Integration Type:** Non-Seamless (Hosted Payment Page)  
**Status:** ✅ Production-Ready MVP

---

## 🎯 Business Model

### What Sabbpe Does

Sabbpe is a **technical integration facilitator** that helps merchants accept payments through NTT Data Payment Services without requiring a Payment Aggregator license.

### Key Differentiators

1. **License-Free Operation**
   - Each merchant uses their own NTT merchant account
   - Direct settlement to merchant's bank account
   - Sabbpe doesn't hold any customer funds
   - No RBI PA license required

2. **Technical Service Provider**
   - API abstraction layer over NTT
   - Encryption/decryption handling
   - Webhook management
   - Transaction tracking

3. **Non-Seamless Integration**
   - Customers pay on NTT's hosted page
   - Sabbpe doesn't collect sensitive payment data
   - PCI-DSS compliance simplified

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MERCHANT LAYER                        │
│  - E-commerce websites                                   │
│  - Mobile apps                                           │
│  - POS systems                                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ REST API
                 │ (X-API-Key authentication)
                 ↓
┌─────────────────────────────────────────────────────────┐
│              SABBPE PAYMENT PLATFORM                     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API Gateway                                      │  │
│  │  - Authentication                                 │  │
│  │  - Rate limiting                                  │  │
│  │  - Request validation                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                             │  │
│  │  - Merchant management                            │  │
│  │  - Transaction orchestration                      │  │
│  │  - Webhook dispatcher                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  NTT Integration Layer                            │  │
│  │  - AtomCrypto (AES-256-CBC + PBKDF2)            │  │
│  │  - Signature verification (HMAC-SHA512)          │  │
│  │  - Multi-tenant credential management            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Data Layer                                       │  │
│  │  - Merchants (credentials, settings)             │  │
│  │  - Transactions (status, metadata)               │  │
│  │  - Webhook logs (audit trail)                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ NTT REST API
                 │ (Merchant's NTT credentials)
                 ↓
┌─────────────────────────────────────────────────────────┐
│            NTT DATA PAYMENT SERVICES                     │
│  - Token generation (atomTokenId)                       │
│  - Hosted payment page                                  │
│  - Payment processing                                   │
│  - Direct settlement to merchant's bank                 │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Money Flow

```
Customer
   │
   │ Enters payment details on NTT page
   ↓
NTT Gateway (Merchant's NTT Account)
   │
   │ T+1/T+2 settlement
   ↓
Merchant's Bank Account (DIRECT)

❌ Money NEVER touches Sabbpe's accounts
✅ Settlement handled directly by NTT to merchant
```

---

## 🔄 Payment Flow Sequence

### 1. Merchant Registration Phase

```
Merchant → Sabbpe: POST /v1/merchants/register
{
  business_name: "Store Name",
  ntt_merchant_id: "MERCH_123",  ← Merchant's own NTT ID
  ntt_password: "xxx",
  webhook_url: "https://store.com/webhook"
}

Sabbpe → Merchant: 
{
  merchant_id: "SABBPE_MERCH_456",
  api_key: "sk_live_abc123...",  ← Used for all future API calls
}
```

### 2. Payment Initiation Phase

```
Step 1: Merchant's customer checks out
Customer → Merchant: "Buy product for ₹100"

Step 2: Merchant initiates payment via Sabbpe
Merchant → Sabbpe: POST /v1/payments/initiate
Headers: X-API-Key: sk_live_abc123...
{
  order_id: "ORDER_789",
  amount: 100,
  customer_email: "customer@example.com",
  customer_phone: "9876543210"
}

Step 3: Sabbpe calls NTT API using merchant's credentials
Sabbpe → NTT: POST /ots/aipay/auth
{
  merchId: "MERCH_123",  ← Merchant's NTT ID
  password: "xxx",        ← Merchant's NTT password
  amount: 100,
  // ... encrypted payload
}

Step 4: NTT generates payment token
NTT → Sabbpe: 
{
  atomTokenId: "15000000033303"
}

Step 5: Sabbpe returns payment URL
Sabbpe → Merchant:
{
  transaction_id: "SABBPE_TXN_...",
  payment_url: "https://sabbpe.com/pay/...",
  atom_token_id: "15000000033303"
}

Step 6: Merchant redirects customer
Merchant → Customer: Redirect to payment_url
```

### 3. Payment Processing Phase

```
Step 1: Customer opens payment page
Customer → Browser: Opens payment_url
Browser loads Sabbpe's hosted page with NTT SDK

Step 2: Sabbpe page triggers NTT payment popup
JavaScript: new AtomPaynetz({
  atomTokenId: "15000000033303",
  merchId: "MERCH_123",  ← Merchant's NTT ID
  custEmail: "customer@example.com"
}, 'uat');

Step 3: NTT payment page opens
Customer sees NTT's hosted payment page
- Select payment method (UPI/Card/NetBanking)
- Complete payment

Step 4: Payment processed by bank
Customer → Bank → NTT → Settlement

Step 5: NTT sends callback to Sabbpe
NTT → Sabbpe: POST /ntt/callback
{
  encData: "encrypted_response",
  merchId: "MERCH_123"
}

Step 6: Sabbpe decrypts and verifies
Sabbpe:
- Decrypt callback using merchant's keys
- Verify signature (HMAC-SHA512)
- Update transaction status
- Find merchant by NTT merchId

Step 7: Sabbpe notifies merchant via webhook
Sabbpe → Merchant: POST https://store.com/webhook
{
  event: "payment.success",
  transaction_id: "SABBPE_TXN_...",
  order_id: "ORDER_789",
  amount: 100,
  status: "success",
  payment_method: "UPI"
}

Step 8: Merchant updates order
Merchant:
- Verify webhook signature
- Update order status in database
- Send confirmation email
- Trigger fulfillment
```

---

## 🔐 Security Architecture

### 1. API Authentication

```
Every API request must include:
X-API-Key: sk_live_abc123...

Validation:
- Check if API key exists in database
- Verify API key is active
- Rate limit per API key
- Log all requests
```

### 2. NTT Communication Encryption

```javascript
// Request Encryption
const payload = { ... };
const encrypted = atomCrypto.encryptRequest(payload);
// Algorithm: AES-256-CBC + PBKDF2-HMAC-SHA512
// Key derivation: 65,536 iterations

// Response Decryption
const decrypted = atomCrypto.decryptResponse(encData);

// Signature Verification (Callback)
const signatureString = 
  merchId + atomTxnId + merchTxnId + amount + 
  statusCode + subChannel + bankTxnId;
  
const calculated = HMAC-SHA512(signatureString, resHashKey);
if (calculated === received_signature) {
  // Valid callback
}
```

### 3. Webhook Security

```javascript
// Merchant receives webhook with signature
Headers: X-Sabbpe-Signature: abc123...

// Merchant verifies:
const payload = req.body;
const signature = req.headers['x-sabbpe-signature'];

const calculated = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

if (calculated === signature) {
  // Valid webhook from Sabbpe
}
```

---

## 📊 Data Models

### Merchant

```javascript
{
  merchantId: string,        // MERCH_1234567890
  apiKey: string,            // sk_live_abc123... (hashed)
  businessName: string,
  email: string,
  nttCredentials: {
    merchId: string,         // Merchant's NTT merchant ID
    password: string,        // Encrypted
    reqEncKey: string,       // Encrypted
    reqSalt: string,         // Encrypted
    reqHashKey: string,      // Encrypted
    resEncKey: string,       // Encrypted
    resSalt: string,         // Encrypted
    resHashKey: string       // Encrypted
  },
  nttApiUrl: string,
  nttScriptUrl: string,
  webhookUrl: string | null,
  webhookRetryCount: number,
  status: 'active' | 'suspended',
  createdAt: datetime,
  updatedAt: datetime
}
```

### Transaction

```javascript
{
  transactionId: string,     // SABBPE_TXN_...
  merchantId: string,
  orderId: string,           // Merchant's order ID
  amount: number,
  currency: string,
  status: 'initiated' | 'success' | 'failed' | 'pending',
  
  // Customer details
  customerEmail: string,
  customerPhone: string,
  
  // NTT details
  atomTokenId: string,       // From NTT
  merchTxnId: string,        // Sent to NTT
  atomTxnId: string | null,  // From NTT callback
  nttMerchantId: string,
  
  // Payment details (after completion)
  paymentMethod: string | null,  // UPI, CC, DC, NB
  bankName: string | null,
  bankTxnId: string | null,
  totalAmount: number | null,
  
  // URLs
  returnUrl: string | null,
  webhookUrl: string | null,
  
  // Metadata
  metadata: object,
  nttResponse: object | null,
  
  // Timestamps
  createdAt: datetime,
  updatedAt: datetime,
  completedAt: datetime | null
}
```

---

## 🚀 Deployment Architecture

### Production Stack

```
┌─────────────────────────────────────┐
│  Load Balancer (Nginx/ALB)         │
│  - SSL termination                  │
│  - Rate limiting                    │
│  - DDoS protection                  │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Application Servers (3+ instances) │
│  - Node.js Express                  │
│  - Auto-scaling                     │
│  - Health checks                    │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  Database (PostgreSQL/MySQL)        │
│  - Master-slave replication         │
│  - Automated backups                │
│  - Connection pooling               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Redis Cache                        │
│  - Session storage                  │
│  - API key validation cache         │
│  - Rate limiting                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Queue (RabbitMQ/SQS)              │
│  - Webhook delivery                 │
│  - Async processing                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Monitoring                         │
│  - Application logs (ELK)           │
│  - Metrics (Prometheus/Grafana)     │
│  - Error tracking (Sentry)          │
│  - Uptime monitoring                │
└─────────────────────────────────────┘
```

---

## 📈 Scalability Considerations

### Horizontal Scaling

- Stateless application servers
- Load balancing across multiple instances
- Database read replicas
- Caching layer (Redis)

### Performance Optimization

- Connection pooling for NTT API calls
- Async webhook delivery
- Database indexing on transaction_id, merchant_id
- CDN for static assets

### High Availability

- Multi-AZ deployment
- Automated failover
- Circuit breakers for NTT API calls
- Webhook retry mechanism

---

## 🔍 Monitoring & Observability

### Key Metrics

```
Business Metrics:
- Transactions per minute
- Success rate
- Average transaction value
- Revenue per merchant

Technical Metrics:
- API response time (p50, p95, p99)
- NTT API success rate
- Webhook delivery rate
- Error rate by endpoint

Infrastructure Metrics:
- CPU/Memory usage
- Database connection pool
- Cache hit rate
```

### Alerts

```
Critical:
- API downtime > 1 minute
- Database connection failures
- NTT API error rate > 10%

Warning:
- Response time > 2 seconds
- Webhook delivery failures > 5%
- Memory usage > 80%
```

---

## 📝 Development Roadmap

### Phase 1: MVP (Current) ✅
- [x] Merchant registration
- [x] Payment initiation
- [x] NTT integration
- [x] Webhook system
- [x] Transaction status API

### Phase 2: Enhanced Features
- [ ] Refund API
- [ ] Bulk payment processing
- [ ] Payment links (no integration needed)
- [ ] QR code payments
- [ ] Recurring payments

### Phase 3: Dashboard & Analytics
- [ ] Merchant dashboard
- [ ] Transaction analytics
- [ ] Revenue reports
- [ ] Payment trends
- [ ] Export functionality

### Phase 4: Multi-Gateway
- [ ] PayU integration
- [ ] Razorpay integration
- [ ] Smart routing
- [ ] Gateway failover

### Phase 5: Enterprise Features
- [ ] Multi-user accounts
- [ ] Role-based access control
- [ ] Fraud detection
- [ ] Chargeback management
- [ ] Settlement reconciliation

---

## 🎓 For Developers

### Getting Started

```bash
git clone <repository>
cd sabbpe-payment-platform
npm install
node server.js
```

### Running Tests

```bash
# Start server first
node server.js

# In another terminal
node test.js
```

### Environment Variables

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
WEBHOOK_SECRET=xxx
NTT_ENV=prod
```

---

## 📄 License & Compliance

**Legal Status:** Technical Service Provider (not a Payment Aggregator)

**Why no PA license needed:**
1. Each merchant has their own NTT merchant account
2. Direct settlement to merchant's bank (via NTT)
3. Sabbpe doesn't hold/process/settle funds
4. Pure technical integration service

**However, always consult legal counsel for your specific jurisdiction.**

---

**Built with ❤️ for the merchant community**
