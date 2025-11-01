"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { authAPI } from "../../utils/api";

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [uid, setUid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUID = async () => {
      try {
        // Thử lấy từ sessionStorage trước
        const sessionUID =
          sessionStorage.getItem("uid") || sessionStorage.getItem("UID");
        if (sessionUID) {
          setUid(sessionUID);
          setLoading(false);
          return;
        }

        // Nếu không có trong sessionStorage, gọi API để lấy từ backend session
        try {
          const response = await authAPI.getUserUID();
          console.log("API Response:", response.data);
          if (response.data.uid) {
            setUid(response.data.uid);
            // Lưu vào sessionStorage cho lần sau
            sessionStorage.setItem("uid", response.data.uid);
          }
        } catch (apiError) {
          console.error("API Error:", apiError);
          setUid(null);
        }
      } catch (error) {
        console.error("Error getting UID:", error);
        setUid(null);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      getUID();
    }
  }, [user]);

  const handleUpdateProfile = () => {
    alert(
      "Tính năng cập nhật profile sẽ được phát triển trong phiên bản tiếp theo!"
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
          User Profile
        </h1>
        <p className="text-gray-600 text-sm">Manage your account information</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.username?.charAt(0)?.toUpperCase() ||
                user?.name?.charAt(0)?.toUpperCase() ||
                "U"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.username || user?.name || "Chưa có tên"}
              </h2>
              <p className="text-sm text-gray-500">ZKP System User</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="text-2xl font-bold text-green-600">
              $
              {(user?.balance || 0).toLocaleString("vi-VN", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-gray-400">USD</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Account Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Username
                  </label>
                  <p className="text-gray-900 font-medium">
                    {user?.username || "Chưa có"}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    User ID (UID)
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-gray-900 font-mono text-sm break-all">
                      {loading
                        ? "Đang tải..."
                        : uid
                        ? `#${uid}`
                        : "Không có UID"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">
                Wallet Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Wallet Address
                  </label>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-gray-900 font-mono text-sm break-all">
                      {user?.walletAddress || "0x1234...5678 (Demo)"}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Wallet Type
                  </label>
                  <p className="text-gray-900">ZKP Wallet</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Status
                  </label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleUpdateProfile}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition duration-200"
        >
          Update Profile
        </button>

        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-xl transition duration-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
