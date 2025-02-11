"use client";
import Link from "next/link"; // Import Link from Next.js
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useRouter } from "next/navigation";

export default function CurrentTeam() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // State to track loading
  const router = useRouter(); // Use router for navigation

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
        setLoading(false); // Stop loading after fetch
      }
    };

    fetchUsers();
  }, []);

  console.log(users)

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
        onClick={() => router.push("/")} // Navigate to home page
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6"
      >
        Home
      </button>
      <h1 className="text-4xl font-bold mb-6">Current Team</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Link
            key={user.id}
            href={`/user-documents/${user.id}`} // Dynamic route for user documents
          >
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 cursor-pointer hover:shadow-lg">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}` // Show first and last name if available
                : user.email}
              {/* Fallback to email */}
              <p className="text-sm text-gray-500">{user.role || "User"}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
