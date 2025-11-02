/**
 * Sample Webhook Receiver for Merchants
 * 
 * This is an example of how merchants should implement
 * their webhook endpoint to receive payment notifications from Sabbpe
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Your webhook secret (provided by Sabbpe)
const WEBHOOK_SECRET = 'sabbpe_webhook_secret';

/**
 * Verify webhook signature to ensure it's from Sabbpe
 */
function verifySignature(payload, signature) {
    const calculated = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return calculated === signature;
}

/**
 * Process payment success
 */
async function handlePaymentSuccess(data) {
    console.log('💰 Payment successful:', data.transaction_id);
    
    // TODO: Update your database
    // await db.orders.update({
    //     order_id: data.order_id,
    //     payment_status: 'paid',
    //     payment_method: data.payment_method,
    //     transaction_id: data.transaction_id,
    //     paid_at: new Date()
    // });
    
    // TODO: Send confirmation email to customer
    // await emailService.sendPaymentConfirmation({
    //     to: customerEmail,
    //     order_id: data.order_id,
    //     amount: data.amount
    // });
    
    // TODO: Update inventory
    // await inventory.decrementStock(productIds);
    
    // TODO: Trigger order fulfillment
    // await fulfillment.createShipment(data.order_id);
    
    console.log('✅ Order processed successfully:', data.order_id);
}

/**
 * Process payment failure
 */
async function handlePaymentFailed(data) {
    console.log('❌ Payment failed:', data.transaction_id);
    
    // TODO: Update your database
    // await db.orders.update({
    //     order_id: data.order_id,
    //     payment_status: 'failed',
    //     failed_at: new Date()
    // });
    
    // TODO: Notify customer
    // await emailService.sendPaymentFailedNotification({
    //     to: customerEmail,
    //     order_id: data.order_id
    // });
    
    console.log('⚠️  Order marked as failed:', data.order_id);
}

/**
 * Main webhook endpoint
 * This is where Sabbpe will send payment notifications
 */
app.post('/webhook/sabbpe', async (req, res) => {
    console.log('\n📨 Webhook received from Sabbpe');
    
    try {
        // 1. Verify signature
        const signature = req.headers['x-sabbpe-signature'];
        if (!signature) {
            console.log('❌ Missing signature');
            return res.status(401).json({ error: 'Missing signature' });
        }
        
        if (!verifySignature(req.body, signature)) {
            console.log('❌ Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        console.log('✅ Signature verified');
        
        // 2. Parse webhook data
        const { event, transaction_id, order_id, amount, status } = req.body;
        
        console.log('Event:', event);
        console.log('Transaction ID:', transaction_id);
        console.log('Order ID:', order_id);
        console.log('Amount:', amount);
        console.log('Status:', status);
        
        // 3. Check for duplicate webhooks (idempotency)
        // TODO: Implement idempotency check
        // const processed = await db.webhooks.exists({ transaction_id });
        // if (processed) {
        //     console.log('⚠️  Webhook already processed');
        //     return res.status(200).json({ message: 'Already processed' });
        // }
        
        // 4. Process based on event type
        switch (event) {
            case 'payment.success':
                await handlePaymentSuccess(req.body);
                break;
                
            case 'payment.failed':
                await handlePaymentFailed(req.body);
                break;
                
            default:
                console.log('⚠️  Unknown event type:', event);
        }
        
        // 5. Log webhook for debugging
        // await db.webhooks.insert({
        //     transaction_id,
        //     event,
        //     payload: req.body,
        //     processed_at: new Date()
        // });
        
        // 6. Return 200 OK to acknowledge receipt
        res.status(200).json({ 
            message: 'Webhook processed successfully',
            transaction_id 
        });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        
        // Return 500 so Sabbpe will retry
        res.status(500).json({ 
            error: 'Webhook processing failed',
            message: error.message 
        });
    }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'merchant-webhook-receiver' });
});

/**
 * Test endpoint to simulate webhook
 */
app.post('/test/webhook', (req, res) => {
    console.log('\n🧪 Test webhook triggered');
    
    const testPayload = {
        event: 'payment.success',
        transaction_id: 'SABBPE_TXN_TEST_123',
        order_id: 'ORDER_TEST_123',
        amount: 100,
        currency: 'INR',
        status: 'success',
        payment_method: 'UPI',
        bank_name: 'HDFC Bank',
        timestamp: new Date().toISOString(),
        metadata: req.body.metadata || {}
    };
    
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(JSON.stringify(testPayload))
        .digest('hex');
    
    // Simulate webhook call to self
    const http = require('http');
    const data = JSON.stringify(testPayload);
    
    const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/webhook/sabbpe',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Sabbpe-Signature': signature,
            'Content-Length': data.length
        }
    };
    
    const clientReq = http.request(options, (clientRes) => {
        console.log('✅ Test webhook sent');
        res.json({ 
            message: 'Test webhook sent',
            payload: testPayload,
            signature 
        });
    });
    
    clientReq.on('error', (error) => {
        console.error('❌ Test webhook failed:', error);
        res.status(500).json({ error: error.message });
    });
    
    clientReq.write(data);
    clientReq.end();
});

// Start server
const PORT = process.env.WEBHOOK_PORT || 4000;
app.listen(PORT, () => {
    console.log('\n🎯 Merchant Webhook Receiver');
    console.log(`📡 Listening on port ${PORT}`);
    console.log('\nEndpoints:');
    console.log(`   POST http://localhost:${PORT}/webhook/sabbpe - Main webhook endpoint`);
    console.log(`   GET  http://localhost:${PORT}/health - Health check`);
    console.log(`   POST http://localhost:${PORT}/test/webhook - Test webhook`);
    console.log('\n⚠️  Remember to:');
    console.log('   1. Replace WEBHOOK_SECRET with your actual secret');
    console.log('   2. Implement actual database operations');
    console.log('   3. Add proper error handling');
    console.log('   4. Enable HTTPS in production');
    console.log('   5. Implement rate limiting');
    console.log('   6. Add monitoring and alerts\n');
});

/**
 * PRODUCTION CHECKLIST:
 * 
 * Security:
 * [ ] Use HTTPS only
 * [ ] Verify webhook signatures
 * [ ] Implement rate limiting
 * [ ] Add IP whitelisting (optional)
 * 
 * Reliability:
 * [ ] Implement idempotency checks
 * [ ] Add retry logic for failures
 * [ ] Log all webhooks for debugging
 * [ ] Set up monitoring and alerts
 * 
 * Database:
 * [ ] Use transactions for atomic updates
 * [ ] Handle race conditions
 * [ ] Clean up old webhook logs
 * 
 * Testing:
 * [ ] Test success scenarios
 * [ ] Test failure scenarios
 * [ ] Test duplicate webhooks
 * [ ] Load test webhook endpoint
 */
