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
import SearchHeader from "@/components/SearchHeader";
import { sortedAttributeOptions } from "@/src/componenets/AttributeIcons";

export default function ViewPieces() {
  const { folderId } = useParams();
  const { user, loading } = useUser();
  const [pieces, setPieces] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPieces, setFilteredPieces] = useState([]);
  const [requestStatuses, setRequestStatuses] = useState(new Map());
  const [lengthFilter, setLengthFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [availableLengths, setAvailableLengths] = useState([]);
  const tagOptions = sortedAttributeOptions.map((opt) => opt.value);

  useEffect(() => {
    if (folderId && !loading && user) {
      fetchFolderDetails();
      fetchFiles();
    }
  }, [folderId, loading, user]);

  useEffect(() => {
    const lengths = Array.from(new Set(pieces.map((p) => p.length)))
      .filter((l) => !!l) // drop falsy
      .sort();
    setAvailableLengths(lengths);
  }, [pieces]);

  useEffect(() => {
    const filtered = pieces.filter((piece) => {
      const matchesSearch = piece.fileName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesLength =
        lengthFilter === "all" || piece.length === lengthFilter;
      const matchesTag =
        tagFilter === "all" || piece.attributes.includes(tagFilter);
      return matchesSearch && matchesLength && matchesTag;
    });
    setFilteredPieces(filtered);
  }, [searchQuery, pieces, lengthFilter, tagFilter]);

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
          <SearchHeader />
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

          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              {/* Length filter */}
              <div className="relative">
                <label
                  htmlFor="length-filter"
                  className="mr-2 font-medium text-gray-700"
                >
                  Length:
                </label>
                <div className="relative inline-block">
                  <select
                    id="length-filter"
                    value={lengthFilter}
                    onChange={(e) => setLengthFilter(e.target.value)}
                    className="bg-gray-50 text-gray-700 py-2 pl-3 pr-10 rounded border border-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Lengths</option>
                    {availableLengths.map((len) => (
                      <option key={len} value={len}>
                        {len}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Tag filter */}
              <div className="relative">
                <label
                  htmlFor="tag-filter"
                  className="mr-2 font-medium text-gray-700"
                >
                  Tag:
                </label>
                <div className="relative inline-block">
                  <select
                    id="tag-filter"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="bg-gray-50 text-gray-700 py-2 pl-3 pr-10 rounded border border-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Tags</option>
                    {tagOptions.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Clear filters */}
              <button
                onClick={() => {
                  setLengthFilter("all");
                  setTagFilter("all");
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>

              {/* Count */}
              <span className="ml-auto text-sm text-gray-500">
                Showing {filteredPieces.length} of {pieces.length} pieces
              </span>
            </div>
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
                        {piece.pieceDescription || "No description provided."}
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
