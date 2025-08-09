"use client";

import { useEffect, useMemo, useState } from "react";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";
import { useOrganization } from "@/src/context/OrganizationContext";
import { getOrgDoc, getOrgCollection } from "@/src/utils/firebaseHelpers";
import { useLayout } from "@/src/context/LayoutContext";
import SearchHeader from "@/components/SearchHeader";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function OrganizationProfilePage() {
  const { orgId } = useOrganization();
  const { setActivePage } = useLayout();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);

  // invite/link state
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");

  const { user, isPrivileged } = useUser();
  const canInvite =
    (typeof isPrivileged === "function" && isPrivileged()) ||
    user?.role === "admin" ||
    user?.role === "coach";

  useEffect(() => {
    setActivePage("organization"); // match your sidebar key if you add it
  }, [setActivePage]);

  // Load org details
  useEffect(() => {
    let ignore = false;
    async function loadOrg() {
      if (!orgId) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(getOrgDoc(orgId));
        if (!ignore) {
          setOrg(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        }
      } catch (e) {
        console.error("Failed to load organization:", e);
        if (!ignore) setError("Failed to load organization.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadOrg();
    return () => {
      ignore = true;
    };
  }, [orgId]);

  // Helper: current canonical invite doc ref
  const inviteDocRef = orgId
    ? doc(getOrgCollection(orgId, "invites"), "default")
    : null;

  // On mount (and when orgId changes), try to load existing invite
  useEffect(() => {
    let ignore = false;
    async function fetchExistingInvite() {
      if (!inviteDocRef) return;
      try {
        const snap = await getDoc(inviteDocRef);
        if (snap.exists() && !ignore) {
          const { token } = snap.data() || {};
          const origin =
            typeof window !== "undefined" && window.location?.origin
              ? window.location.origin
              : "";
          if (token) setInviteUrl(`${origin}/invite/${orgId}/${token}`);
        } else if (!ignore) {
          setInviteUrl("");
        }
      } catch (e) {
        console.error("Failed to check existing invite:", e);
      }
    }
    fetchExistingInvite();
    return () => {
      ignore = true;
    };
  }, [inviteDocRef]);

  const createdAtDisplay = useMemo(() => {
    if (!org?.createdAt) return "—";
    try {
      // Support both Firestore Timestamp and ISO strings
      const isTs = org.createdAt?.toDate instanceof Function;
      const d = isTs ? org.createdAt.toDate() : new Date(org.createdAt);
      return d.toLocaleDateString();
    } catch {
      return "—";
    }
  }, [org]);

  // Ensure there is a link: if exists, just show it; if not, create it.
  async function ensureInvite() {
    setError("");
    setCheckingInvite(true);
    try {
      if (!orgId) throw new Error("Missing orgId");
      if (!canInvite)
        throw new Error("Only admins or coaches can manage invites.");

      const snap = await getDoc(inviteDocRef);
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "";

      if (snap.exists()) {
        // Reuse existing token
        const { token } = snap.data() || {};
        if (!token) throw new Error("Invite is missing a token.");
        setInviteUrl(`${origin}/invite/${orgId}/${token}`);
      } else {
        // Create a brand new canonical invite (no expiration)
        const token =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        await setDoc(inviteDocRef, {
          token,
          // No expiration on purpose
          createdAt: new Date().toISOString(),
          createdBy: user?.uid ?? null,
          createdByName: user
            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            : null,
          status: "active", // for auditing/revocation if needed
        });

        setInviteUrl(`${origin}/invite/${orgId}/${token}`);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load/create invite.");
    } finally {
      setCheckingInvite(false);
    }
  }

  // Force-create a new token (rotates and invalidates the old URL)
  async function rotateInvite() {
    setError("");
    setRotating(true);
    try {
      if (!orgId) throw new Error("Missing orgId");
      if (!canInvite)
        throw new Error("Only admins or coaches can manage invites.");

      const token =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      await setDoc(
        inviteDocRef,
        {
          token,
          rotatedAt: new Date().toISOString(),
          rotatedBy: user?.uid ?? null,
          rotatedByName: user
            ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
            : null,
          status: "active",
        },
        { merge: true }
      );

      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "";
      setInviteUrl(`${origin}/invite/${orgId}/${token}`);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to rotate invite.");
    } finally {
      setRotating(false);
    }
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // no-op
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
        <div className="flex-1 overflow-y-auto h-screen">
          <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <SearchHeader />
          </header>
          <div className="max-w-7xl mx-auto px-4 py-6 w-full overflow-x-hidden">
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!orgId) {
    return (
      <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
        <div className="flex-1 overflow-y-auto h-screen">
          <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <SearchHeader />
          </header>
          <div className="max-w-7xl mx-auto px-4 py-6 w-full overflow-x-hidden">
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No organization selected
              </h3>
              <p className="text-gray-500">
                Please switch organizations and try again.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!org) {
    return (
      <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
        <div className="flex-1 overflow-y-auto h-screen">
          <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <SearchHeader />
          </header>
          <div className="max-w-7xl mx-auto px-4 py-6 w-full overflow-x-hidden">
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Organization not found
              </h3>
              <p className="text-gray-500">
                Organization not found or you don&apos;t have access.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
      <div className="flex-1 overflow-y-auto h-screen">
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <SearchHeader />
        </header>

        <div className="max-w-7xl mx-auto px-4 py-6 w-full overflow-x-hidden">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Organization Profile
            </h2>
            <p className="text-gray-500">
              View your organization details and manage invites.
            </p>
          </div>

          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Organization Details
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <div className="text-gray-900 font-medium">
                    {org.name || "—"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <div className="text-gray-900">{createdAtDisplay}</div>
                </div>
              </div>

              {/* Admin/Coach-only: Invite management */}
              {canInvite && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        Team Invitations
                      </h4>
                      <p className="text-sm text-gray-500">
                        Share the current invite link or rotate it to create a
                        new one (no expiration).
                      </p>
                    </div>

                    {/* Primary action: show existing or create if missing */}
                    <button
                      onClick={ensureInvite}
                      disabled={checkingInvite}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {checkingInvite ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Loading Link…
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Show / Generate Invite Link
                        </>
                      )}
                    </button>

                    {/* Secondary: rotate */}
                    <button
                      onClick={rotateInvite}
                      disabled={rotating}
                      className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {rotating ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            ></path>
                          </svg>
                          Rotating…
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M20 11a8.1 8.1 0 01-.9 3.8l2.1 1.2a10.9 10.9 0 001.2-5A11 11 0 006 3.1V1L2 4l4 3V5.1A9 9 0 1120 11z"
                            />
                          </svg>
                          Rotate Link
                        </>
                      )}
                    </button>
                  </div>

                  {inviteUrl && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-blue-900">
                          Current Invite Link
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteUrl}
                          className="flex-1 bg-white border border-blue-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => copy(inviteUrl)}
                          className="inline-flex items-center px-3 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-blue-900 mt-2">
                        Anyone with this link can join this organization via
                        this link.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
