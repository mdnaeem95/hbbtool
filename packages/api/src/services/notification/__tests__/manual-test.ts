// packages/api/src/services/notification/__tests__/manual-test.ts
/**
 * Manual test script for notification providers
 * 
 * Usage:
 * 1. Set up environment variables in .env
 * 2. Run: pnpm test:notifications
 * 
 * This will test real API calls to Twilio, WhatsApp, and Resend
 */

import { smsProvider } from '../provider/sms'
import { whatsappProvider, whatsappOptIn } from '../provider/whatsapp'
import { emailProvider } from '../provider/email'
import { NotificationService } from '../index'

// Test configuration
const TEST_CONFIG = {
  // Replace with real test user IDs from your database
  merchantId: 'test-merchant-id',
  customerId: 'test-customer-id',
  
  // Test phone numbers (use your real numbers for testing)
  testPhoneSG: '91234567', // Singapore local format
  testPhoneIntl: '+6591234567', // International format
  
  // Test email
  testEmail: 'test@example.com'
}

async function testSMSProvider() {
  console.log('\n🔔 Testing SMS Provider (Twilio)')
  console.log('=' .repeat(50))
  
  try {
    // Test 1: Basic SMS send
    console.log('Test 1: Sending basic SMS...')
    const smsResult = await smsProvider.send({
      userId: TEST_CONFIG.merchantId,
      message: 'Test SMS from KitchenCloud notification system. Time: {{timestamp}}',
      data: { 
        timestamp: new Date().toISOString(),
        orderNumber: 'TEST-001'
      }
    })
    
    console.log('✅ SMS Result:', smsResult)
    
    // Test 2: Long message truncation
    console.log('\nTest 2: Testing message truncation...')
    const longMessage = 'This is a very long message that should be truncated to 160 characters. '.repeat(10)
    const longSmsResult = await smsProvider.send({
      userId: TEST_CONFIG.merchantId,
      message: longMessage,
      data: { test: 'truncation' }
    })
    
    console.log('✅ Long SMS Result:', longSmsResult)
    
    // Test 3: Phone number formatting
    console.log('\nTest 3: Testing phone number formatting...')
    const formatTests = [
      '91234567',      // Local
      '091234567',     // With leading 0
      '6591234567',    // With country code
      '+6591234567',   // International format
      'invalid-phone'  // Invalid
    ]
    
    formatTests.forEach(phone => {
      const formatted = smsProvider.formatSingaporePhone(phone)
      console.log(`  ${phone} → ${formatted}`)
    })
    
  } catch (error) {
    console.error('❌ SMS Provider Test Failed:', error)
  }
}

async function testWhatsAppProvider() {
  console.log('\n💬 Testing WhatsApp Provider (Meta Business API)')
  console.log('=' .repeat(50))
  
  try {
    // Test 1: Template message
    console.log('Test 1: Sending template message...')
    const templateResult = await whatsappProvider.send({
      userId: TEST_CONFIG.merchantId,
      title: 'Order Confirmation',
      message: 'Your order has been confirmed',
      data: {
        type: 'ORDER_PLACED',
        orderNumber: 'TEST-001',
        customerName: 'Test Customer',
        amount: 25.50
      }
    })
    
    console.log('✅ WhatsApp Template Result:', templateResult)
    
    // Test 2: Text message
    console.log('\nTest 2: Sending text message...')
    const textResult = await whatsappProvider.send({
      userId: TEST_CONFIG.merchantId,
      title: 'Custom Message',
      message: 'Hello {{businessName}}! This is a test message from KitchenCloud at {{timestamp}}',
      data: {
        type: 'CUSTOM',
        timestamp: new Date().toLocaleString('en-SG'),
        businessName: 'Test Restaurant'
      }
    })
    
    console.log('✅ WhatsApp Text Result:', textResult)
    
    // Test 3: Phone number formatting
    console.log('\nTest 3: Testing WhatsApp phone formatting...')
    const formatTests = [
      '91234567',      // Local
      '+6591234567',   // International
      '6591234567',    // Without +
    ]
    
    formatTests.forEach(phone => {
      const formatted = whatsappProvider.formatWhatsAppPhone(phone)
      console.log(`  ${phone} → ${formatted}`)
    })
    
    // Test 4: Opt-in management
    console.log('\nTest 4: Testing opt-in management...')
    
    // Check current status
    const initialStatus = await whatsappOptIn.checkOptInStatus(TEST_CONFIG.merchantId)
    console.log(`  Current opt-in status: ${initialStatus}`)
    
    // Record opt-in
    await whatsappOptIn.recordOptIn(TEST_CONFIG.merchantId, TEST_CONFIG.testPhoneSG)
    const afterOptIn = await whatsappOptIn.checkOptInStatus(TEST_CONFIG.merchantId)
    console.log(`  After opt-in: ${afterOptIn}`)
    
  } catch (error) {
    console.error('❌ WhatsApp Provider Test Failed:', error)
  }
}

async function testEmailProvider() {
  console.log('\n📧 Testing Email Provider (Resend)')
  console.log('=' .repeat(50))
  
  try {
    const emailResult = await emailProvider.send({
      userId: TEST_CONFIG.merchantId,
      subject: 'Test Email from KitchenCloud Notifications',
      body: 'This is a test email sent at {{timestamp}} from the notification system.',
      data: {
        timestamp: new Date().toLocaleString('en-SG'),
        orderNumber: 'TEST-001'
      }
    })
    
    console.log('✅ Email Result:', emailResult)
    
  } catch (error) {
    console.error('❌ Email Provider Test Failed:', error)
  }
}

async function testNotificationService() {
  console.log('\n🎯 Testing NotificationService Integration')
  console.log('=' .repeat(50))
  
  try {
    // Test full notification with all channels
    console.log('Test: Full multi-channel notification...')
    const result = await NotificationService.createNotification({
      merchantId: TEST_CONFIG.merchantId,
      type: 'ORDER_PLACED',
      channels: ['in_app', 'email', 'sms', 'whatsapp'],
      data: {
        orderNumber: 'INTEGRATION-TEST-001',
        customerName: 'Integration Test Customer',
        amount: 42.00,
        timestamp: new Date().toISOString()
      }
    })
    
    console.log('✅ Full Integration Result:', result)
    
    // Test individual convenience methods
    console.log('\nTest: Order placed convenience method...')
    const orderResult = await NotificationService.orderPlaced({
      merchantId: TEST_CONFIG.merchantId,
      orderId: 'test-order-123',
      orderNumber: 'CONVENIENCE-001',
      customerName: 'Convenience Test',
      amount: 18.50,
      channels: ['email', 'sms']
    })
    
    console.log('✅ Order Placed Result:', orderResult)
    
  } catch (error) {
    console.error('❌ NotificationService Test Failed:', error)
  }
}

async function runAllTests() {
  console.log('🚀 Starting KitchenCloud Notification Provider Tests')
  console.log('=' .repeat(60))
  
  // Check environment variables
  const requiredEnvs = [
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID'
  ]
  
  const missingEnvs = requiredEnvs.filter(env => !process.env[env])
  if (missingEnvs.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingEnvs)
    console.log('Some tests may fail. Set these in your .env file.')
  }
  
  // Run tests
  await testEmailProvider()
  await testSMSProvider()
  await testWhatsAppProvider()
  await testNotificationService()
  
  console.log('\n🎉 All notification tests completed!')
  console.log('Check your phone/email for test messages.')
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

export {
  testSMSProvider,
  testWhatsAppProvider,
  testEmailProvider,
  testNotificationService,
  runAllTests
}