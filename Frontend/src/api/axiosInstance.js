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
    // We can show success toasts here for specific methods if we want
    // But usually better to handle it per-request for POST/PUT/DELETE
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const message = error.response?.data?.message || error.message || "An error occurred";

    if (status === 400) {
      toast.error(`Bad Request: ${message}`);
    } else if (status === 404) {
      toast.error(`Not Found: ${message}`);
    } else if (status === 500) {
      toast.error(`Server Error: ${message}`);
    } else {
      toast.error(`Error: ${message}`);
    }

    return Promise.reject(error);
  }
);

export default api;
