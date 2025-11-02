# 🧪 UAT Testing Guide - Sabbpe Payment Platform

## ✅ **UPDATED CODE - READY FOR UAT!**

Your server.js has been updated with **YOUR ACTUAL UAT CREDENTIALS**.

---

## 🔐 **Your UAT Credentials (Configured)**

| Parameter | Value | Status |
|-----------|-------|--------|
| **Merchant ID** | `446442` | ✅ Updated |
| **Password** | `Test@123` | ✅ Configured |
| **Product ID** | `NSE` or `BSE` | ✅ Configured |
| **API URL** | `https://caller.atomtech.in` | ✅ **FIXED** |
| **CDN Script** | `https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js` | ✅ Configured |
| **Hash Request Key** | `KEY123657234` | ✅ Configured |
| **Hash Response Key** | `KEYRESP123657234` | ✅ Configured |
| **AES Request Key** | `A4476C2062FFA58980DC8F79EB6A799E` | ✅ Configured |
| **AES Response Key** | `75AEF0FA1B94B3C10D4F5B268F757F11` | ✅ Configured |

---

## 💳 **UAT Test Cards (Provided by NTT)**

### **Credit Card Testing:**
```
Card Number: 4012888888881881
Expiry Date: 12/25
CVV: 123
Cardholder Name: Test
Card Type: Credit Card
```

### **Debit Card Testing:**
```
Card Number: 5555555555554444
Expiry Date: 12/25
CVV: 456
Cardholder Name: Test
Card Type: Debit Card
```

### **UPI Testing:**
```
UPI VPA: atomots@upi
⚠️ IMPORTANT: Call NTT team BEFORE initiating UPI transactions
```

---

## 🚀 **How to Start UAT Testing**

### **Option 1: Test Locally (Quick Testing)**

```bash
# Start server
cd sabbpe-payment-platform
node server.js

# Open browser
# → http://localhost:3000
```

**Limitation:** NTT callbacks won't reach your laptop (need static URL)

---

### **Option 2: Deploy to Cloud Run (Full UAT)** ⭐ **RECOMMENDED**

```bash
# 1. Navigate to project
cd sabbpe-payment-platform

# 2. Deploy to Cloud Run
gcloud run deploy sabbpe-uat \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi

# 3. Get your URL
# Output: Service URL: https://sabbpe-uat-abc123-uc.a.run.app
```

**Then share callback URL with NTT:**
```
Callback URL: https://sabbpe-uat-abc123-uc.a.run.app/ntt/callback
Method: POST
Content-Type: application/x-www-form-urlencoded
```

---

## 📋 **UAT Test Scenarios**

### **Test 1: Credit Card Payment (Basic Flow)**

**Steps:**
1. Open: `https://sabbpe-uat-abc123-uc.a.run.app`
2. Go to "Demo Payment" tab
3. Fill details:
   - Order ID: `TEST_CC_001`
   - Amount: `100`
   - Email: `test@example.com`
   - Phone: `9876543210`
4. Click "Initiate Payment"
5. Click "Proceed to Payment" on payment page
6. NTT payment popup opens
7. Select "Credit Card"
8. Enter test card details:
   - Card: `4012888888881881`
   - Expiry: `12/25`
   - CVV: `123`
   - Name: `Test`
9. Submit payment
10. Verify success message

**Expected Result:**
- ✅ Payment successful
- ✅ Callback received on your server
- ✅ Transaction status updated to "success"
- ✅ Webhook sent (if configured)

---

### **Test 2: Debit Card Payment**

**Steps:**
1. Same as Test 1, but use:
   - Order ID: `TEST_DC_001`
   - Card: `5555555555554444`
   - Expiry: `12/25`
   - CVV: `456`
   - Name: `Test`

**Expected Result:**
- ✅ Payment successful via Debit Card

---

### **Test 3: UPI Payment**

**⚠️ FIRST:** Call NTT team to enable UPI testing

**Steps:**
1. Initiate payment (Order ID: `TEST_UPI_001`)
2. Select "UPI" payment method
3. Enter: `atomots@upi`
4. Complete payment

**Expected Result:**
- ✅ Payment successful via UPI

---

### **Test 4: Net Banking Payment**

**Steps:**
1. Initiate payment (Order ID: `TEST_NB_001`)
2. Select "Net Banking"
3. Choose any test bank
4. Complete payment

**Expected Result:**
- ✅ Payment successful via Net Banking

---

### **Test 5: Payment Failure Scenario**

**Steps:**
1. Initiate payment (Order ID: `TEST_FAIL_001`)
2. On payment page, close popup/click cancel
3. Check transaction status

**Expected Result:**
- ⚠️ Transaction status: "failed" or "initiated"
- ✅ Webhook sent with failure event

---

### **Test 6: API Integration Test**

**Test Payment Initiation API:**
```bash
curl -X POST https://sabbpe-uat-abc123-uc.a.run.app/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_001" \
  -d '{
    "order_id": "API_TEST_001",
    "amount": 50,
    "currency": "INR",
    "customer_email": "api@test.com",
    "customer_phone": "9999999999"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "transaction_id": "SABBPE_TXN_...",
  "payment_url": "https://...",
  "atom_token_id": "..."
}
```

---

### **Test 7: Transaction Status Check**

```bash
curl -X GET https://sabbpe-uat-abc123-uc.a.run.app/v1/transactions/SABBPE_TXN_... \
  -H "X-API-Key: sk_test_demo_001"
```

**Expected Response:**
```json
{
  "transaction_id": "SABBPE_TXN_...",
  "order_id": "TEST_CC_001",
  "amount": 100,
  "status": "success",
  "payment_method": "CC"
}
```

---

### **Test 8: Webhook Delivery**

**Setup:**
1. Set up webhook receiver (use webhook-receiver-example.js)
2. Update merchant webhook URL
3. Complete a payment
4. Verify webhook received

**Expected Webhook:**
```json
{
  "event": "payment.success",
  "transaction_id": "SABBPE_TXN_...",
  "order_id": "TEST_001",
  "amount": 100,
  "status": "success",
  "payment_method": "CC"
}
```

---

### **Test 9: Multiple Payment Methods**

**Test each payment method:**
- [ ] Credit Card (Visa: 4012888888881881)
- [ ] Debit Card (Mastercard: 5555555555554444)
- [ ] UPI (atomots@upi)
- [ ] Net Banking
- [ ] Wallets (if available)

---

### **Test 10: Load Testing**

**Test concurrent payments:**
```bash
# Use test.js or create multiple API requests
for i in {1..10}; do
  curl -X POST https://sabbpe-uat-abc123-uc.a.run.app/v1/payments/initiate \
    -H "Content-Type: application/json" \
    -H "X-API-Key: sk_test_demo_001" \
    -d "{\"order_id\": \"LOAD_TEST_$i\", \"amount\": 10, \"customer_email\": \"test$i@test.com\", \"customer_phone\": \"999999999$i\"}" &
done
```

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: "Invalid Merchant Information"**

**Cause:** Wrong merchant ID or password

**Solution:**
- Verify merchant ID: `446442`
- Verify password: `Test@123`
- Check if credentials updated in code

---

### **Issue 2: "Signature Mismatch"**

**Cause:** Wrong encryption keys

**Solution:**
- Verify all 6 encryption keys match your credentials
- Check signature generation logic
- Ensure using correct hash keys

---

### **Issue 3: "Callback Not Received"**

**Cause:** Callback URL not configured with NTT

**Solution:**
- Email NTT team with your callback URL
- Verify URL is publicly accessible
- Check server logs for incoming requests

---

### **Issue 4: "Empty Response from NTT"**

**Cause:** Wrong API URL

**Solution:**
- Verify using: `https://caller.atomtech.in`
- NOT: `https://paynetzuat.atomtech.in`
- This has been FIXED in updated code ✅

---

### **Issue 5: "Payment Page Not Opening"**

**Cause:** CDN script not loading

**Solution:**
- Verify CDN URL: `https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js`
- Check browser console for errors
- Ensure atomTokenId is valid

---

## 📊 **UAT Testing Checklist**

### **Pre-UAT Setup:**
```
[✅] Code updated with merchant ID: 446442
[✅] API URL updated to: caller.atomtech.in
[✅] All encryption keys configured
[ ] Deploy to Cloud Run
[ ] Get static callback URL
[ ] Email NTT team with callback URL
[ ] Wait for NTT to configure callback
[ ] Test end-to-end payment flow
```

### **Payment Testing:**
```
[ ] Credit card payment (success)
[ ] Debit card payment (success)
[ ] UPI payment (success) - Call NTT first
[ ] Net Banking payment (success)
[ ] Payment failure scenario
[ ] Payment cancellation
[ ] Multiple concurrent payments
```

