import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  timeout: 5000,
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),

  signup: (username, password, walletAddress) =>
    api.post("/auth/signup", { username, password, walletAddress }),

  logout: () => api.get("/auth/logout"),

  getUserInfo: () => api.get("/auth/user"),

  getUserUID: () => api.get("/auth/user/uid"),

  getSessionInfo: () => api.get("/auth/session"),

  getCurrentUID: () => {
    // Lấy session cookie
    const cookies = document.cookie.split(";");
    const sessionCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("connect.sid=")
    );

    if (sessionCookie) {
      const sessionValue = sessionCookie.split("=")[1];

      try {
        const decodedSession = decodeURIComponent(sessionValue);
        return decodedSession;
      } catch (error) {
        console.error("Error decoding session cookie:", error);
        return null;
      }
    }

    return null;
  },
};

export const transactionAPI = {
  getTransactions: () => api.get("/transactions"),

  createTransaction: (data) => api.post("/transactions", data),
};

export const depositAPI = {
  getDeposits: () => api.get("/deposits"),

  createDeposit: (data) => api.post("/deposits", data),
};

export const withdrawAPI = {
  getWithdrawals: () => api.get("/withdraws"),

  createWithdrawal: (data) => api.post("/withdraws", data),
};

export const metadaAPI = {
  getProofmetaData: () => api.get("/proof-metadata"),
};

export default api;
