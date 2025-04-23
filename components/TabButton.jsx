"use client";

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium ${
      active 
        ? "border-b-2 border-blue-500 text-blue-500" 
        : "text-gray-500 hover:text-gray-300"
    } transition-colors duration-200`}
  >
    {children}
  </button>
);

export default TabButton;