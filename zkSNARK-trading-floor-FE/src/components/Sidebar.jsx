"use client";

import React, { useState } from "react";
import { Home, User, Menu, X } from "lucide-react";

const Sidebar = ({ activeTab, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: <Home size={20} /> },
    { key: "profile", label: "Profile", icon: <User size={20} /> },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg lg:hidden hover:bg-blue-700 transition-colors shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-0 h-screen bg-white border-r border-gray-200
        flex flex-col z-50 transition-all duration-300 ease-in-out shadow-lg
        w-[240px] md:w-[260px] lg:w-[220px]
        ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
      `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z</span>
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg">ZKP</h1>
              <p className="text-gray-500 text-xs">GROUP 1</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 lg:hidden rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-left group text-sm font-medium
                  ${
                    activeTab === tab.key
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
              >
                <div
                  className={`p-1.5 rounded-md ${
                    activeTab === tab.key
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                  }`}
                >
                  {tab.icon}
                </div>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-gray-600 text-xs">
              <div className="font-medium text-gray-900 mb-1">Status</div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
