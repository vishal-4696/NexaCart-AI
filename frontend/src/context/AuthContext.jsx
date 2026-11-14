import { createContext, useContext, useState } from "react";

import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  function saveSession(newToken, newUser) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }

  async function login(email, password) {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const data = response.data;
    const newToken = data.token;
    const newUser = data.user;

    if (!newToken || !newUser) {
      throw new Error("Login response must contain token and user.");
    }

    saveSession(newToken, newUser);
    return newUser;
  }

  async function register(name, email, password) {
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
    });

    const data = response.data;

    // Some backends return a token during registration.
    // Others require a separate login request.
    if (data.token && data.user) {
      saveSession(data.token, data.user);
      return data.user;
    }

    return login(email, password);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
