import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const message = error.response?.data?.message || error.message || "An error occurred";

    if (status === 400) {
      console.log(`Bad Request: ${message}`);
    } else if (status === 404) {
      console.log(`Not Found: ${message}`);
    } else if (status === 500) {
      console.log(`Server Error: ${message}`);
    } else {
      console.log(`Error: ${message}`);
    }

    return Promise.reject(error);
  }
);

export default api;
