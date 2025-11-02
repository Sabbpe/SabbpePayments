const axios = require('axios');

// ============================================================================
// TEST: TRANSACTION STATUS API WITH ENHANCED DEBUGGING
// ============================================================================

async function testStatusAPI() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           TESTING STATUS API WITH DEBUG LOGGING            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Test Case 1: Valid transaction (replace with your actual transaction details)
    const testCase1 = {
        name: 'Valid Transaction Test',
        data: {
            merchTxnId: 'TXN_1730354418969_abc123def',  // Replace with actual txn ID
            merchTxnDate: '2025-10-31 10:30:00',          // Replace with actual date
            amount: '100.00'                               // Replace with actual amount
        }
    };
    
    // Test Case 2: Non-existent transaction
    const testCase2 = {
        name: 'Non-Existent Transaction Test',
        data: {
            merchTxnId: 'TXN_FAKE_12345',
            merchTxnDate: '2025-10-31 10:00:00',
            amount: '50.00'
        }
    };
    
    // Test Case 3: Wrong amount
    const testCase3 = {
        name: 'Wrong Amount Test',
        data: {
            merchTxnId: 'TXN_1730354418969_abc123def',  // Replace with actual txn ID
            merchTxnDate: '2025-10-31 10:30:00',          // Replace with actual date
            amount: '999.00'                               // Wrong amount
        }
    };
    
    const testCases = [testCase1, testCase2, testCase3];
    
    for (const testCase of testCases) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`TEST: ${testCase.name}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Input:', JSON.stringify(testCase.data, null, 2));
        console.log('');
        
        try {
            const response = await axios.post('http://localhost:3000/api/payment/status-requery', testCase.data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 35000
            });
            
            console.log('✅ API Response Received:');
            console.log(JSON.stringify(response.data, null, 2));
            console.log('');
            
        } catch (error) {
            if (error.response) {
                console.log('❌ API Error Response:');
                console.log('Status:', error.response.status);
                console.log('Data:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.log('❌ Request Failed:');
                console.log('Error:', error.message);
            }
            console.log('');
        }
        
        // Wait 2 seconds between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TESTING COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📋 ANALYSIS GUIDE:');
    console.log('');
    console.log('If you see EMPTY RESPONSE:');
    console.log('  - Transaction might not exist in NDPS system');
    console.log('  - Check if payment was actually initiated and completed');
    console.log('  - Verify the transaction ID, date, and amount match exactly');
    console.log('');
    console.log('If you see "No encData in response":');
    console.log('  - NDPS returned an error message instead of encrypted data');
    console.log('  - Check the raw response in debug logs');
    console.log('');
    console.log('If you see decrypted response:');
    console.log('  - ✅ API is working correctly');
    console.log('  - Check the statusCode in the response');
    console.log('  - OTS0000 = Success');
    console.log('  - OTS0401 = Transaction not found');
    console.log('');
}

// ============================================================================
// REFUND STATUS TEST
// ============================================================================

async function testRefundStatusAPI() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         TESTING REFUND STATUS API WITH DEBUG LOGGING       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    const testData = {
        atomTxnId: '123456789',  // Replace with actual Atom Txn ID from successful payment
        prodName: 'NSE'
    };
    
    console.log('Input:', JSON.stringify(testData, null, 2));
    console.log('');
    
    try {
        const response = await axios.post('http://localhost:3000/api/payment/refund-status', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 35000
        });
        
        console.log('✅ API Response Received:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('');
        
    } catch (error) {
        if (error.response) {
            console.log('❌ API Error Response:');
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ Request Failed:');
            console.log('Error:', error.message);
        }
        console.log('');
    }
}

// ============================================================================
// RUN TESTS
// ============================================================================

async function runAllTests() {
    console.log('');
    console.log('🧪 Starting NDPS API Tests...');
    console.log('');
    console.log('⚠️  IMPORTANT: Make sure server is running on http://localhost:3000');
    console.log('');
    
    // Wait for user confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test Status API
    await testStatusAPI();
    
    // Wait between test suites
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test Refund Status API
    await testRefundStatusAPI();
    
    console.log('');
    console.log('✅ All tests completed!');
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('');
    console.log('1. Review the server logs for detailed debugging information');
    console.log('2. If Status API returns empty response:');
    console.log('   - First, complete a successful payment transaction');
    console.log('   - Copy the merchTxnId and merchTxnDate from callback logs');
    console.log('   - Update test-status-api.js with correct values');
    console.log('   - Run the test again');
    console.log('');
    console.log('3. For Refund Status:');
    console.log('   - You need atomTxnId from a completed payment');
    console.log('   - Get it from the callback or status API response');
    console.log('');
}

// Run tests
runAllTests().catch(console.error);
