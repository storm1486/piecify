// components/SearchHeader.jsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDocs, getDoc, query, where, documentId } from "firebase/firestore";
import { useUser } from "@/src/context/UserContext";
import { useLayout } from "@/src/context/LayoutContext";
import { useOrganization } from "@/src/context/OrganizationContext";
import { getOrgCollection, getOrgDoc } from "@/src/utils/firebaseHelpers";

export default function SearchHeader() {
  const { user, isPrivileged } = useUser();
  const isPrivilegedUser = isPrivileged();
  const { setActivePage } = useLayout();
  const router = useRouter();
  const { orgId } = useOrganization();

  const extraMessage = "this could take up to a minute";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [matchedMembers, setMatchedMembers] = useState([]);

  // separate spinners
  const [searching, setSearching] = useState(false);

  const [userFiles, setUserFiles] = useState([]); // non-admin file list
  const [teamMembers, setTeamMembers] = useState([]); // everyone can search team
  const [teamLoaded, setTeamLoaded] = useState(false); // only show "no team" after loaded

  const debounceRef = useRef(null);
  const mountedRef = useRef(true);
  const searchSeq = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch user's files for non-admins
  useEffect(() => {
    const run = async () => {
      if (!user || !orgId || isPrivilegedUser) {
        setUserFiles([]); // clear when role/org switches
        return;
      }

      const userFileObjs = Array.isArray(user.myFiles) ? user.myFiles : [];
      const out = [];

      for (const fileObj of userFileObjs) {
        const fileRef = fileObj?.fileRef
          ? fileObj.fileRef
          : fileObj?.fileId
          ? getOrgDoc(orgId, "files", fileObj.fileId)
          : null;

        if (!fileRef) continue;
        try {
          const snap = await getDoc(fileRef);
          if (snap.exists()) {
            out.push({ ...snap.data(), fileId: snap.id });
          }
        } catch (err) {
          console.error("Error fetching user file:", err);
        }
      }

      if (mountedRef.current) setUserFiles(out);
    };

    run();
  }, [user, orgId, isPrivilegedUser]);

  // Fetch all team members (any role)
  useEffect(() => {
    const run = async () => {
      setTeamLoaded(false);
      if (!user || !orgId) {
        setTeamMembers([]);
        setTeamLoaded(true);
        return;
      }
      try {
        const usersSnapshot = await getDocs(getOrgCollection(orgId, "users"));
        const users = usersSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        if (mountedRef.current) {
          setTeamMembers(users);
          setTeamLoaded(true);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
        if (mountedRef.current) {
          setTeamMembers([]);
          setTeamLoaded(true);
        }
      }
    };

    run();
  }, [user, orgId]);

  // --- helper: chunk an array into size N ---
  function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  // --- Admin search (faster): collect fileIds from folder subcollections, then batch fetch top-level /files docs ---
  const adminSearchFiles = useCallback(
    async (queryWords) => {
      // Read all folders first
      const foldersSnapshot = await getDocs(getOrgCollection(orgId, "folders"));

      // 1) collect fileIds and a map fileId -> {folderId, folderName}
      const fileIdToFolder = new Map();

      // Fetch each folder's files subcollection and record ids
      await Promise.all(
        foldersSnapshot.docs.map(async (folderDoc) => {
          const folderId = folderDoc.id;
          const folderName = folderDoc.data()?.name || "Unnamed Folder";
          const filesSnapshot = await getDocs(
            getOrgCollection(orgId, "folders", folderId, "files")
          );
          filesSnapshot.docs.forEach((fDoc) => {
            fileIdToFolder.set(fDoc.id, { folderId, folderName });
          });
        })
      );

      const allFileIds = Array.from(fileIdToFolder.keys());
      if (allFileIds.length === 0) return [];

      // 2) batch fetch top-level file docs with documentId IN (<=10 per batch)
      const batches = chunk(allFileIds, 10);
      const results = [];

      for (const ids of batches) {
        const q = query(
          getOrgCollection(orgId, "files"),
          where(documentId(), "in", ids)
        );
        const snap = await getDocs(q);

        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const fileName = (data.fileName || "").toLowerCase();
          const matches = queryWords.some((w) => fileName.includes(w));
          if (!matches) return;

          const folderMeta = fileIdToFolder.get(docSnap.id);
          results.push({
            ...data,
            id: docSnap.id,
            folderId: folderMeta?.folderId,
            folderName: folderMeta?.folderName || "Unnamed Folder",
          });
        });
      }

      return results;
    },
    [orgId]
  );

  const doSearch = useCallback(
    async (rawQuery) => {
      if (!orgId) return;

      const mySeq = ++searchSeq.current;
      const queryText = rawQuery.trim();
      const queryWords = queryText.toLowerCase().split(/\s+/).filter(Boolean);

      // reset states on empty
      if (!queryText) {
        setSearchResults([]);
        setMatchedMembers([]);
        setSearching(false);
        return;
      }

      // start both spinners
      setSearching(true);

      try {
        // FILES
        let filesToShow = [];
        if (mySeq !== searchSeq.current || !mountedRef.current) return;
        if (isPrivilegedUser) {
          // fast admin search with batched reads
          filesToShow = await adminSearchFiles(queryWords);
        } else {
          // Non-admin: search only user's fetched files (local filter)
          filesToShow = userFiles.filter((f) => {
            const name = (f.fileName || "").toLowerCase();
            return queryWords.some((w) => name.includes(w));
          });
        }

        // TEAM (local filter)
        const members = teamMembers.filter((member) => {
          const fullName = `${member.firstName || ""} ${member.lastName || ""}`
            .trim()
            .toLowerCase();
          const email = (member.email || "").toLowerCase();
          return queryWords.some(
            (w) => fullName.includes(w) || email.includes(w)
          );
        });

        if (!mountedRef.current) return;

        setSearchResults(filesToShow);
        setMatchedMembers(members);
      } catch (err) {
        console.error("Search error:", err);
        if (mySeq === searchSeq.current && mountedRef.current) {
          setSearchResults([]);
          setMatchedMembers([]);
        }
      } finally {
        if (mySeq === searchSeq.current && mountedRef.current) {
          setSearching(false);
        }
      }
    },
    [orgId, isPrivilegedUser, adminSearchFiles, teamMembers, userFiles]
  );

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val);
    }, 250);
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
            placeholder="Search for pieces and teammates…"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          {searchQuery && (
            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-72 overflow-y-auto z-50">
              {searching ? (
                <p className="p-4 text-gray-500">Searching… ({extraMessage})</p>
              ) : (
                <>
                  {/* FILES */}
                  <div>
                    <p className="px-3 py-2 text-xs text-gray-500 uppercase bg-gray-50">
                      Files
                    </p>
                    {searchResults.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {searchResults.map((file, idx) => (
                          <li
                            key={`${file.id || file.fileId}-${idx}`}
                            className="p-3 hover:bg-gray-100 cursor-pointer"
                          >
                            {isPrivilegedUser ? (
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
                                  <span className="font-medium">
                                    {file.fileName}
                                  </span>
                                </div>
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-gray-500">
                        No files match your search.
                      </p>
                    )}
                  </div>

                  {/* TEAM MEMBERS */}
                  <div className="border-t border-gray-200">
                    <p className="px-3 py-2 text-xs text-gray-500 uppercase bg-gray-50">
                      Team Members
                    </p>
                    {matchedMembers.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {matchedMembers.map((member) => (
                          <li
                            key={member.id}
                            onClick={() => {
                              setActivePage?.("team");
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
                    ) : teamLoaded ? (
                      <p className="p-4 text-gray-500">
                        No team members matched.
                      </p>
                    ) : (
                      <p className="p-4 text-gray-500">Loading team…</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
