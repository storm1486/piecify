"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useUser } from "@/src/context/UserContext";
import LoadingSpinner from "@/components/LoadingSpinner"; // Assuming you have this component

export default function ViewPieces() {
  const { folderId } = useParams();
  const { user, loading } = useUser();
  const [pieces, setPieces] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPieces, setFilteredPieces] = useState([]);
  const [requestStatuses, setRequestStatuses] = useState(new Map());

  useEffect(() => {
    if (folderId && !loading && user) {
      fetchFolderDetails();
      fetchFiles();
    }
  }, [folderId, loading, user]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPieces(pieces);
    } else {
      const filtered = pieces.filter((piece) =>
        piece.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPieces(filtered);
    }
  }, [searchQuery, pieces]);

  const fetchFolderDetails = async () => {
    try {
      const folderDoc = await getDoc(doc(db, "folders", folderId));
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name || "Untitled Folder");
      }
    } catch (error) {
      console.error("Error fetching folder details:", error);
    }
  };

  const isRequestStillValid = (requestedAt, expirationHours = 24) => {
    const now = new Date();
    const requestTime = new Date(requestedAt);
    const expirationTime = new Date(
      requestTime.getTime() + expirationHours * 60 * 60 * 1000
    );
    return now < expirationTime;
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDocs(
        collection(db, "folders", folderId, "files")
      );
      const fileData = [];
      const requestStatusesMap = new Map();

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.fileRef) {
          const fileDoc = await getDoc(
            typeof data.fileRef === "string"
              ? doc(db, data.fileRef)
              : data.fileRef
          );

          if (fileDoc.exists()) {
            const fileInfo = fileDoc.data();

            // Determine request status for current user
            if (user && user.uid && Array.isArray(fileInfo.accessRequests)) {
              const userRequests = fileInfo.accessRequests.filter(
                (r) => r.userId === user.uid && r.requestedAt
              );

              if (userRequests.length > 0) {
                const mostRecent = userRequests.sort(
                  (a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)
                )[0];

                if (
                  mostRecent &&
                  ["pending", "approved", "rejected"].includes(
                    mostRecent.status
                  ) &&
                  isRequestStillValid(mostRecent.requestedAt)
                ) {
                  requestStatusesMap.set(fileDoc.id, mostRecent.status); // "pending", "approved", "rejected"
                }
              }
            }

            fileData.push({
              id: fileDoc.id,
              ...fileDoc.data(),
              length: fileDoc.data().length || "Unknown",
              attributes: fileDoc.data().attributes || [],
            });
          }
        }
      }

      setPieces(fileData);
      setFilteredPieces(fileData);
      setRequestStatuses(requestStatusesMap);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestAccess = async (fileId) => {
    try {
      const fileRef = doc(db, "files", fileId);
      const newRequest = {
        userId: user.uid,
        requestedAt: new Date().toISOString(),
        status: "pending",
        userName:
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email,
        requestType: "view",
      };

      await updateDoc(fileRef, {
        accessRequests: arrayUnion(newRequest),
      });

      // Update local requestStatuses so button changes immediately
      setRequestStatuses((prev) => {
        const updated = new Map(prev);
        updated.set(fileId, "pending");
        return updated;
      });
    } catch (error) {
      console.error("Error requesting access:", error);
    }
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-gray-800">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">Please log in to access this page.</p>
          <Link href="/">
            <button className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900">      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Header with Search Bar */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search pieces..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">{folderName}</h1>
              <p className="text-gray-600 mt-1">Available Pieces</p>
            </div>
            <Link href="/viewPieces">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg">
                Back to Folders
              </button>
            </Link>
          </div>

          {/* Status info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="flex items-center text-blue-800">
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Request access to pieces you&apos;d like to perform. Once
              approved, they&apos;ll appear in your &quot;Requested Pieces&quot;
              section.
            </p>
          </div>

          {filteredPieces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPieces.map((piece) => {
                const status = requestStatuses.get(piece.id);
                const isDisabled =
                  status === "pending" ||
                  status === "approved" ||
                  status === "rejected";

                return (
                  <div
                    key={piece.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 flex flex-col h-full"
                  >
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center mb-3">
                        <div className="p-2 rounded-lg mr-3 bg-blue-100 text-blue-600">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
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
                        <h2 className="text-xl font-semibold">
                          {piece.fileName}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {piece.length && (
                          <span className="px-2 py-1 bg-blue-100 text-xs font-medium rounded text-blue-800">
                            {piece.length}
                          </span>
                        )}

                        {piece.attributes &&
                          piece.attributes.map((attr, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-xs font-medium rounded text-gray-800"
                            >
                              {attr}
                            </span>
                          ))}
                      </div>

                      <p className="text-gray-600 mb-6 text-sm">
                        {piece.description || "No description provided."}
                      </p>

                      <button
                        onClick={() => requestAccess(piece.id)}
                        disabled={isDisabled}
                        className={`mt-auto w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isDisabled
                            ? "bg-gray-100 text-blue-600 border border-blue-200 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {status === "approved" ? (
                          <div className="flex items-center justify-center">
                            ✅ Access Approved
                          </div>
                        ) : status === "rejected" ? (
                          <div className="flex items-center justify-center">
                            ❌ Request Declined
                          </div>
                        ) : status === "pending" ? (
                          <div className="flex items-center justify-center">
                            ⏳ Request Submitted
                          </div>
                        ) : (
                          "Request Access"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl text-center shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400 mb-4"
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
              <p className="text-xl text-blue-800 mb-4">No pieces found</p>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? "Try adjusting your search."
                  : "This folder is currently empty."}
              </p>
              <Link href="/viewPieces">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-all font-medium">
                  Return to Folders
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
