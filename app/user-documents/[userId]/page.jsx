"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "../../firebase/firebase";
import { useUser } from "@/src/context/UserContext";

export default function UserDocuments({ params }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useUser();
  const { userId } = params; // Retrieve userId from params

  useEffect(() => {
    if (!userId) {
      console.error("User ID is undefined. Cannot fetch documents.");
      setLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      try {
        // Query the "users" collection for the user document
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", userId)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          // Extract the "myFiles" array from the user document
          const userDoc = userSnapshot.docs[0].data();
          const files = userDoc.myFiles || [];
          setDocuments(files);
        } else {
          console.error("No user found with the provided user ID.");
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [userId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white p-8">
      <button
        onClick={() => router.back()}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6"
      >
        Back to Team
      </button>
      <h1 className="text-4xl font-bold mb-6">
        Pieces for: {user.firstName}{" "}{user.lastName}
      </h1>
      {documents.length === 0 ? (
        <p>No documents found for this user.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((file, index) => (
            <div
              key={index}
              className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <p className="font-bold">{file.fileName || "Untitled File"}</p>
              <p className="text-sm text-gray-500">
                {file.description || "No description available"}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
