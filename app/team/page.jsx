"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useRouter } from "next/navigation";
import { useUser } from "@/src/context/UserContext"; // Import User Context

export default function CurrentTeam() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null); // Track which user's menu is open
  const menuRef = useRef(null); // Ref for detecting clicks outside
  const router = useRouter();
  const { user } = useUser(); // Get logged-in user from context

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

  // Function to toggle admin role
  const toggleAdminRole = async (userId, currentRole) => {
    try {
      const userRef = doc(db, "users", userId);
      const newRole = currentRole === "admin" ? "user" : "admin";

      await updateDoc(userRef, { role: newRole });

      // Update local state to reflect change
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      console.log(`User ${userId} role updated to ${newRole}.`);
      setMenuOpen(null); // Close menu after action
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  // Detect clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(null); // Close menu when clicking outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white p-8">
      {/* Home Button */}
      <button
        onClick={() => router.push("/")}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6"
      >
        Home
      </button>
      <h1 className="text-4xl font-bold mb-6">Current Team</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 flex justify-between items-center relative"
          >
            <Link href={`/user-documents/${u.id}`} className="flex-1">
              <div className="cursor-pointer hover:shadow-lg">
                {u.firstName && u.lastName
                  ? `${u.firstName} ${u.lastName}`
                  : u.email}
                <p className="text-sm text-gray-500">{u.role || "User"}</p>
              </div>
            </Link>

            {/* Ellipsis Menu */}
            {user?.role === "admin" && u.id !== user?.uid && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === u.id ? null : u.id);
                  }}
                  className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 px-2"
                >
                  &#x22EE; {/* Ellipsis character */}
                </button>

                {menuOpen === u.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 shadow-lg rounded-lg py-2 z-50">
                    <button
                      onClick={() => toggleAdminRole(u.id, u.role)}
                      className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {u.role === "admin" ? "Remove as Admin" : "Make Admin"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
