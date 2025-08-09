"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebase"; // adjust if your path differs
import { useUser } from "@/src/context/UserContext";
import { useOrganization } from "@/src/context/OrganizationContext";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { user } = useUser();
  const { switchOrganization } = useOrganization();

  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect to login if not signed in
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = orgName.trim();
    if (!trimmedName) {
      setError("Organization name is required.");
      return;
    }

    try {
      setIsLoading(true);

      // 1) Create organization
      const orgRef = await addDoc(collection(db, "organizations"), {
        name: trimmedName,
        description: orgDescription.trim() || "",
        createdAt: serverTimestamp(),
        createdBy: user?.uid ?? null,
        settings: {
          allowSelfRegistration: false,
          defaultUserRole: "user",
        },
      });

      // 2) Add creator as org-scoped user (admin)
      const orgUserRef = doc(db, "organizations", orgRef.id, "users", user.uid);
      await setDoc(orgUserRef, {
        uid: user.uid,
        email: user.email || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: "coach",
        createdAt: serverTimestamp(),
      });

      // 3) Switch active org in context
      if (typeof switchOrganization === "function") {
        await switchOrganization(orgRef.id);
      }

      // 4) Go home (or wherever you want)
      router.replace("/");
    } catch (err) {
      console.error("Failed to create organization:", err);
      setError(
        err?.message || "Failed to create organization. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null; // guard during redirect

  return (
    <main className="min-h-screen bg-mainBg flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Create Organization
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          You’ll be added as an admin automatically.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g., Suncoast Speech & Debate"
              className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white text-black dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Description (optional)
            </label>
            <textarea
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              placeholder="Briefly describe your organization"
              className="w-full rounded border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white text-black dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full justify-center py-2 px-4 rounded-md text-white text-sm font-medium shadow-sm ${
              isLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isLoading ? "Creating..." : "Create Organization"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full justify-center py-2 px-4 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </form>
      </div>
    </main>
  );
}
