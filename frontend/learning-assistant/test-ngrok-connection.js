// Test script to verify ngrok API connection
const API_BASE_URL = 'https://d66a-2a02-2f00-6200-fa00-75b7-4693-802f-3643.ngrok-free.app/api';

async function testNgrokConnection() {
    console.log('🔗 Testing ngrok API connection to:', API_BASE_URL);
    console.log('⏳ This may take a moment...\n');
    
    try {
        // Test basic connectivity
        console.log('📡 Testing basic connectivity...');
        const response = await fetch(`${API_BASE_URL}/courses/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('✅ Response received!');
        console.log('📊 Status:', response.status);
        console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('🎉 API connection successful!');
            console.log('📄 Response data:', data);
            console.log('\n✨ Your ngrok tunnel is working perfectly!');
        } else {
            console.log('⚠️  API responded with error status:', response.status);
            const errorText = await response.text();
            console.log('❌ Error response:', errorText);
            
            if (response.status === 401) {
                console.log('💡 This is expected - the endpoint requires authentication');
                console.log('✅ The connection is working, just needs auth token');
            }
        }
    } catch (error) {
        console.log('❌ Failed to connect to ngrok API:', error.message);
        console.log('\n🔍 Troubleshooting tips:');
        console.log('1. Make sure ngrok is running: ngrok http 8000');
        console.log('2. Check if the URL is correct in ApiConfig.ts');
        console.log('3. Verify your Django server is running on port 8000');
        console.log('4. Check if ngrok tunnel is active and accessible');
        console.log('5. Try visiting the URL in your browser first');
    }
}

// Run the test
testNgrokConnection(); 