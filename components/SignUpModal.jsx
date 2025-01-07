import React from "react";

export default function SignUpModal({
  isOpen,
  onClose,
  onSignUp,
  email,
  password,
  role,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
  error,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-semibold mb-6 text-center">Sign Up</h2>

        {/* Email Input */}
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={onEmailChange}
          className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
          placeholder="Enter email"
        />

        {/* Password Input */}
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={onPasswordChange}
          className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
          placeholder="Enter password"
        />

        {/* Role Selection */}
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
          Role
        </label>
        <select
          value={role}
          onChange={onRoleChange}
          className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        {/* Error Message */}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Buttons */}
        <button
          onClick={onSignUp}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded mb-4"
        >
          Sign Up
        </button>
        <button
          onClick={onClose}
          className="w-full bg-red-500 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
