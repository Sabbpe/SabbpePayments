const crypto = require('crypto');

// Your NDPS credentials
const RES_ENC_KEY = '75AEF0FA1B94B3C10D4F5B268F757F11';
const RES_SALT = '75AEF0FA1B94B3C10D4F5B268F757F11';
const RES_HASH_KEY = 'KEYRESP123657234';

// Fixed IV as per NDPS spec
const IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

// The encrypted data you received
const encData = '0CD63904F407DC4D24167F8D8F2BEE997C80D4536815B71C1EDDB8FDCBACE8B9780D809B0CE258376F19B3F7E0411467DCFC701E322A69EFE543924EA6303E62F6B1281937038FB83A148FE5A66274144007400000C0AFB7634BDF51775DD9764B57599E2C7EA838C6AFC848230B051F39725CE70F8C912B53C6BD71DB7BB801C332425EC92C511D8130810142E9BF083F4C56F1102CEE95184B8487EECDDA2EC1101DC82894B7A17DA6A97903FDA85C1CBB76DEC19F998DDE811FA088EB0A4092D8B28BB441494663903E6CF1625A05372085D4EAFC19CC4920A7EBE28021F949B98D1F42B77BE7159438F8F12839BF89E68CBF33DBB25FA334439B79122B28362EEB353D8B1F7D07E90250AE5E1B9646C6C7E52E95A00DD60B5341D7EAD4EF46B2A108FFE4514A7510D2E7D80C51E2ABDAE32AEE9B2BCF444ED82DB57A413BACCCBC6285D88DA1D452BF54774386C9EC93EEAE1497A98034F946FE84BF706EFCA999FE6F850798656FAA625713289BAD324D887F1E47AB672D9A5D4B5C02A8FAE641194A1DC7A28E47598F490CA08EEFE6A07CD05FC2314A2031533D6798679113A1940EBF3AE0A51927A480EDA70B30D6B2F61974ECA6B6B701B8A8B9C1DC13CADE16D9F38FC41E2F9F3094064B55481D8DE8F9AF08CD6DE89050D92A6132D668B7BEF8F875E8E8C04611230065BD29A2918EB4A04D13233B2D2EDFEB47A7B1FF29336857A0ED6B7B26525BA1A77CBCC98E62A6C96A7BDF4DF8FE302919EEE723A859DD299D3C52CD390FD390DB3B310AAF3FAAB218FD85060572666F2412DCF85AFC1CDA9E779341108DFD417AF0D0C9766FA0BB0AF279FCFC2DBAE726BDD49B684630D77FB613AA5F03AACE41FA09DD608057D705870847AB12F4CB3B0BBED4A138C0BD426CFB3E02B49B0379B9C4A6D7472373857D172E2E547A204459C38CBC7E0B7483C1D506EE987CAE621151A4731471BC5182085ED9657753828C04F7B4D14DED925F17BB4BAAEFF39D2C0D8379BF42F6DD24FB19D11F6A0DC912F68DEDB9C9C7996022DBFE71EC926EDD95A1EE023BBDEFC6E971B7FEF5DDDCA9C5093338863FE24906827E324DD4645FE1E64EC035378E56AE06F21D43A40A3F3F96ADF32DD09E409B61EC65F82E8769BABC9A6BD65D226823C6FAFE06759765620C2BB99FEB1094C6AC60ED889996C3DA708DE7B2504C99EA97C997E72A79BEC079C4E41CCB99FDA48EB7E0D40A86591760BAF48A8F1D302AA75BB84DC67AC4266BC7F5FCE98727DFF30487FC65935BD11691D18BA5C1C0D966894C24D2B22F23DFE89DC1F18F1CF9F07CBDFE713622';

console.log('🔓 Decrypting NDPS callback data...\n');

