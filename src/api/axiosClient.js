import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const axiosClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Enables sending/receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosClient;
