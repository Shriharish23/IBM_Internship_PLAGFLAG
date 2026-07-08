import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BASE });

export const analyzeText = (text) =>
  api.post('/api/analyze/text', { text });

export const analyzeFile = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/api/analyze/file', form);
};

export const analyzeFolder = (files) => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return api.post('/api/analyze/folder', form);
};

export const checkHealth = () => api.get('/api/health');

export default api;
