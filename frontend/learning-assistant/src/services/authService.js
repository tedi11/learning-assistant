import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const authService = {
    login: async (email, password) => {
        const response = await axios.post(`${API_URL}/login/`, {
            email,
            password
        });
        if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
        }
        return response.data;
    },

    register: async (email, username, password, password2) => {
        return axios.post(`${API_URL}/register/`, {
            email,
            username,
            password,
            password2
        });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
    },

    getCurrentUser: () => {
        return axios.get(`${API_URL}/profile/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};

export default authService; 