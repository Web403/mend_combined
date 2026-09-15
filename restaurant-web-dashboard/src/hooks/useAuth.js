import { useState } from "react";
import { login } from "../api/services/auth/auth.service";
import { storage } from "../utils/storage";

export default function useAuth() {
  const [loading, setLoading] = useState(false);

  const signIn = async (payload) => {
    setLoading(true);

    try {
      const res = await login(payload);

      const data = res.data.data;

      storage.setTokens(data);

      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    signIn,
    loading,
  };
}