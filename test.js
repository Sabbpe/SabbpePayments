#!/usr/bin/env node

/**
 * Sabbpe Payment Platform - Integration Test Script
 * 
 * This script demonstrates how merchants can integrate with Sabbpe
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'sk_test_demo_001'; // Demo API key

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
    console.log('\n' + '='.repeat(60));
    log(`  ${title}`, 'cyan');
    console.log('='.repeat(60) + '\n');
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Register a new merchant
async function testMerchantRegistration() {
    printSection('TEST 1: Merchant Registration');
    
    try {
        const response = await axios.post(`${BASE_URL}/v1/merchants/register`, {
            business_name: 'Test Store',
            email: `teststore${Date.now()}@example.com`,
            ntt_merchant_id: '317157',
            ntt_password: 'Test@123',
            webhook_url: 'https://example.com/webhook'
        });
        
        log('✅ Merchant registered successfully!', 'green');
        log(`Merchant ID: ${response.data.merchant_id}`, 'blue');
        log(`API Key: ${response.data.api_key}`, 'blue');
        
        return response.data;
    } catch (error) {
        log('❌ Merchant registration failed', 'red');
        log(error.response?.data || error.message, 'red');
        return null;
    }
}

// Test 2: Initiate a payment
async function testPaymentInitiation() {
    printSection('TEST 2: Payment Initiation');
    
    try {
        const orderid = `ORDER_${Date.now()}`;
        
        const response = await axios.post(`${BASE_URL}/v1/payments/initiate`, {
            order_id: orderid,
            amount: 100,
            currency: 'INR',
            customer_email: 'customer@example.com',
            customer_phone: '9876543210',
            metadata: {
                product: 'Test Product',
                quantity: 1
            }
        }, {
            headers: {
                'X-API-Key': API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.success) {
            log('✅ Payment initiated successfully!', 'green');
            log(`Transaction ID: ${response.data.transaction_id}`, 'blue');
            log(`Payment URL: ${response.data.payment_url}`, 'blue');
            log(`Atom Token ID: ${response.data.atom_token_id}`, 'blue');
            log(`Status: ${response.data.status}`, 'blue');
            
            return response.data;
        } else {
            log('❌ Payment initiation returned error', 'red');
            log(JSON.stringify(response.data, null, 2), 'red');
            return null;
        }
    } catch (error) {
        log('❌ Payment initiation failed', 'red');
        log(error.response?.data || error.message, 'red');
        return null;
    }
}

// Test 3: Check transaction status
async function testTransactionStatus(transactionId) {
    printSection('TEST 3: Transaction Status Check');
    
    if (!transactionId) {
        log('⚠️  No transaction ID provided, skipping test', 'yellow');
        return;
    }
    
    try {
        const response = await axios.get(
            `${BASE_URL}/v1/transactions/${transactionId}`,
            {
                headers: {
                    'X-API-Key': API_KEY
                }
            }
        );
        
        log('✅ Transaction status retrieved successfully!', 'green');
        log(JSON.stringify(response.data, null, 2), 'blue');
        
        return response.data;
    } catch (error) {
        log('❌ Transaction status check failed', 'red');
        log(error.response?.data || error.message, 'red');
        return null;
    }
}

// Test 4: Simulate webhook
function testWebhookExample() {
    printSection('TEST 4: Webhook Payload Example');
    
    const webhookPayload = {
        event: 'payment.success',
        transaction_id: 'SABBPE_TXN_1234567890_abc123',
        order_id: 'ORDER_12345',
        amount: 100,
        currency: 'INR',
        status: 'success',
        payment_method: 'UPI',
        bank_name: 'HDFC Bank',
        timestamp: new Date().toISOString(),
        metadata: {
            product: 'Test Product'
        }
    };
    
    log('📨 Example webhook payload that merchant will receive:', 'cyan');
    log(JSON.stringify(webhookPayload, null, 2), 'blue');
    
    log('\n💡 Merchant webhook endpoint should:', 'yellow');
    log('   1. Verify the X-Sabbpe-Signature header', 'yellow');
    log('   2. Update order status in their database', 'yellow');
    log('   3. Send confirmation email to customer', 'yellow');
    log('   4. Return 200 OK response', 'yellow');
}

// Main test execution
async function runTests() {
    log('\n🚀 Starting Sabbpe Payment Platform Integration Tests\n', 'cyan');
    
    // Check if server is running
    try {
        await axios.get(BASE_URL);
    } catch (error) {
        log('❌ Server is not running! Please start the server first:', 'red');
        log('   cd sabbpe-payment-platform', 'yellow');
        log('   node server.js', 'yellow');
        process.exit(1);
    }
    
    log('✅ Server is running!', 'green');
    
    // Run tests
    await testMerchantRegistration();
    await sleep(1000);
    
    const paymentData = await testPaymentInitiation();
    await sleep(1000);
    
    if (paymentData) {
        await testTransactionStatus(paymentData.transaction_id);
        await sleep(1000);
        
        printSection('NEXT STEPS');
        log('To complete the payment:', 'yellow');
        log(`1. Open: ${paymentData.payment_url}`, 'blue');
        log('2. Click "Proceed to Payment"', 'blue');
        log('3. Complete payment on NTT page', 'blue');
        log('4. Check transaction status again after payment', 'blue');
    }
    
    testWebhookExample();
    
    printSection('TEST SUMMARY');
    log('✅ All API tests completed successfully!', 'green');
    log('\n📚 For more information, check:', 'cyan');
    log('   - README.md for complete documentation', 'blue');
    log('   - http://localhost:3000 for web interface', 'blue');
    
    log('\n🎯 Integration Checklist for Merchants:', 'cyan');
    log('   [ ] Register merchant account', 'yellow');
    log('   [ ] Store API key securely', 'yellow');
    log('   [ ] Implement payment initiation in checkout', 'yellow');
    log('   [ ] Set up webhook endpoint', 'yellow');
    log('   [ ] Implement status polling (fallback)', 'yellow');
    log('   [ ] Test in UAT environment', 'yellow');
    log('   [ ] Switch to production credentials', 'yellow');
    
    console.log('\n');
}

// Run tests
runTests().catch(error => {
    log('\n❌ Test execution failed:', 'red');
    console.error(error);
    process.exit(1);
});
