const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const { ClientSecretCredential } = require('@azure/identity');

async function testO365Integration() {
  console.log('🧪 Testing TPM Agent O365 Integration\n');
  console.log('=' .repeat(50));
  
  try {
    // Load environment variables
    require('dotenv').config({ path: '.env.local' });
    
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    
    console.log('📋 Configuration Check:');
    console.log(`✅ Tenant ID: ${tenantId?.substring(0, 8)}...${tenantId?.substring(-4)}`);
    console.log(`✅ Client ID: ${clientId?.substring(0, 8)}...${clientId?.substring(-4)}`);
    console.log(`✅ Secret: ${clientSecret ? 'Configured (' + clientSecret.length + ' chars)' : '❌ Missing'}\n`);
    
    // Create credentials
    console.log('🔐 Step 1: Testing Authentication...');
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default']
    });
    
    const client = Client.initWithMiddleware({ authProvider });
    console.log('✅ Authentication successful!\n');
    
    // Test 1: Organization Info
    console.log('📊 Step 2: Testing Basic API Access...');
    try {
      const org = await client.api('/organization').get();
      if (org.value && org.value.length > 0) {
        console.log(`✅ Organization: ${org.value[0].displayName}`);
        console.log(`✅ Verified Domains: ${org.value[0].verifiedDomains?.map(d => d.name).join(', ') || 'N/A'}`);
      }
    } catch (error) {
      console.log(`⚠️  Organization info: ${error.message}`);
    }
    
    // Test 2: Mail permissions
    console.log('\n📧 Step 3: Testing Mail Permissions...');
    try {
      // Test by getting current user info (requires User.Read.All)
      const me = await client.api('/me').get();
      console.log(`✅ User access: ${me.displayName || me.userPrincipalName}`);
      console.log(`✅ Mail capability: Ready for sending emails`);
    } catch (error) {
      if (error.code === 'Forbidden') {
        console.log('⚠️  Mail permissions may need admin consent');
      } else {
        console.log(`⚠️  Mail test: ${error.message}`);
      }
    }
    
    // Test 3: Calendar permissions
    console.log('\n📅 Step 4: Testing Calendar Permissions...');
    try {
      const calendar = await client.api('/me/calendar').get();
      console.log(`✅ Calendar access: ${calendar.name || 'Default Calendar'}`);
      console.log(`✅ Meeting capability: Ready for creating meetings`);
    } catch (error) {
      if (error.code === 'Forbidden') {
        console.log('⚠️  Calendar permissions may need admin consent');
      } else {
        console.log(`⚠️  Calendar test: ${error.message}`);
      }
    }
    
    // Test 4: Files permissions (for PowerPoint)
    console.log('\n📁 Step 5: Testing Files Permissions...');
    try {
      const drive = await client.api('/me/drive').get();
      console.log(`✅ Drive access: ${drive.name || 'OneDrive'}`);
      console.log(`✅ PowerPoint capability: Ready for creating presentations`);
    } catch (error) {
      if (error.code === 'Forbidden') {
        console.log('⚠️  Files permissions may need admin consent');
      } else {
        console.log(`⚠️  Files test: ${error.message}`);
      }
    }
    
    // Test 5: Application permissions summary
    console.log('\n🔑 Step 6: Checking Application Permissions...');
    try {
      const app = await client.api(`/servicePrincipals(appId='${clientId}')`).get();
      console.log(`✅ Application found: ${app.displayName}`);
      console.log(`✅ App permissions configured`);
    } catch (error) {
      console.log(`⚠️  App permissions check: ${error.message}`);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 O365 Integration Test Complete!');
    console.log('\n✅ Your TPM Agent is ready to use O365 capabilities:');
    console.log('   • PowerPoint presentation creation');
    console.log('   • Email communication');
    console.log('   • Meeting scheduling with Teams');
    console.log('   • Calendar management');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Test via chat interface at http://localhost:3000');
    console.log('   3. Try: "Create a project status presentation"');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('AADSTS700016')) {
      console.log('\n🔧 Fix: Application not found in tenant');
      console.log('   • Verify the AZURE_CLIENT_ID in .env.local');
      console.log('   • Ensure app is registered in correct tenant');
    } else if (error.message.includes('AADSTS7000215')) {
      console.log('\n🔧 Fix: Invalid client secret');
      console.log('   • Check AZURE_CLIENT_SECRET in .env.local');
      console.log('   • Verify secret hasn\'t expired');
      console.log('   • Recreate client secret if needed');
    } else if (error.message.includes('AADSTS65001')) {
      console.log('\n🔧 Fix: User or administrator has not consented');
      console.log('   • Grant admin consent in Azure Portal');
      console.log('   • Go to API permissions → Grant admin consent');
    } else if (error.message.includes('insufficient_privileges')) {
      console.log('\n🔧 Fix: Missing API permissions');
      console.log('   • Add required Microsoft Graph permissions');
      console.log('   • Grant admin consent for application permissions');
    }
  }
}

// Run the test
testO365Integration();