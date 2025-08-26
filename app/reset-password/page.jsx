// app/reset-password/page.jsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/firebase/firebase"; // adjust if your path differs

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // "idle" | "loading" | "success" | "error"
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => email.trim().length > 0, [email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("loading");
    setError("");

    try {
      const actionCodeSettings = {
        url: `${
          typeof window !== "undefined" ? window.location.origin : ""
        }/login`,
        handleCodeInApp: false,
      };

      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setStatus("success");
    } catch (err) {
      let msg = "Something went wrong. Please try again.";
      const code = err?.code || "";

      if (code === "auth/invalid-email")
        msg = "That email address is not valid.";
      else if (code === "auth/user-not-found")
        msg = "No account found for that email.";
      else if (code === "auth/too-many-requests")
        msg = "Too many attempts. Please wait and try again.";

      setError(msg);
      setStatus("error");
    }
  };

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-6 bg-blue-900 text-white text-center z-10 shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          <span className="text-white">Piece</span>
          <span className="text-blue-300">ify</span>
        </h1>
        <div className="text-sm font-medium mt-1 text-gray-200">
          Your performances, organized.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Reset your password
          </h2>

          {status === "success" ? (
            <div className="space-y-6">
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                If an account exists for <strong>{email}</strong>, a reset link
                has been sent. Please check your inbox (and spam).
              </div>
              <Link
                href="/login"
                className="w-full inline-flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your account email"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit || status === "loading"}
                className={`w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white ${
                  status === "loading"
                    ? "bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {status === "loading" ? "Sending..." : "Send reset link"}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Back to Sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
