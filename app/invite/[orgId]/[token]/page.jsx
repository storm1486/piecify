// Option 1: Move the invite page to a different route structure
// Create: app/invite/[orgId]/[token]/page.js (instead of inside a layout with sidebar)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
} from "firebase/auth";
import { db, auth } from "../../../firebase/firebase"; // adjust path for new location
import { useOrganization } from "@/src/context/OrganizationContext";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function JoinViaInvitePage({ params }) {
  const { orgId, token } = params;
  const router = useRouter();
  const { switchOrganization } = useOrganization();

  const [checking, setChecking] = useState(true);
  const [inviteError, setInviteError] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDefaultRole, setOrgDefaultRole] = useState("member");

  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState("create"); // "create" or "login"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [isStudent, setIsStudent] = useState(null); // null, true, or false
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Prefill if user already signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthReady(true);
      if (u?.email) setAuthEmail(u.email);
      if (u?.displayName && !firstName && !lastName) {
        const parts = u.displayName.split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
    });
    return () => unsub();
  }, [firstName, lastName]);

  // Validate invite link
  useEffect(() => {
    let cancelled = false;
    async function validate() {
      setChecking(true);
      setInviteError("");
      try {
        const inviteSnap = await getDoc(
          doc(db, "organizations", orgId, "invites", "default")
        );
        if (!inviteSnap.exists()) throw new Error("Invite not found.");
        const savedToken = inviteSnap.data()?.token;
        if (!savedToken || savedToken !== token)
          throw new Error("Invalid invite link.");

        const orgSnap = await getDoc(doc(db, "organizations", orgId));
        if (!orgSnap.exists()) throw new Error("Organization not found.");
        const orgData = orgSnap.data() || {};
        if (!cancelled) {
          setOrgName(orgData.name || "Organization");
          setOrgDefaultRole(orgData?.settings?.defaultUserRole || "member");
        }
      } catch (e) {
        if (!cancelled)
          setInviteError(e.message || "Unable to validate invite.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    if (orgId && token) validate();
    return () => {
      cancelled = true;
    };
  }, [orgId, token]);

  async function handleAuth(e) {
    e.preventDefault();
    setJoinError("");

    // Validation: If user selected "Yes, I'm a student", graduation year is required
    if (mode === "create" && isStudent === true && !graduationYear.trim()) {
      setJoinError("Graduation year is required for students.");
      return;
    }

    try {
      if (mode === "create") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const displayName = [firstName, lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (displayName) {
          await fbUpdateProfile(auth.currentUser, { displayName });
        }
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      await joinOrg();
    } catch (e) {
      setJoinError(e.message || "Authentication failed.");
    }
  }

  async function joinOrg() {
    setJoining(true);
    setJoinError("");
    try {
      const u = auth.currentUser;
      if (!u) throw new Error("You must be signed in.");

      await setDoc(
        doc(db, "profiles", u.uid),
        {
          email: u.email || authEmail,
          firstName: firstName || null,
          lastName: lastName || null,
          graduationYear: isStudent === true ? graduationYear || null : null,
          isStudent: isStudent,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "organizations", orgId, "users", u.uid),
        {
          uid: u.uid,
          email: u.email || authEmail,
          firstName: firstName || null,
          lastName: lastName || null,
          graduationYear: isStudent === true ? graduationYear || null : null,
          isStudent: isStudent,
          role: orgDefaultRole,
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (typeof switchOrganization === "function") {
        await switchOrganization(orgId);
      }

      // ✅ Match SignUpPage behavior
      router.push("/");
    } catch (e) {
      setJoinError(e.message || "Failed to join organization.");
    } finally {
      setJoining(false);
    }
  }

  if (checking) {
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
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (inviteError) {
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
            <h2 className="text-2xl font-bold text-red-600 mb-6 text-center">
              Invalid Invite
            </h2>
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {inviteError}
            </div>
          </div>
        </div>
      </main>
    );
  }

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
            {mode === "create" ? "Create your account" : "Sign in"} to join{" "}
            {orgName}
          </h2>

          {joinError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
              {joinError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
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
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your password"
                required
              />
            </div>

            {mode === "create" && (
              <>
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your last name"
                  />
                </div>

                {/* Student Status Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Are you currently a student?
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="student-yes"
                        name="student-status"
                        type="radio"
                        checked={isStudent === true}
                        onChange={() => setIsStudent(true)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label
                        htmlFor="student-yes"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Yes, I&apos;m a student
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="student-no"
                        name="student-status"
                        type="radio"
                        checked={isStudent === false}
                        onChange={() => setIsStudent(false)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label
                        htmlFor="student-no"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        No, I&apos;m not a student
                      </label>
                    </div>
                  </div>
                </div>

                {/* Graduation Year - Only show if student */}
                {isStudent && (
                  <div>
                    <label
                      htmlFor="graduationYear"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Graduation Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="graduationYear"
                      type="text"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., 2025"
                      required={isStudent === true}
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={joining}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                joining ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {joining
                ? "Joining..."
                : mode === "create"
                ? "Create Account & Join"
                : "Sign In & Join"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setMode(mode === "create" ? "login" : "create")}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                {mode === "create"
                  ? "Already have an account? Sign in"
                  : "Need an account? Create one"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
