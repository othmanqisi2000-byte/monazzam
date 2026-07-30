import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'https://monazzam.onrender.com/api';
  
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error || error.message || 'An unexpected error occurred.';
    const status = error.response?.status || 500;

    return Promise.reject({ message, status });
  }
);

export const taskApi = {
  getAllTasks: async () => {
    const { data } = await apiClient.get('/tasks');
    return data;
  },

  createTask: async (payload) => {
    const { data } = await apiClient.post('/tasks', payload);
    return data;
  },

  updateTask: async (id, payload) => {
    const { data } = await apiClient.patch(`/tasks/${id}`, payload);
    return data;
  },

  reorderTasks: async (tasks) => {
    const { data } = await apiClient.put('/tasks/reorder', { tasks });
    return data;
  },

  deleteTask: async (id) => {
    const { data } = await apiClient.delete(`/tasks/${id}`);
    return data;
  },
};

export default apiClient;