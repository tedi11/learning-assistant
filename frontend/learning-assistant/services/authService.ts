import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get the correct API URL based on platform
const getApiUrl = () => {
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000/api'; // Android emulator
    } else {
        return 'http://192.168.1.135:8000/api'; // Your computer's IP address
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
}

class AuthService {
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            console.log('Attempting to login with:', { email });
            const response = await axios.post<LoginResponse>(`${API_URL}/login/`, {
                email,
                password,
            }, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.data.access) {
                await AsyncStorage.setItem('userToken', response.data.access);
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
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('refreshToken');
    }

    async getToken(): Promise<string | null> {
        return await AsyncStorage.getItem('userToken');
    }

    async refreshToken() {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
            throw new Error('No refresh token found');
        }

        const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
        });

        if (response.data.access) {
            await AsyncStorage.setItem('userToken', response.data.access);
            return response.data.access;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return !!token;
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
                timeout: 10000,
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
        const token = await AsyncStorage.getItem('userToken');
        return axios.get<UserProfile>(`${API_URL}/profile/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
}

export default new AuthService(); 