// Test script to verify API connection to the droplet
const API_BASE_URL = 'http://138.197.185.249:8000/api';

async function testApiConnection() {
    console.log('Testing API connection to:', API_BASE_URL);
    
    try {
        // Test basic connectivity
        const response = await fetch(`${API_BASE_URL}/courses/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API connection successful!');
            console.log('Response data:', data);
        } else {
            console.log('❌ API responded with error status:', response.status);
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }
    } catch (error) {
        console.log('❌ Failed to connect to API:', error.message);
        console.log('This might be because:');
        console.log('1. The server is not running');
        console.log('2. The IP address is incorrect');
        console.log('3. The port is not accessible');
        console.log('4. There\'s a network connectivity issue');
    }
}

// Run the test
testApiConnection(); 