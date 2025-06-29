// Test script to verify the login endpoint specifically
const API_BASE_URL = 'https://d66a-2a02-2f00-6200-fa00-75b7-4693-802f-3643.ngrok-free.app/api';

async function testLoginEndpoint() {
    console.log('🔗 Testing login endpoint at:', `${API_BASE_URL}/login/`);
    console.log('⏳ This may take a moment...\n');
    
    try {
        // Test the login endpoint specifically
        console.log('📡 Testing login endpoint...');
        const response = await fetch(`${API_BASE_URL}/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'testpassword'
            })
        });
        
        console.log('✅ Response received!');
        console.log('📊 Status:', response.status);
        console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📄 Response body:', responseText);
        
        if (response.ok) {
            console.log('🎉 Login endpoint is working!');
        } else if (response.status === 400) {
            console.log('✅ Login endpoint is working! (400 is expected for invalid credentials)');
        } else {
            console.log('⚠️  Unexpected response status:', response.status);
        }
        
    } catch (error) {
        console.log('❌ Failed to connect to login endpoint:', error.message);
        console.log('\n🔍 Troubleshooting tips:');
        console.log('1. Make sure ngrok is running: ngrok http 8000');
        console.log('2. Check if the URL is correct in ApiConfig.ts');
        console.log('3. Verify your Django server is running on port 8000');
        console.log('4. Check if ngrok tunnel is active and accessible');
    }
}

// Run the test
testLoginEndpoint(); 