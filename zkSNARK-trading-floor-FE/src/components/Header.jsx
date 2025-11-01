"use client";
import React from "react";
import { useState } from "react";
import { FiSearch } from "react-icons/fi";
import { FaSignOutAlt, FaCog } from "react-icons/fa";
import { HiOutlineUserCircle } from "react-icons/hi";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";

const Header = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/Login");
  };

  return (
    <div className="fixed top-0 right-0 left-0 lg:left-[220px] z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-gray-800">
                Welcome, {user?.username || user?.name || "User"}!
              </span>
              <span className="text-sm text-gray-500">
                Manage your ZKP account
              </span>
            </div>
          </div>
        </div>
        <div className="group flex items-center gap-3 relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer">
            {(user?.username || user?.name || "User").charAt(0).toUpperCase()}
          </div>
          <div className="w-[260px] bg-white absolute right-0 top-0 z-50 rounded-xl hidden group-hover:block p-4 shadow-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {(user?.username || user?.name || "User")
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {user?.username || user?.name || "User"}
                </div>
                <div className="text-sm text-gray-500">Online</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-center text-sm text-gray-600 mb-4">
              {user?.walletAddress
                ? `${user.walletAddress.slice(
                    0,
                    8
                  )}...${user.walletAddress.slice(-6)}`
                : "No wallet connected"}
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium transition duration-200 text-sm"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
