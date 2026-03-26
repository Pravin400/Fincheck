import axios from 'axios';
import supabase from '../config/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Always fetch a fresh token from Supabase (fixes 400 errors from stale tokens)
api.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
            // Also keep localStorage in sync
            localStorage.setItem('access_token', session.access_token);
        }
    } catch (e) {
        // fallback to localStorage if supabase unavailable
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Auth endpoints
export const authAPI = {
    register: (data) => api.post('/api/auth/register', data),
    login: (data) => api.post('/api/auth/login', data),
    logout: () => api.post('/api/auth/logout'),
    getUser: () => api.get('/api/auth/user')
};

// Session endpoints
export const sessionAPI = {
    createSession: (data) => api.post('/api/sessions', data),
    getSessions: () => api.get('/api/sessions'),
    getSession: (id) => api.get(`/api/sessions/${id}`),
    deleteSession: (id) => api.delete(`/api/sessions/${id}`),
    updateSession: (id, data) => api.patch(`/api/sessions/${id}`, data)
};

// Detection endpoints
export const detectionAPI = {
    detectFish: (formData) => {
        return api.post('/api/detect/fish', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    detectDisease: (formData) => {
        return api.post('/api/detect/disease', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
};

// Chat endpoints (AI Fish Expert)
export const chatAPI = {
    sendMessage: (data) => api.post('/api/chat/message', data),
    getHistory: (sessionId) => api.get(`/api/chat/history/${sessionId}`)
};

export default api;

