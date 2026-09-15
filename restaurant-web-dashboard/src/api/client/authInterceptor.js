import { storage } from "../../utils/storage";

/**
 * Attach the current access token to every request made with this Axios instance.
 * Keeping registration separate avoids a circular import between the client and
 * its interceptor.
 */
export const attachAuthInterceptor = (api) =>
  api.interceptors.request.use((config) => {
    const token = storage.getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });
