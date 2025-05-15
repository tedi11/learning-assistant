import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if user is authenticated
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const itemAPI = {
    getAll: () => api.get('/items/'),
    getById: (id) => api.get(`/items/${id}/`),
    create: (data) => api.post('/items/', data),
    update: (id, data) => api.put(`/items/${id}/`, data),
    delete: (id) => api.delete(`/items/${id}/`),
};

export default api; 