import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
const AUTH_TOKEN_STORAGE_KEY = 'monazzan_auth_token';
const ACTIVE_WORKSPACE_STORAGE_KEY = 'monazzan_active_workspace_id';

export function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '';
}

export function setStoredAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

export function getStoredWorkspaceId() {
  return localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) || '';
}

export function setStoredWorkspaceId(workspaceId) {
  if (workspaceId) {
    localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
  } else {
    localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  }
}
  
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error || error.message || 'An unexpected error occurred.';
    const status = error.response?.status || 0;

    return Promise.reject({ message, status });
  }
);

export const authApi = {
  register: async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  },

  login: async (payload) => {
    const { data } = await apiClient.post('/auth/login', payload);
    return data;
  },

  getCurrentUser: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data.user;
  },

  updateProfile: async (payload) => {
    const { data } = await apiClient.patch('/auth/me', payload);
    return data.user;
  },
};

export const workspaceApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/workspaces');
    return data;
  },

  create: async (payload) => {
    const { data } = await apiClient.post('/workspaces', payload);
    return data;
  },

  getMembers: async (workspaceId) => {
    const { data } = await apiClient.get(`/workspaces/${workspaceId}/members`);
    return data;
  },

  addMember: async (workspaceId, payload) => {
    const { data } = await apiClient.post(`/workspaces/${workspaceId}/members`, payload);
    return data;
  },

  leave: async (workspaceId) => {
    const { data } = await apiClient.delete(`/workspaces/${workspaceId}/members/me`);
    return data;
  },
};

export const taskApi = {
  getAllTasks: async (workspaceId) => {
    const { data } = await apiClient.get('/tasks', { params: { workspaceId } });
    return data;
  },

  createTask: async (workspaceId, payload) => {
    const { data } = await apiClient.post('/tasks', { ...payload, workspaceId });
    return data;
  },

  updateTask: async (workspaceId, id, payload) => {
    const { data } = await apiClient.patch(`/tasks/${id}`, { ...payload, workspaceId });
    return data;
  },

  reorderTasks: async (workspaceId, tasks) => {
    const { data } = await apiClient.put('/tasks/reorder', { workspaceId, tasks });
    return data;
  },

  deleteTask: async (workspaceId, id) => {
    const { data } = await apiClient.delete(`/tasks/${id}`, { params: { workspaceId } });
    return data;
  },
};

export default apiClient;
