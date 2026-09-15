import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MendLMSDashboard from "../MendLMSDashboard";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ProtectedRoute>
        <MendLMSDashboard />
      </ProtectedRoute>
    </AuthProvider>
  </React.StrictMode>
);
