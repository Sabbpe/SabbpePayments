const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================================================
// NDPS CONFIGURATION (Your Credentials)
// ============================================================================

const NDPS_CONFIG = {
    merchId: '446442',
    password: 'Test@123',

    // Request encryption keys
    reqEncKey: 'A4476C2062FFA58980DC8F79EB6A799E',
    reqSalt: 'A4476C2062FFA58980DC8F79EB6A799E',
    reqHashKey: 'KEY123657234',

    // Response decryption keys
    resEncKey: '75AEF0FA1B94B3C10D4F5B268F757F11',
    resSalt: '75AEF0FA1B94B3C10D4F5B268F757F11',
    resHashKey: 'KEYRESP123657234',

    // API endpoints
    authUrl: 'https://paynetzuat.atomtech.in/ots/aipay/auth',
    statusUrl: 'https://paynetzuat.atomtech.in/ots/payment/status',
    refundStatusUrl: 'https://caller.atomtech.in/ots/payment/refund',
    scriptUrl: 'https://pgtest.atomtech.in/staticdata/ots/js/atomcheckout.js',
    serverUrl: process.env.NDPS_SERVER_URL || 'https://sabbpe-uat-988626072499.asia-south1.run.app'
};

console.log('🔧 Server Configuration:');
console.log('   - Environment:', process.env.NODE_ENV || 'development');
console.log('   - Port:', PORT);
console.log('   - Server URL:', NDPS_CONFIG.serverUrl);
console.log('   - Merchant ID:', NDPS_CONFIG.merchId);
console.log('');

// ============================================================================
// NDPS CRYPTO CLASS (AES-256-CBC + PBKDF2)
// ============================================================================

class NDPSCrypto {
    constructor(config) {
        this.reqKey = Buffer.from(config.reqEncKey, 'ascii');
        this.reqSalt = Buffer.from(config.reqSalt, 'ascii');
        this.resKey = Buffer.from(config.resEncKey, 'ascii');
        this.resSalt = Buffer.from(config.resSalt, 'ascii');
        this.reqHashKey = config.reqHashKey;
        this.resHashKey = config.resHashKey;

        this.iv = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

        this.derivedReqKey = crypto.pbkdf2Sync(this.reqKey, this.reqSalt, 65536, 32, 'sha512');
        this.derivedResKey = crypto.pbkdf2Sync(this.resKey, this.resSalt, 65536, 32, 'sha512');
    }

    encryptRequest(data) {
        const jsonString = JSON.stringify(data);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.derivedReqKey, this.iv);

        let encrypted = cipher.update(jsonString, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return encrypted.toString('hex').toUpperCase();
    }

    decryptResponse(hexString) {
        const encrypted = Buffer.from(hexString, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.derivedResKey, this.iv);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return JSON.parse(decrypted.toString('utf8'));
    }

    generateStatusSignature(merchId, merchTxnId, amount, currency) {
        const formattedAmount = Number(amount).toFixed(2);
        const signatureString = merchId.toString() +
            merchTxnId.toString() +
            formattedAmount +
            currency.toString();
        console.log(`[STATUS SIGNATURE DEBUG] Raw String: ${signatureString}`);

        return crypto.createHmac('sha512', this.reqHashKey)
            .update(signatureString)
            .digest('hex');
    }

    verifyCallbackSignature(callbackData) {
        const r = callbackData.payInstrument;

        const signatureString = r.merchDetails.merchId.toString() +
            r.payDetails.atomTxnId.toString() +
            r.merchDetails.merchTxnId.toString() +
            Number(r.payDetails.totalAmount).toFixed(2) +
            r.responseDetails.statusCode.toString() +
            r.payModeSpecificData.subChannel[0].toString() +
            r.payModeSpecificData.bankDetails.bankTxnId.toString();

        const calculatedSignature = crypto.createHmac('sha512', this.resHashKey)
            .update(signatureString)
            .digest('hex');

        return {
            isValid: calculatedSignature === r.payDetails.signature,
            calculated: calculatedSignature,
            received: r.payDetails.signature
        };
    }
}

const ndpsCrypto = new NDPSCrypto(NDPS_CONFIG);

// ============================================================================
// IN-MEMORY STORAGE FOR TRANSACTIONS
// ============================================================================
const transactionStore = new Map();

function storeTransaction(txnId, data) {
    transactionStore.set(txnId, {
        ...data,
        createdAt: new Date().toISOString()
    });
}

function getTransaction(txnId) {
    return transactionStore.get(txnId);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.'));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// ============================================================================
// ROUTES
// ============================================================================

app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('<html><body><h1>Sabbpe Payment Gateway</h1></body></html>');
    }
});

app.get('/admin', (req, res) => {
    const adminPath = path.join(__dirname, 'admin.html');
    if (require('fs').existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.send('<html><body><h1>Admin Dashboard</h1></body></html>');
    }
});

// ============================================================================
// API 1: PAYMENT INITIATION
// ============================================================================

app.post('/api/payment/initiate', async (req, res) => {
    try {
        const { amount, email, mobile, product, paymentMethod } = req.body;

        if (!amount || !email || !mobile) {
            return res.status(400).json({
                success: false,
                error: 'Amount, email, and mobile are required'
            });
        }

        const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const txnDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const originalAmount = parseFloat(amount);
        const amountToSend = Number(originalAmount.toFixed(2));

        console.log('💳 Payment initiation:', {
            txnId,
            amount: amountToSend,
            email,
            mobile,
            product: product || 'NSE',
            paymentMethod
        });

        storeTransaction(txnId, {
            txnId,
            txnDate,
            amount: amountToSend,
            email,
            mobile,
            product: product || 'NSE',
            status: 'INITIATED'
        });

        const payload = {
            payInstrument: {
                headDetails: {
                    api: 'AUTH',
                    version: 'OTSv1.1',
                    platform: 'FLASH'
                },
                merchDetails: {
                    merchId: NDPS_CONFIG.merchId,
                    password: NDPS_CONFIG.password,
                    merchTxnId: txnId,
                    merchTxnDate: txnDate
                },
                payDetails: {
                    amount: amountToSend,
                    product: product || 'NSE',
                    txnCurrency: 'INR'
                },
                custDetails: {
                    custEmail: email,
                    custMobile: mobile
                }
            }
        };

        if (paymentMethod && paymentMethod !== 'ALL') {
            payload.payInstrument.payModeSpecificData = {
                subChannel: paymentMethod
            };
        }

        const encData = ndpsCrypto.encryptRequest(payload);
        const formData = `encData=${encodeURIComponent(encData)}&merchId=${NDPS_CONFIG.merchId}`;

        console.log('📤 Calling NDPS AUTH API...');

        const response = await axios.post(NDPS_CONFIG.authUrl, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });

        const responseText = response.data;
        const encDataMatch = responseText.match(/encData=([^&]+)/);

        if (!encDataMatch) {
            console.error('❌ No encData in response:', responseText);
            return res.status(500).json({
                success: false,
                error: 'Invalid response from payment gateway'
            });
        }

        const decryptedResponse = ndpsCrypto.decryptResponse(
            decodeURIComponent(encDataMatch[1])
        );

        console.log('📥 NDPS Response:', JSON.stringify(decryptedResponse, null, 2));

        const statusCode = decryptedResponse.responseDetails?.txnStatusCode;

        if (statusCode === 'OTS0000') {
            res.json({
                success: true,
                atomTokenId: decryptedResponse.atomTokenId,
                txnId: txnId,
                amount: originalAmount,
                email: email,
                mobile: mobile,
                publicReturnUrl: `${NDPS_CONFIG.serverUrl}/payment/success`
            });
        } else {
            res.status(400).json({
                success: false,
                error: decryptedResponse.responseDetails?.txnDescription || 'Payment initiation failed',
                statusCode: statusCode
            });
        }

    } catch (error) {
        console.error('❌ Payment initiation error:', error.message);

        if (error.code === 'ECONNABORTED') {
            res.status(504).json({
                success: false,
                error: 'Request timeout. Please try again.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Payment initiation failed. Please try again.'
            });
        }
    }
});

// ============================================================================
// API 2: TRANSACTION STATUS ENQUIRY
// ============================================================================

