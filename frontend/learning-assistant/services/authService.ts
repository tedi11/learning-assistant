import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from './api'; // Import the configured api instance

// Get the correct API URL based on platform
const getApiUrl = () => {
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000/api'; // Android emulator
    } else if (Platform.OS === 'ios') {
        return 'http://192.168.1.135:8000/api'; // iOS simulator
    } else {
        return 'http://192.168.1.135:8000/api'; // Web/desktop
    }
};

const API_URL = getApiUrl();

interface LoginResponse {
    access: string;
    refresh: string;
}

interface UserProfile {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    bio?: string;
    profile_picture?: string;
    date_joined: string;
    courses_count: number;
}

// Helper function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        return payload.exp < currentTime;
    } catch (error) {
        console.log('Error checking token expiration:', error);
        return true; // Assume expired if we can't parse it
    }
};

class AuthService {
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            console.log('Attempting to login with:', { email });
            const response = await axios.post<LoginResponse>(`${API_URL}/login/`, {
                email,
                password,
            }, {
                timeout: 120000, // 120 second timeout (increased from 30 seconds)
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.data.access) {
                await AsyncStorage.setItem('token', response.data.access);
                await AsyncStorage.setItem('refreshToken', response.data.refresh);
                return response.data;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error: any) {
            console.error('Detailed login error:', {
                error: error,
                response: error.response,
                request: error.request,
                config: error.config
            });
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('Connection timeout. Please check your internet connection and try again.');
            } else if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            } else if (error.response?.status === 401) {
                throw new Error('Invalid email or password');
            } else if (error.request) {
                throw new Error('Cannot connect to server. Please check your internet connection and try again.');
            } else {
                throw new Error('Failed to login. Please try again.');
            }
        }
    }

    async logout() {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
    }

    async getToken(): Promise<string | null> {
        return await AsyncStorage.getItem('token');
    }

    async refreshToken() {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }

        const response = await axios.post(`${API_URL}/login/refresh/`, {
            refresh: refreshToken,
        });

        if (response.data.access) {
            await AsyncStorage.setItem('token', response.data.access);
            return response.data.access;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        if (!token) {
            return false;
        }
        
        // Check if token is expired
        if (isTokenExpired(token)) {
            console.log('Token is expired, clearing tokens');
            await this.logout();
            return false;
        }
        
        return true;
    }

    async hasValidTokens(): Promise<boolean> {
        const token = await this.getToken();
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        // Check if we have both tokens
        if (!token || !refreshToken) {
            return false;
        }
        
        // Check if access token is expired
        if (isTokenExpired(token)) {
            // Access token is expired, check if refresh token is valid
            try {
                if (isTokenExpired(refreshToken)) {
                    console.log('Both tokens are expired, clearing tokens');
                    await this.logout();
                    return false;
                }
                // Refresh token is still valid, we can attempt refresh
                return true;
            } catch (error) {
                console.log('Error checking refresh token, clearing tokens');
                await this.logout();
                return false;
            }
        }
        
        return true;
    }

    async register(
        email: string,
        username: string,
        firstName: string,
        lastName: string,
        password: string,
        password2: string
    ): Promise<void> {
        try {
            console.log('Attempting to register with:', { email, username, firstName, lastName });
            const response = await axios.post(`${API_URL}/register/`, {
                email,
                username,
                first_name: firstName,
                last_name: lastName,
                password,
                password2
            }, {
                timeout: 120000, // 120 second timeout (increased from 30 seconds)
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            console.log('Registration response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('Detailed registration error:', {
                error: error,
                response: error.response,
                request: error.request,
                config: error.config
            });
            if (error.response) {
                // The server responded with a status code outside the 2xx range
                throw new Error(error.response.data?.detail || JSON.stringify(error.response.data) || 'Registration failed');
            } else if (error.request) {
                // The request was made but no response was received
                throw new Error('Cannot connect to server. Please check your internet connection and try again.');
            } else {
                // Something happened in setting up the request
                throw new Error(`Error setting up the request: ${error.message}`);
            }
        }
    }

    async getCurrentUser(): Promise<AxiosResponse<UserProfile>> {
        // Check if we have a valid token first
        const token = await this.getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        // Check if token is expired before making the request
        if (isTokenExpired(token)) {
            console.log('Token is expired, clearing tokens before API call');
            await this.logout();
            throw new Error('Authentication token has expired');
        }

        console.log('Token is valid, making API call...');
        // Use the api instance instead of direct axios to benefit from interceptors
        return api.get<UserProfile>('/profile/');
    }
}

export default new AuthService(); 