try {
    // Derive decryption key using PBKDF2
    const resKey = Buffer.from(RES_ENC_KEY, 'ascii');
    const resSalt = Buffer.from(RES_SALT, 'ascii');
    const derivedKey = crypto.pbkdf2Sync(resKey, resSalt, 65536, 32, 'sha512');
    
    console.log('✅ Derived decryption key');
    
    // Convert hex string to buffer
    const encrypted = Buffer.from(encData, 'hex');
    
    console.log('✅ Converted encrypted data from hex');
    console.log(`   Encrypted data length: ${encrypted.length} bytes\n`);
    
    // Decrypt using AES-256-CBC
    const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, IV);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    console.log('✅ Decryption successful!\n');
    
    // Parse JSON
    const jsonString = decrypted.toString('utf8');
    const paymentData = JSON.parse(jsonString);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                 DECRYPTED PAYMENT DATA                     ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(JSON.stringify(paymentData, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                    KEY INFORMATION                         ');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const payment = paymentData.payInstrument;
    
    console.log('📋 Transaction Details:');
    console.log('   Merchant ID:', payment.merchDetails.merchId);
    console.log('   Merchant TXN ID:', payment.merchDetails.merchTxnId);
    console.log('   Merchant TXN Date:', payment.merchDetails.merchTxnDate);
    
    console.log('\n💰 Payment Details:');
    console.log('   Atom TXN ID:', payment.payDetails.atomTxnId);
    console.log('   Amount:', payment.payDetails.amount);
    console.log('   Surcharge:', payment.payDetails.surchargeAmount);
    console.log('   Total Amount:', payment.payDetails.totalAmount);
    console.log('   Currency:', payment.payDetails.txnCurrency);
    console.log('   Transaction Init Date:', payment.payDetails.txnInitDate);
    console.log('   Transaction Complete Date:', payment.payDetails.txnCompleteDate);
    
    console.log('\n✅ Status:');
    console.log('   Status Code:', payment.responseDetails.statusCode);
    console.log('   Message:', payment.responseDetails.message);
    console.log('   Description:', payment.responseDetails.description);
    
    console.log('\n💳 Payment Method:');
    console.log('   Channel:', payment.payModeSpecificData.subChannel);
    console.log('   Bank Name:', payment.payModeSpecificData.bankDetails.otsBankName);
    console.log('   Bank TXN ID:', payment.payModeSpecificData.bankDetails.bankTxnId);
    
    if (payment.payModeSpecificData.bankDetails.cardMaskNumber) {
        console.log('   Card Number:', payment.payModeSpecificData.bankDetails.cardMaskNumber);
        console.log('   Card Type:', payment.payModeSpecificData.bankDetails.cardType);
    }
    
    console.log('\n🔐 Signature Verification:');
    console.log('   Signature:', payment.payDetails.signature.substring(0, 50) + '...');
    
    // Verify signature
    const signatureString = payment.merchDetails.merchId.toString() +
                          payment.payDetails.atomTxnId.toString() +
                          payment.merchDetails.merchTxnId.toString() +
                          Number(payment.payDetails.totalAmount).toFixed(2) +
                          payment.responseDetails.statusCode.toString() +
                          payment.payModeSpecificData.subChannel[0].toString() +
                          payment.payModeSpecificData.bankDetails.bankTxnId.toString();
    
    const calculatedSignature = crypto.createHmac('sha512', RES_HASH_KEY)
        .update(signatureString)
        .digest('hex');
    
    const isValid = calculatedSignature === payment.payDetails.signature;
    
    console.log('   Verification:', isValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isValid) {
        console.log('\n⚠️  Signature Mismatch:');
        console.log('   Calculated:', calculatedSignature.substring(0, 50) + '...');
        console.log('   Received:', payment.payDetails.signature.substring(0, 50) + '...');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    // Summary
    if (payment.responseDetails.statusCode === 'OTS0000') {
        console.log('🎉 PAYMENT SUCCESSFUL!');
        console.log(`   ₹${payment.payDetails.totalAmount} paid via ${payment.payModeSpecificData.bankDetails.otsBankName}`);
        console.log(`   Transaction ID: ${payment.merchDetails.merchTxnId}`);
        console.log(`   Atom TXN ID: ${payment.payDetails.atomTxnId}`);
    } else {
        console.log('❌ PAYMENT FAILED!');
        console.log(`   Status: ${payment.responseDetails.statusCode}`);
        console.log(`   Description: ${payment.responseDetails.description}`);
    }
    
} catch (error) {
    console.error('\n❌ Decryption failed!');
    console.error('Error:', error.message);
    console.error('\nPossible reasons:');
    console.error('  - Wrong decryption key');
    console.error('  - Corrupted encrypted data');
    console.error('  - Invalid data format');
}
