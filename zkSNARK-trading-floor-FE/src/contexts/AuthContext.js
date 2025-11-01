"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!authChecked) {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    if (authChecked) {
      console.log("Auth already checked, skipping...");
      return;
    }

    try {
      console.log("Checking auth status...");
      setAuthChecked(true);

      const response = await authAPI.getUserInfo();
      const userData = response.data;

      console.log("Auth check successful:", userData);
      console.log("User UID:", userData.uid); // Debug UID
      setUser(userData);
    } catch (error) {
      console.log("No active session or server not running:", error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      if (response.data.redirect) {
        setAuthChecked(false);
        await checkAuthStatus();

        try {
          const userResponse = await authAPI.getUserUID();
          if (userResponse.data.uid) {
            sessionStorage.setItem("uid", userResponse.data.uid);
            console.log("UID saved to sessionStorage:", userResponse.data.uid);
          }
        } catch (error) {
          console.error("Failed to save UID to session:", error);
        }

        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Đăng nhập thất bại",
      };
    }
  };

  const signup = async (username, password, walletAddress) => {
    try {
      const response = await authAPI.signup(username, password, walletAddress);
      if (response.data.redirect) {
        setAuthChecked(false);
        await checkAuthStatus();
        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Đăng ký thất bại",
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setAuthChecked(false);
      // Xóa UID khỏi sessionStorage khi logout
      sessionStorage.removeItem("uid");
      console.log("UID removed from sessionStorage");
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getUserInfo();
      const userData = response.data;

      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Error refreshing user info:", error);
      return null;
    }
  };

  const value = {
    user,
    login,
    signup,
    logout,
    refreshUser,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
