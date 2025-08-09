"use client";
import { useState } from "react";
import { useUser } from "@/src/context/UserContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

const capitalize = (str) =>
  typeof str === "string" && str.length > 0
    ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    : "";

export default function SignUpPage() {
  const { user, handleSignUp } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  const signUpCore = async () => {
    setError("");
    setIsLoading(true);

    if (isStudent && !graduationYear) {
      setError("Please enter your graduation year.");
      setIsLoading(false);
      throw new Error("missing-grad-year");
    }

    await handleSignUp({
      email,
      password,
      firstName,
      lastName,
      graduationYear,
      role,
      skipOrgScopedWrite: true, // important when creating an org after signup
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signUpCore();
      router.push("/"); // regular signup flow
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCreateOrg = async (e) => {
    e.preventDefault();
    try {
      await handleSignUp({
        email,
        password,
        firstName,
        lastName,
        graduationYear,
        role,
        skipOrgScopedWrite: true, // important so it doesn’t require orgId yet
      });

      router.push("/create-organization"); // go straight to org creation page
    } catch (err) {
      console.error("Error signing up user:", err);
      if (err?.code === "auth/weak-password") {
        setError("Password must be at least 6 characters long.");
      } else if (err?.code === "auth/email-already-in-use") {
        setError("This email is already in use. Please try logging in.");
      } else if (err?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Failed to sign up. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthError = (err) => {
    console.error("Error signing up user:", err);
    if (err?.code === "auth/weak-password") {
      setError("Password must be at least 6 characters long.");
    } else if (err?.code === "auth/email-already-in-use") {
      setError("This email is already in use. Please try logging in.");
    } else if (err?.code === "auth/invalid-email") {
      setError("Please enter a valid email address.");
    } else if (err?.message !== "missing-grad-year") {
      setError("Failed to sign up. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-6 bg-blue-900 text-white text-center z-10 shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          <span className="text-white">Piece</span>
          <span className="text-blue-300">fy</span>
        </h1>
        <div className="text-sm font-medium mt-1 text-gray-200">
          Your performances, organized.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Create Your Account
          </h2>

          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
            </div>

            {isStudent && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Graduation Year
                </label>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g. 2026"
                />
              </div>
            )}

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isStudent}
                  onChange={(e) => setIsStudent(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span>Are you a student?</span>
              </label>
            </div>

            {/* Primary: normal sign up */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading ? "bg-green-400" : "bg-green-600 hover:bg-green-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </button>

            {/* Secondary: sign up then create org */}
            <button
              onClick={handleSubmitCreateOrg}
              disabled={isLoading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading
                  ? "bg-purple-400"
                  : "bg-purple-600 hover:bg-purple-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500`}
            >
              {isLoading ? "Working..." : "Sign Up & Create Organization"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
