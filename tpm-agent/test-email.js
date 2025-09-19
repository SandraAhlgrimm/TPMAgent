// Test script to capture raw Microsoft Graph email request
const https = require('https');
const { ClientSecretCredential } = require('@azure/identity');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmailRequest() {
  console.log('=== TESTING EMAIL REQUEST ===');
  
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const senderEmail = process.env.O365_DEFAULT_SENDER;
  
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Client ID: ${clientId}`);
  console.log(`Sender Email: ${senderEmail}`);
  
  try {
    // Get access token
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
    
    console.log(`\n✅ Token acquired successfully`);
    console.log(`Token expires: ${new Date(tokenResponse.expiresOnTimestamp).toISOString()}`);
    
    // Prepare the email message
    const message = {
      subject: "Test Email from TPM Agent",
      body: {
        contentType: "HTML",
        content: "<h1>Test Email</h1><p>This is a test email from TPM Agent to verify Microsoft Graph integration.</p>"
      },
      toRecipients: [
        {
          emailAddress: {
            address: senderEmail, // Send to self for testing
            name: "Test Recipient"
          }
        }
      ],
      importance: "normal"
    };
    
    const requestBody = { message };
    const endpoint = `/users/${senderEmail}/sendMail`;
    
    console.log('\n=== RAW REQUEST DETAILS ===');
    console.log(`Method: POST`);
    console.log(`URL: https://graph.microsoft.com/v1.0${endpoint}`);
    console.log(`Headers:`);
    console.log(`  Authorization: Bearer ${tokenResponse.token}`);
    console.log(`  Content-Type: application/json`);
    console.log(`  User-Agent: TPM-Agent/1.0`);
    console.log(`\nRequest Body:`);
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('===========================');
    
    // Make the actual request
    const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenResponse.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'TPM-Agent/1.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`\n=== RESPONSE ===`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log(`Body: ${responseText}`);
    
    if (response.ok) {
      console.log('\n✅ Email sent successfully!');
    } else {
      console.log('\n❌ Email failed to send');
      
      // Try to parse error details
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.log('Raw error response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the test
testEmailRequest().catch(console.error);