### **API Testing:**
```
[ ] Payment initiation API
[ ] Transaction status API
[ ] Webhook delivery
[ ] API error handling
[ ] Rate limiting (if implemented)
```

### **Integration Testing:**
```
[ ] Merchant registration
[ ] Multiple merchants support
[ ] Different payment amounts (₹1, ₹100, ₹1000)
[ ] Special characters in customer data
[ ] Long transaction IDs
[ ] Callback signature verification
```

### **Security Testing:**
```
[ ] Invalid API key rejection
[ ] Expired token handling
[ ] Signature mismatch detection
[ ] XSS prevention
[ ] SQL injection prevention (if using DB)
```

---

## 📧 **Email Template for NTT Team**

```
Subject: UAT Callback URL Configuration - Merchant 446442

Hi NTT Team,

We are ready to begin UAT testing for One78 Sabbpe Technology Solutions.

Merchant Details:
- Merchant ID: 446442
- Company: One78 Sabbpe Technology Solutions India Private Limited
- Environment: UAT

Please configure our callback URL:
- URL: https://sabbpe-uat-[YOUR-ID].a.run.app/ntt/callback
- Method: POST
- Content-Type: application/x-www-form-urlencoded

We have verified all encryption keys and credentials are correctly configured.

Please confirm:
1. Callback URL has been configured
2. UPI testing is enabled (VPA: atomots@upi)
3. All payment methods are active for testing

We will begin testing once confirmed.

Thank you,
[Your Name]
[Contact Number]
[Email]
```

---

## 🎯 **UAT Success Criteria**

### **Must Pass:**
- ✅ Credit card payment completes successfully
- ✅ Debit card payment completes successfully
- ✅ Callback received and processed correctly
- ✅ Signature verification passes
- ✅ Transaction status updates correctly
- ✅ Webhook delivered (if configured)

### **Should Pass:**
- ✅ UPI payment works
- ✅ Net Banking payment works
- ✅ Payment failure handled gracefully
- ✅ API responds within 2 seconds
- ✅ Multiple concurrent payments work

### **Nice to Have:**
- ✅ Load test: 50+ req/sec
- ✅ Multiple merchants working
- ✅ Refund API implemented
- ✅ Transaction status polling

---

## 📝 **UAT Report Template**

```
# UAT Test Report - Sabbpe Payment Platform
Date: [Date]
Environment: UAT
Merchant ID: 446442

## Test Summary
- Total Tests: X
- Passed: X
- Failed: X
- Blocked: X

## Test Results

### Credit Card Payment
Status: [PASS/FAIL]
Details: [Notes]
Screenshot: [Attach]

### Debit Card Payment
Status: [PASS/FAIL]
Details: [Notes]
Screenshot: [Attach]

### UPI Payment
Status: [PASS/FAIL]
Details: [Notes]
Screenshot: [Attach]

### API Integration
Status: [PASS/FAIL]
Details: [Notes]

### Callback Processing
Status: [PASS/FAIL]
Details: [Notes]

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Status: Open/Fixed

## Recommendations
1. [Recommendation]

## Next Steps
1. [Next action]

## Sign-off
Tester: [Name]
Date: [Date]
```

---

## 🚀 **Next Steps After UAT**

### **Once UAT Passes:**

1. **Get Production Credentials**
   - Request from NTT team
   - Update code with production values
   - Update API URL to production

2. **Deploy to Production**
   - Deploy to Cloud Run (production)
   - Configure production callback URL
   - Set up monitoring and alerts

3. **Go Live!**
   - Onboard first real merchant
   - Process first real payment
   - Monitor transactions closely

---

## 💡 **Pro Tips for UAT**

1. **Keep Logs:** Save all server logs during UAT
2. **Screenshot Everything:** Capture all test scenarios
3. **Test Edge Cases:** Try invalid data, large amounts, special characters
4. **Monitor Performance:** Check response times
5. **Document Issues:** Note every issue found
6. **Retest Fixes:** Verify all fixes work
7. **Get Sign-off:** Document NTT team approval

---

## ✅ **You're Ready for UAT!**

**Updated Files:**
- ✅ server.js (with correct credentials)
- ✅ All encryption keys configured
- ✅ Correct API URL set
- ✅ Test cards documented

**Next Action:**
```bash
# Deploy and start testing!
gcloud run deploy sabbpe-uat --source . --region us-central1 --allow-unauthenticated
```

**Good luck with UAT! 🎉**

---

**Questions during UAT? Issues? Let me know!**
