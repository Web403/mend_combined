import axios from "axios";
import { attachAuthInterceptor } from "./authInterceptor";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
    timeout: 30000,
    headers:{
        "Content-Type":"application/json"
    }
});

// Register on the same instance imported by every API service.
attachAuthInterceptor(api);

export default api;
