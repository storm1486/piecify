"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "../../firebase/firebase";

export default function UserDocuments({ params }) {
  const [selectedUser, setSelectedUser] = useState(null); // Store clicked user details
  const [documents, setDocuments] = useState([]); // Store resolved file details
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { userId } = params; // Retrieve clicked user ID from params

  useEffect(() => {
    if (!userId) {
      console.error("User ID is undefined. Cannot fetch documents.");
      setLoading(false);
      return;
    }

    const fetchUserAndDocuments = async () => {
      try {
        // Fetch selected user's details
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          console.error("User not found.");
          setLoading(false);
          return;
        }

        const userData = userDocSnap.data();
        setSelectedUser(userData);

        // Resolve file references from `myFiles`
        const fileRefs = userData.myFiles || [];

        const filePromises = fileRefs.map(async (fileEntry) => {
          let filePath, dateGiven;

          if (typeof fileEntry === "string") {
            // Old structure: direct reference
            filePath = fileEntry;
            dateGiven = null;
          } else if (fileEntry?.fileRef?.path) {
            // New structure: { fileRef, dateGiven }
            filePath = fileEntry.fileRef.path;
            dateGiven = fileEntry.dateGiven;
          } else {
            return null; // Skip invalid entries
          }

          const fileDocRef = doc(db, filePath);
          const fileDocSnapshot = await getDoc(fileDocRef);

          return fileDocSnapshot.exists()
            ? { id: fileDocSnapshot.id, ...fileDocSnapshot.data(), dateGiven }
            : null;
        });

        const resolvedFiles = (await Promise.all(filePromises)).filter(Boolean);
        setDocuments(resolvedFiles);
      } catch (error) {
        console.error("Error fetching user or documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndDocuments();
  }, [userId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen bg-mainBg text-white p-8">
      <button
        onClick={() => router.back()}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6"
      >
        Back to Team
      </button>
      <h1 className="text-4xl font-bold mb-6">
        Pieces for:{" "}
        {selectedUser?.firstName && selectedUser?.lastName
          ? `${selectedUser?.firstName} ${selectedUser?.lastName}`
          : selectedUser?.email || "Unknown User"}
      </h1>
      {documents.length === 0 ? (
        <p>No documents found for this user.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((file) => (
            <div
              key={file.id}
              className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <p className="font-bold">{file.fileName || "Untitled File"}</p>
              <p className="text-sm text-gray-500">
                {file.pieceDescription || "No description available"}
              </p>
              <p className="text-xs text-gray-400">
                Given on:{" "}
                {file.dateGiven
                  ? new Date(file.dateGiven).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
