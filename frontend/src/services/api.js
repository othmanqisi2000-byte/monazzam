import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Centralized error normalization so components can rely on a consistent
// error shape: { message, status }.
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
  /**
   * Fetch all tasks, ordered by status then order.
   */
  getAllTasks: async () => {
    const { data } = await apiClient.get('/tasks');
    return data;
  },

  /**
   * Create a new task.
   * @param {{ title: string, description?: string, status?: string }} payload
   */
  createTask: async (payload) => {
    const { data } = await apiClient.post('/tasks', payload);
    return data;
  },

  /**
   * Update task fields (title/description/status/order).
   * @param {string} id
   * @param {object} payload
   */
  updateTask: async (id, payload) => {
    const { data } = await apiClient.patch(`/tasks/${id}`, payload);
    return data;
  },

  /**
   * Batch update task order/status after a drag-and-drop operation.
   * @param {Array<{ id: string, status: string, order: number }>} tasks
   */
  reorderTasks: async (tasks) => {
    const { data } = await apiClient.put('/tasks/reorder', { tasks });
    return data;
  },

  /**
   * Delete a task by id.
   * @param {string} id
   */
  deleteTask: async (id) => {
    const { data } = await apiClient.delete(`/tasks/${id}`);
    return data;
  },
};

export default apiClient;
