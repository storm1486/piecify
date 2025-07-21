"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { motion } from "framer-motion";
import DocumentTags from "@/src/componenets/DocumentTags";
import { useUser } from "@/src/context/UserContext";

export default function ViewRequestedFile() {
  const { fileId } = useParams();
  const router = useRouter();
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUser();
  const [hasRequested, setHasRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isOwned, setIsOwned] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setError("Invalid or missing file ID.");
      setIsLoading(false);
      return;
    }

    const fetchRequestedFile = async () => {
      try {
        setIsLoading(true);
        const fileDocRef = doc(db, "files", fileId);
        const fileDoc = await getDoc(fileDocRef);

        if (!fileDoc.exists()) {
          setError("File not found.");
          return;
        }

        const data = fileDoc.data();
        const currentOwners = data.currentOwner || [];

        const ownerNames = [];

        for (const owner of currentOwners) {
          const userSnap = await getDoc(doc(db, "users", owner.userId));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            ownerNames.push(
              userData.firstName && userData.lastName
                ? `${userData.firstName} ${userData.lastName}`
                : userData.email
            );
          }
        }

        setFileData({ ...data, ownerNames });
        setIsOwned(currentOwners.length > 0);
      } catch (err) {
        console.error("Error fetching requested file:", err);
        setError("An error occurred while fetching the file.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestedFile();
  }, [fileId]);

  const handleAssignmentRequest = async () => {
    if (!user || !fileId) return;

    setIsRequesting(true);
    try {
      const fileRef = doc(db, "files", fileId);
      await updateDoc(fileRef, {
        accessRequests: arrayUnion({
          userId: user.uid,
          requestedAt: new Date().toISOString(),
          status: "pending",
          userName:
            user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.email,
          requestType: "assign",
        }),
      });

      setHasRequested(true);
    } catch (err) {
      console.error("Error submitting assignment request:", err);
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
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
            Access Error
          </h3>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!fileData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
          </div>
          <p className="text-gray-500 mt-4">Loading file...</p>
        </div>
      </div>
    );
  }

  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
    fileData.fileUrl
  )}&embedded=true`;

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800">
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white shadow-sm p-4 z-10"
        >
          <div className="flex items-center justify-between">
            {/* File Title and Info */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {fileData.fileName}
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    Shared File
                  </span>
                  <p className="text-sm text-gray-500">
                    {fileData.fileName.endsWith(".pdf")
                      ? "PDF Document"
                      : fileData.fileName.endsWith(".mp3")
                      ? "Audio File"
                      : "Document"}
                  </p>
                </div>
              </div>
            </div>
            {user && (
              <div className="mt-6">
                {hasRequested ? (
                  <p className="text-green-600 text-sm font-medium">
                    Assignment request submitted!
                  </p>
                ) : isOwned ? (
                  <p className="text-sm text-red-500 font-medium">
                    This piece is already assigned to{" "}
                    {fileData.ownerNames?.join(", ") || "someone"}.
                  </p>
                ) : (
                  <button
                    onClick={handleAssignmentRequest}
                    disabled={isRequesting}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isRequesting
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {isRequesting ? "Requesting..." : "Request Assignment"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Document Tags */}
          <div className="mt-4">
            <DocumentTags
              attributes={fileData.attributes}
              fileId={fileId}
              isPrivilegedUser={false} // Shared files are read-only
            />
          </div>
        </motion.header>

        {/* Document Viewer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 p-4 overflow-hidden"
          onContextMenu={(e) => e.preventDefault()} // Disable right-click
        >
          <div className="h-full bg-white rounded-lg shadow-sm overflow-hidden border">
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title={fileData.fileName}
              style={{ pointerEvents: "auto" }}
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