app.post('/api/payment/status-requery', async (req, res) => {
    try {
        console.log('🚨🚨🚨 STATUS REQUERY ENDPOINT HIT 🚨🚨🚨');
        console.log('Request body:', req.body);

        const { merchTxnId, merchTxnDate, amount } = req.body;

        if (!merchTxnId || !merchTxnDate || !amount) {
            console.log('❌ Validation failed - missing fields');
            return res.status(400).json({
                success: false,
                error: 'merchTxnId, merchTxnDate, and amount are required'
            });
        }

        const amountNumber = parseFloat(amount);
        const amountForSignature = amountNumber.toFixed(2);

        console.log('📋 Processed Parameters:');
        console.log('   - merchTxnId:', merchTxnId);
        console.log('   - merchTxnDate:', merchTxnDate);
        console.log('   - amount:', amountForSignature);

        const signatureString =
            NDPS_CONFIG.merchId +
            NDPS_CONFIG.password +
            merchTxnId +
            amountForSignature +
            'INR' +
            'TXNVERIFICATION';

        const signature = crypto
            .createHmac('sha512', NDPS_CONFIG.reqHashKey)
            .update(signatureString)
            .digest('hex');

        const payload = {
            payInstrument: {
                headDetails: {
                    api: 'TXNVERIFICATION',
                    source: 'OTS'
                },
                merchDetails: {
                    merchId: parseInt(NDPS_CONFIG.merchId),
                    password: NDPS_CONFIG.password,
                    merchTxnId: merchTxnId,
                    merchTxnDate: merchTxnDate
                },
                payDetails: {
                    amount: amountNumber,
                    txnCurrency: 'INR',
                    signature: signature
                }
            }
        };

        const encData = ndpsCrypto.encryptRequest(payload);
        const formData = `encData=${encodeURIComponent(encData)}&merchId=${NDPS_CONFIG.merchId}`;

        console.log('📤 Calling NDPS...');

        const response = await axios.post(NDPS_CONFIG.statusUrl, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });

        const responseText = response.data;

        if (!responseText || responseText.length === 0) {
            console.log('❌ Empty response');
            return res.json({
                success: false,
                message: 'Transaction not found',
                statusCode: 'NO_DATA'
            });
        }

        const encDataMatch = responseText.match(/encData=([^&]+)/);

        if (!encDataMatch) {
            console.log('❌ No encData in response');
            return res.status(500).json({
                success: false,
                error: 'Invalid response format'
            });
        }

        const decryptedResponse = ndpsCrypto.decryptResponse(
            decodeURIComponent(encDataMatch[1])
        );

        console.log('✅ Decrypted Response:', JSON.stringify(decryptedResponse, null, 2));

        const transactions = decryptedResponse.payInstrument || [];

        if (!Array.isArray(transactions) || transactions.length === 0) {
            console.log('❌ No transactions in response');
            return res.json({
                success: false,
                message: 'No transaction found',
                statusCode: 'OTS0401'
            });
        }

        const txn = transactions[0];

        if (!txn.responseDetails) {
            return res.json({
                success: false,
                message: 'Malformed response',
                statusCode: 'MALFORMED'
            });
        }

        const statusCode = txn.responseDetails.statusCode;

        console.log('✅ Status Code:', statusCode);

        res.json({
            success: statusCode === 'OTS0000' || statusCode === 'OTS0002',
            statusCode: statusCode,
            message: txn.responseDetails.message || 'Status retrieved',
            description: txn.responseDetails.description || '',
            transaction: {
                merchId: txn.merchDetails?.merchId,
                merchTxnId: txn.merchDetails?.merchTxnId,
                atomTxnId: txn.payDetails?.atomTxnId,
                amount: txn.payDetails?.amount,
                totalAmount: txn.payDetails?.totalAmount
            }
        });

    } catch (error) {
        console.error('❌ ERROR:', error.message);

        res.status(500).json({
            success: false,
            error: 'Status requery failed',
            details: error.message
        });
    }
});

// ============================================================================
// API 3: REFUND INITIATION
// ============================================================================

