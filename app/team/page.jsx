"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useRouter } from "next/navigation";
import { useUser } from "@/src/context/UserContext";
import Sidebar from "@/components/Sidebar";

export default function CurrentTeam() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const toggleAdminRole = async (userId, currentRole) => {
    try {
      const userRef = doc(db, "users", userId);
      const newRole = currentRole === "admin" ? "user" : "admin";

      await updateDoc(userRef, { role: newRole });

      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      console.log(`User ${userId} role updated to ${newRole}.`);
      setMenuOpen(null);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-menu")) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mainBg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar activePage="team" />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-screen">
        {/* Header with Search Bar */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
              <p className="text-gray-500">
                Manage your team and their access levels
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              All Team Members
            </h2>
            <p className="text-gray-500">
              View and manage team member permissions
            </p>
          </div>

          {/* Team grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200"
              >
                <div className="h-2 bg-blue-500"></div>
                <div className="p-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {u.firstName
                          ? u.firstName.charAt(0)
                          : u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <Link href={`/user-documents/${u.id}`}>
                          <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {u.firstName && u.lastName
                              ? `${u.firstName} ${u.lastName}`
                              : u.email}
                          </h3>
                        </Link>
                        <div className="flex items-center mt-1">
                          <span
                            className={`text-sm px-2.5 py-0.5 rounded-full ${
                              u.role === "admin"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {u.role === "admin" ? "Admin" : "User"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin controls */}
                    {user?.role === "admin" && u.id !== user?.uid && (
                      <div className="relative dropdown-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === u.id ? null : u.id);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {menuOpen === u.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 dropdown-menu border border-gray-200">
                            <button
                              onClick={() => toggleAdminRole(u.id, u.role)}
                              className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center"
                            >
                              {u.role === "admin" ? (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2 text-red-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  Remove as Admin
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 mr-2 text-green-500"
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
                                  Make Admin
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <Link href={`/user-documents/${u.id}`}>
                      <span className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                        View documents
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 ml-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
