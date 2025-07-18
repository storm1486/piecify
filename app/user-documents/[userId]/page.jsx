"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { db } from "../../firebase/firebase";
import { useUser } from "@/src/context/UserContext";
import { useLayout } from "@/src/context/LayoutContext";

export default function UserDocuments({ params }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { userId } = params;
  const { user } = useUser();
  const { setCustomNavButtons } = useLayout();

  useEffect(() => {
    setCustomNavButtons([
      {
        label: "Back to Team",
        onClick: () => router.push(`/team`),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 md:h-6 md:w-6 text-blue-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ),
      },
    ]);
    return () => {
      setCustomNavButtons([]); // Clean up when leaving the page
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setError("User ID is undefined. Cannot fetch documents.");
      setLoading(false);
      return;
    }

    const fetchUserAndDocuments = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch selected user's details
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError("User not found.");
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
        setError("Failed to load user documents. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndDocuments();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Error Loading Documents
          </h3>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getUserDisplayName = () => {
    if (selectedUser?.firstName && selectedUser?.lastName) {
      return `${selectedUser.firstName} ${selectedUser.lastName}`;
    }
    return selectedUser?.email || "Unknown User";
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return (
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "doc":
      case "docx":
        return (
          <svg
            className="h-8 w-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
      case "mp3":
      case "wav":
      case "flac":
        return (
          <svg
            className="h-8 w-8 text-purple-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="h-8 w-8 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800">
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-sm p-6 sticky top-0 z-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                {selectedUser?.firstName?.[0] ||
                  selectedUser?.email?.[0] ||
                  "U"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Documents for {getUserDisplayName()}
                </h1>
                <p className="text-gray-500">
                  {documents.length}{" "}
                  {documents.length === 1 ? "document" : "documents"} assigned
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Team Member
              </span>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <div className="p-6">
          {documents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-sm p-12 text-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No Documents Found
              </h3>
              <p className="text-gray-500 mb-6">
                This user has not been assigned any documents yet.
              </p>
              <button
                onClick={() => router.back()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Back to Team
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {documents.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.fileName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {file.fileName || "Untitled File"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {file.pieceDescription || "No description available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center">
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
                              d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6M8 7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2"
                            />
                          </svg>
                          Assigned
                        </div>
                        <span className="font-medium">
                          {file.dateGiven
                            ? new Date(file.dateGiven).toLocaleDateString()
                            : "Unknown date"}
                        </span>
                      </div>

                      {file.attributes && file.attributes.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {file.attributes
                              .slice(0, 3)
                              .map((attribute, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                >
                                  {attribute}
                                </span>
                              ))}
                            {file.attributes.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                +{file.attributes.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