app.post('/api/payment/initiate-refund', async (req, res) => {
    try {
        console.log('🚨🚨🚨 REFUND INITIATION ENDPOINT HIT 🚨🚨🚨');
        console.log('Request body:', req.body);

        const { atomTxnId, prodName, prodRefundAmount, totalRefundAmount, merchTxnId } = req.body;

        if (!atomTxnId || !prodName || !prodRefundAmount || !totalRefundAmount) {
            console.log('❌ Validation failed - missing fields');
            return res.status(400).json({
                success: false,
                error: 'atomTxnId, prodName, prodRefundAmount, and totalRefundAmount are required'
            });
        }

        console.log('💰 Refund initiation:', { atomTxnId, prodName, prodRefundAmount, totalRefundAmount });

        const refundTxnId = merchTxnId || `REFUND_${Date.now()}`;
        const totalAmount = Number(totalRefundAmount).toFixed(2);

        const signatureString =
            NDPS_CONFIG.merchId +
            NDPS_CONFIG.password +
            refundTxnId +
            totalAmount +
            'INR' +
            'REFUNDINIT';

        console.log('🔐 Signature Generation:');
        console.log('   String:', signatureString);

        const signature = crypto
            .createHmac('sha512', NDPS_CONFIG.reqHashKey)
            .update(signatureString)
            .digest('hex');

        const payload = {
            payInstrument: {
                headDetails: {
                    api: 'REFUNDINIT',
                    source: 'OTS'
                },
                merchDetails: {
                    merchId: parseInt(NDPS_CONFIG.merchId),
                    password: NDPS_CONFIG.password,
                    merchTxnId: refundTxnId
                },
                payDetails: {
                    signature: signature,
                    atomTxnId: parseInt(atomTxnId),
                    totalRefundAmount: parseFloat(totalAmount),
                    txnCurrency: 'INR',
                    prodDetails: [
                        {
                            prodName: prodName,
                            prodRefundAmount: parseFloat(Number(prodRefundAmount).toFixed(2)),
                            prodRefundId: `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        }
                    ]
                }
            }
        };

        console.log('📦 Payload:', JSON.stringify(payload, null, 2));

        const encData = ndpsCrypto.encryptRequest(payload);
        const formData = `encData=${encodeURIComponent(encData)}&merchId=${NDPS_CONFIG.merchId}`;

        console.log('📤 Calling NDPS Refund Initiation API...');

        const response = await axios.post('https://caller.atomtech.in/ots/payment/refund', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });

        console.log('📥 Response Status:', response.status);

        const responseText = response.data;

        if (!responseText || responseText.length === 0) {
            console.log('❌ Empty response from NDPS');
            return res.json({
                success: false,
                message: 'No response data',
                code: 'NO_DATA'
            });
        }

        const encDataMatch = responseText.match(/encData=([^&]+)/);

        if (!encDataMatch) {
            console.log('❌ No encData in response');
            return res.status(500).json({
                success: false,
                error: 'Invalid response format from payment gateway'
            });
        }

        const decryptedResponse = ndpsCrypto.decryptResponse(
            decodeURIComponent(encDataMatch[1])
        );

        console.log('✅ Response decrypted successfully');
        console.log('📥 Decrypted Response:', JSON.stringify(decryptedResponse, null, 2));

        let refundData = decryptedResponse.payInstrument;

        if (!refundData) {
            console.log('❌ No payInstrument in response');
            return res.json({
                success: false,
                message: 'No refund data in response',
                code: 'NO_DATA'
            });
        }

        if (!refundData.responseDetails) {
            console.log('❌ No responseDetails in refund data');
            return res.json({
                success: false,
                message: 'Malformed response from payment gateway',
                code: 'MALFORMED'
            });
        }

        const statusCode = refundData.responseDetails.statusCode;
        const message = refundData.responseDetails.message;
        const description = refundData.responseDetails.description;

        console.log('✅ Status Code:', statusCode);
        console.log('✅ Message:', message);
        console.log('✅ Description:', description);

        const payDetails = refundData.payDetails || {};

        res.json({
            success: statusCode === 'OTS0000' || statusCode === 'OTS0001',
            statusCode: statusCode,
            message: message,
            description: description,
            atomTxnId: payDetails.atomTxnId || null,
            totalRefundAmount: payDetails.totalRefundAmount || null,
            txnCurrency: payDetails.txnCurrency || 'INR',
            prodDetails: payDetails.prodDetails || [],
            refundTxnId: refundTxnId
        });

    } catch (error) {
        console.error('❌ Refund initiation error:', error.message);

        if (error.code === 'ECONNABORTED') {
            res.status(504).json({
                success: false,
                error: 'Request timeout. Please try again.',
                statusCode: 'TIMEOUT'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Refund initiation failed. Please try again.',
                details: error.message,
                statusCode: 'ERROR'
            });
        }
    }
});


// ============================================================================
// API 5: PAYMENT CALLBACK
// ============================================================================

app.post('/api/payment/callback', (req, res) => {
    try {
        console.log('📨 Payment callback received');

        const { encData, merchId } = req.body;

        if (!encData) {
            console.error('❌ No encData in callback');
            return res.status(400).send('Invalid callback data');
        }

        const callbackData = ndpsCrypto.decryptResponse(encData);

        console.log('✅ Callback data decrypted');

        const signatureVerification = ndpsCrypto.verifyCallbackSignature(callbackData);

        if (!signatureVerification.isValid) {
            console.error('❌ Signature verification failed');
            return res.status(400).send('Invalid signature');
        }

        console.log('✅ Signature verified');

        const payment = callbackData.payInstrument;
        const statusCode = payment.responseDetails.statusCode;
        const merchTxnId = payment.merchDetails.merchTxnId;

        const storedTxn = getTransaction(merchTxnId);
        if (storedTxn) {
            storedTxn.status = statusCode === 'OTS0000' ? 'SUCCESS' : 'FAILED';
            storedTxn.atomTxnId = payment.payDetails.atomTxnId;
            storedTxn.callbackData = payment;
        }

        if (statusCode === 'OTS0000') {
            console.log('✅ PAYMENT SUCCESSFUL:', {
                merchTxnId: payment.merchDetails.merchTxnId,
                atomTxnId: payment.payDetails.atomTxnId,
                amount: payment.payDetails.totalAmount
            });
        } else {
            console.log('❌ PAYMENT FAILED:', {
                merchTxnId: payment.merchDetails.merchTxnId,
                statusCode: statusCode
            });
        }

        res.send('OK');

    } catch (error) {
        console.error('❌ Callback processing error:', error.message);
        res.status(500).send('Error processing callback');
    }
});

// ============================================================================
// SUCCESS/FAILURE PAGES
// ============================================================================

app.post('/payment/success', (req, res) => {
    console.log('📄 Payment return page accessed');

    let txnDetails = null;

    if (req.body.encData) {
        try {
            const decrypted = ndpsCrypto.decryptResponse(req.body.encData);
            const payment = decrypted.payInstrument;

            txnDetails = {
                orderId: payment.merchDetails.merchTxnId,
                atomTxnId: payment.payDetails.atomTxnId,
                amount: payment.payDetails.totalAmount,
                status: payment.responseDetails.statusCode,
                message: payment.responseDetails.message,
                description: payment.responseDetails.description,
                paymentMethod: payment.payModeSpecificData?.subChannel?.[0] || 'N/A',
                bankName: payment.payModeSpecificData?.bankDetails?.otsBankName || 'N/A'
            };
        } catch (error) {
            console.error('Error decrypting return data:', error.message);
        }
    }

    const isSuccess = txnDetails && txnDetails.status === 'OTS0000';

    if (isSuccess) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payment Successful - Sabbpe</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                    .container { background: white; border-radius: 16px; max-width: 500px; width: 100%; }
                    .header { background: #28a745; color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; }
                    .amount { font-size: 32px; color: #28a745; text-align: center; margin: 20px 0; font-weight: bold; }
                    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
                    .btn { width: 100%; padding: 14px; margin: 10px 0; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
                    .btn-primary { background: #28a745; color: white; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header"><h1>✅ Payment Successful!</h1></div>
                    <div class="content">
                        <div class="amount">₹${txnDetails.amount}</div>
                        <div class="detail-row"><span>Order ID</span><span>${txnDetails.orderId}</span></div>
                        <div class="detail-row"><span>Transaction ID</span><span>${txnDetails.atomTxnId}</span></div>
                        <button class="btn btn-primary" onclick="location.href='/admin'">View Status</button>
                    </div>
                </div>
            </body>
            </html>
        `);
    } else {
        res.send(`<html><body><h1>❌ Payment Failed</h1><a href="/">Try Again</a></body></html>`);
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
    console.log('🚀 SABBPE PAYMENT GATEWAY - PRODUCTION READY');
    console.log(`Server URL: ${NDPS_CONFIG.serverUrl}`);
    console.log(`Port: ${PORT}`);
    console.log('✅ All APIs Online');
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});