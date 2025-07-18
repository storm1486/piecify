// components/SearchHeader.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";
import { useLayout } from "@/src/context/LayoutContext";
import { db } from "@/app/firebase/firebase";

export default function SearchHeader() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [matchedMembers, setMatchedMembers] = useState([]);
  const { setActivePage } = useLayout();
  const router = useRouter();

  // Fetch user's files for non-admins
  useEffect(() => {
    const fetchUserFiles = async () => {
      if (!user || user.role === "admin") return;
      const userFileRefs = user.myFiles || [];
      const files = [];

      for (const fileRef of userFileRefs) {
        try {
          const fileSnap = await getDoc(doc(db, fileRef.path));
          if (fileSnap.exists()) {
            files.push({ ...fileSnap.data(), fileId: fileSnap.id });
          }
        } catch (err) {
          console.error("Error fetching user file:", err);
        }
      }

      setUserFiles(files);
    };

    fetchUserFiles();
  }, [user]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return;
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTeamMembers(users);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchTeamMembers();
  }, [user]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearching(true);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const queryWords = query.toLowerCase().split(/\s+/);

    try {
      if (user?.role === "admin") {
        const foldersSnapshot = await getDocs(collection(db, "folders"));
        const allFiles = [];

        for (const folderDoc of foldersSnapshot.docs) {
          const folderId = folderDoc.id;
          const folderName = folderDoc.data().name;

          const filesSnapshot = await getDocs(
            collection(db, "folders", folderId, "files")
          );

          for (const fileDoc of filesSnapshot.docs) {
            const fileId = fileDoc.id;

            try {
              const fileSnap = await getDoc(doc(db, "files", fileId));
              if (!fileSnap.exists()) continue;

              const fileData = fileSnap.data();
              const fileName = fileData.fileName?.toLowerCase() || "";

              if (queryWords.some((word) => fileName.includes(word))) {
                allFiles.push({
                  ...fileData,
                  id: fileSnap.id,
                  folderId,
                  folderName,
                });
              }
            } catch (err) {
              console.warn("❌ Failed to fetch file:", fileId, err);
            }
          }
        }

        setSearchResults(allFiles);
        const matched = teamMembers.filter((member) => {
          const fullName = `${member.firstName || ""} ${
            member.lastName || ""
          }`.toLowerCase();
          const email = member.email?.toLowerCase() || "";
          return queryWords.some(
            (word) => fullName.includes(word) || email.includes(word)
          );
        });
        setMatchedMembers(matched);
      } else {
        const filtered = userFiles.filter((f) => {
          const fileName = f.fileName?.toLowerCase() || "";
          return queryWords.some((word) => fileName.includes(word));
        });
        setSearchResults(filtered);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative w-full">
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
            placeholder="Search for pieces, folders, and more..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />

          {searchQuery && (
            <div className="absolute top-full left-0 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
              {searching ? (
                <p className="p-4 text-gray-500">Searching...</p>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {searchResults.map((file, index) => (
                    <li
                      key={index}
                      className="p-3 hover:bg-gray-100 cursor-pointer"
                    >
                      {user.role === "admin" ? (
                        <Link
                          href={`/viewDocuments/${file.folderId}/${file.id}`}
                          className="block"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
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
                              <span className="font-medium">
                                {file.fileName}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {file.folderName || "Unnamed Folder"}
                            </span>
                          </div>
                        </Link>
                      ) : (
                        <Link
                          href={`/viewFile/${file.fileId}`}
                          className="block"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{file.fileName}</span>
                          </div>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-gray-500">No files match your search.</p>
              )}
              {matchedMembers.length > 0 && (
                <div className="border-t border-gray-200">
                  <p className="px-3 py-2 text-xs text-gray-400 uppercase bg-gray-50">
                    Team Members
                  </p>
                  <ul className="divide-y divide-gray-200">
                    {matchedMembers.map((member) => (
                      <li
                        key={member.id}
                        onClick={() => {
                          setActivePage("team");
                          router.push(`/user-documents/${member.id}`);
                        }}
                        className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {member.email}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
