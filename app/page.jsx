"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "./firebase/firebase"; // Adjust the path as necessary
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
  doc as docRef,
} from "firebase/firestore";
import Link from "next/link";
import { useUser } from "@/src/context/UserContext";
import UploadMyFilesModal from "@/components/UploadMyFilesModal";
import MyFilesGroupedSection from "@/components/MyFilesGroupedSection"; // at the top
import { useLayout } from "@/src/context/LayoutContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import SearchHeader from "@/components/SearchHeader";
import TeamFileUpload from "@/components/TeamFileUpload";

export default function Home() {
  const { user, loading, toggleFavorite, fetchMyFiles } = useUser();
  const { setActivePage } = useLayout();
  const [folders, setFolders] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAscending, setIsAscending] = useState(true); // State for sorting direction
  const [activeTab, setActiveTab] = useState(null); // Default tab is "All Files"
  const allFolders = user?.allFolders || [];
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [allFilesWithUploader, setAllFilesWithUploader] = useState([]);
  const [loadingAllFiles, setLoadingAllFiles] = useState(false);
  const hasFetchedAllFiles = useRef(false); // prevent refetch loop
  const [teamFiles, setTeamFiles] = useState([]);
  const [loadingTeamFiles, setLoadingTeamFiles] = useState(false);
  const [newTeamFilesCount, setNewTeamFilesCount] = useState(0);
  const [selectedColor, setSelectedColor] = useState("bg-blue-500");
  const [userLastSeen, setUserLastSeen] = useState(null);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const hasInitRun = useRef(false);

  // track previous tab so we can clear ONLY when leaving “team”
  const prevTab = useRef(null);

  // ── INITIAL DASHBOARD LOAD ──
  useEffect(() => {
    // only run once, right after `user` becomes available
    if (!user || hasInitRun.current) return;
    hasInitRun.current = true;
    setInitialLoading(true);

    const init = async () => {
      try {
        // 1️⃣ Load “My Pieces”
        await fetchMyFiles();

        // 2️⃣ Load “Team Files” (no badge count on init)
        await fetchTeamFiles({ withCount: false });

        // 3️⃣ Load “All Files” for admins
        if (user.role === "admin" && !hasFetchedAllFiles.current) {
          hasFetchedAllFiles.current = true;
          const allFiles = [];
          const userCache = {};

          // ► Files inside folders
          const foldersSnap = await getDocs(collection(db, "folders"));
          for (const folderDoc of foldersSnap.docs) {
            const folderId = folderDoc.id;
            const folderName = folderDoc.data().name;
            const filesSnap = await getDocs(
              collection(db, "folders", folderId, "files")
            );

            for (const entry of filesSnap.docs) {
              const path = entry.data().fileRef?.path;
              if (!path) continue;
              const fileSnap = await getDoc(doc(db, path));
              if (!fileSnap.exists()) continue;
              const data = fileSnap.data();
              if (data.originalFileId) continue;

              // uploader lookup
              let uploader = { email: "Unknown" };
              if (data.uploadedBy) {
                if (userCache[data.uploadedBy]) {
                  uploader = userCache[data.uploadedBy];
                } else {
                  const uSnap = await getDoc(doc(db, "users", data.uploadedBy));
                  if (uSnap.exists()) {
                    uploader = {
                      email: uSnap.data().email || "Unknown",
                      firstName: uSnap.data().firstName || "",
                      lastName: uSnap.data().lastName || "",
                    };
                    userCache[data.uploadedBy] = uploader;
                  }
                }
              }

              allFiles.push({
                ...data,
                fileId: fileSnap.id,
                folderId,
                folderName,
                uploader,
              });
            }
          }

          // ► Ungrouped files
          const globalSnap = await getDocs(collection(db, "files"));
          for (const fileDoc of globalSnap.docs) {
            const data = fileDoc.data();
            if (data.folderId || data.originalFileId) continue;

            let uploader = { email: "Unknown" };
            if (data.uploadedBy) {
              if (userCache[data.uploadedBy]) {
                uploader = userCache[data.uploadedBy];
              } else {
                const uSnap = await getDoc(doc(db, "users", data.uploadedBy));
                if (uSnap.exists()) {
                  uploader = {
                    email: uSnap.data().email || "Unknown",
                    firstName: uSnap.data().firstName || "",
                    lastName: uSnap.data().lastName || "",
                  };
                  userCache[data.uploadedBy] = uploader;
                }
              }
            }

            allFiles.push({
              ...data,
              fileId: fileDoc.id,
              folderId: null,
              folderName: "Unassigned",
              uploader,
            });
          }

          setAllFilesWithUploader(allFiles);
        }
      } catch (error) {
        console.error("Dashboard init failed:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    init();
  }, [user]);

  useEffect(() => {
    setActivePage("dashboard"); // ✅ update current page
  }, []);

  useEffect(() => {
    if (!activeTab && user) {
      setActiveTab(user.role === "admin" ? "all" : "my");
    }
  }, [user, activeTab]);

  // ── At the top of Home(), after your useState calls ──

  // now change computeNewCount to use that state:
  const computeNewCount = (files) => {
    if (!lastSeenLoaded) return; // wait till we’ve loaded the timestamp
    if (!userLastSeen) {
      // never seen => everything is new
      setNewTeamFilesCount(files.length);
    } else {
      setNewTeamFilesCount(
        files.filter((f) => f.createdAt.toDate() > userLastSeen).length
      );
    }
  };

  // fetchTeamFiles now takes a flag: do we want to update the badge?
  const fetchTeamFiles = async ({ withCount = true } = {}) => {
    setLoadingTeamFiles(true);
    try {
      const snap = await getDocs(collection(db, "teamFiles"));
      const files = snap.docs.map((d) => ({ fileId: d.id, ...d.data() }));
      setTeamFiles(files);
      if (withCount) computeNewCount(files);
    } catch (e) {
      console.error("Error loading team files:", e);
    } finally {
      setLoadingTeamFiles(false);
    }
  };

  // when we leave the Team tab, then clear highlights & persist lastSeen
  useEffect(() => {
    if (prevTab.current === "team" && activeTab !== "team" && user) {
      // clear the badge/highlight
      setNewTeamFilesCount(0);

      // write “lastSeenTeamFiles = now” so future visits won’t highlight old files
      updateDoc(docRef(db, "users", user.uid), {
        lastSeenTeamFiles: serverTimestamp(),
      }).catch(console.error);
    }
    // update prevTab for next render
    prevTab.current = activeTab;
  }, [activeTab, user]);

  // Subscribe to users/{uid} so we always have the current lastSeenTeamFiles
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      docRef(db, "users", user.uid),
      (snap) => {
        const data = snap.data() || {};
        setUserLastSeen(
          data.lastSeenTeamFiles ? data.lastSeenTeamFiles.toDate() : null
        );
        setLastSeenLoaded(true);
      },
      (err) => console.error("user doc listen failed", err)
    );
    return () => unsub();
  }, [user]);

  if (loading || initialLoading) {
    return <LoadingSpinner />;
  }

  const handleSortByName = () => {
    const sortedFolders = [...folders].sort((a, b) => {
      if (isAscending) {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
    setFolders(sortedFolders);
    setIsAscending(!isAscending); // Toggle the sorting order
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Folder name cannot be empty.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "folders"), {
        name: newFolderName,
        createdAt: new Date().toISOString(),
        color: selectedColor,
      });
      setFolders([
        ...folders,
        {
          id: docRef.id,
          name: newFolderName,
          createdAt: new Date().toISOString(),
          color: selectedColor,
        },
      ]);
      setIsFolderModalOpen(false);
      setNewFolderName(""); // Reset folder name input
    } catch (error) {
      console.error("Error creating new folder:", error);
    }
  };

  const handleAssignToFolder = async (fileId, folderId) => {
    try {
      // 1. Update the file's `folderId` field in the main files collection
      const fileRef = doc(db, "files", fileId);
      await updateDoc(fileRef, { folderId });

      // 2. Create reference in the folder's subcollection
      await setDoc(doc(db, "folders", folderId, "files", fileId), {
        fileRef: `/files/${fileId}`,
      });

      // 3. Optionally: Refresh table or just update state locally
      setAllFilesWithUploader((prev) =>
        prev.map((f) =>
          f.fileId === fileId
            ? {
                ...f,
                folderId,
                folderName:
                  user.allFolders.find((fld) => fld.id === folderId)?.name ||
                  "Unknown",
              }
            : f
        )
      );

      console.log(`File ${fileId} assigned to folder ${folderId}`);
    } catch (error) {
      console.error("Error assigning file to folder:", error);
    }
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-mainBg text-gray-900 overflow-auto">
      {/* Main Content Area */}
      {user && (
        <div className="flex-1 overflow-y-auto h-screen">
          {/* Header with Search Bar */}
          <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
            <SearchHeader />
          </header>

          {/* Content Area */}
          <div className="max-w-7xl mx-auto px-4 py-6 w-full overflow-x-hidden">
            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200">
              <div className="flex space-x-8">
                {user?.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`pb-4 px-1 font-medium text-sm ${
                      activeTab === "all"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    All Folders
                  </button>
                )}

                {user?.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("allFiles")}
                    className={`pb-4 px-1 font-medium text-sm ${
                      activeTab === "allFiles"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    All Files
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("my")}
                  className={`pb-4 px-1 font-medium text-sm ${
                    activeTab === "my"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  My Pieces
                </button>
                <button
                  onClick={() => setActiveTab("team")}
                  className={`pb-4 px-1 font-medium text-sm ${
                    activeTab === "team"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Team Files
                  {newTeamFilesCount > 0 && (
                    <span
                      className="ml-1 inline-flex items-center justify-center
                 px-2 py-0.5 rounded-full text-xs font-medium
                 bg-red-500 text-white"
                    >
                      {newTeamFilesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("favorites")}
                  className={`pb-4 px-1 font-medium text-sm ${
                    activeTab === "favorites"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Favorites
                </button>
              </div>
            </div>
            {/* All Folders Tab Content */}
            {activeTab === "all" && user?.role === "admin" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    All Folders
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSortByName}
                      className="text-sm text-gray-500 flex items-center"
                    >
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
                          d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                        />
                      </svg>
                      Sort {isAscending ? "A-Z ↑" : "Z-A ↓"}
                    </button>
                  </div>
                </div>

                {/* Folders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...allFolders]
                    .sort((a, b) =>
                      isAscending
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name)
                    )
                    .map((folder) => (
                      <Link
                        key={folder.id}
                        href={`/folders/${folder.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <div
                          key={folder.id}
                          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden hover:-translate-y-1 transition-transform duration-200"
                        >
                          <div
                            className={`h-2 ${folder.color || "bg-blue-500"}`}
                          ></div>
                          <div className="p-5">
                            <div className="flex justify-between">
                              <div className="flex items-center">
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
                                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {folder.name}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    Created:{" "}
                                    {folder.createdAt?.seconds
                                      ? new Date(
                                          folder.createdAt.seconds * 1000
                                        ).toLocaleDateString()
                                      : new Date(
                                          folder.createdAt
                                        ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  toggleFavorite(folder.id);
                                }}
                                className={`text-gray-400 hover:${
                                  user.favoriteFolders.includes(folder.id)
                                    ? "text-red-500"
                                    : "text-gray-500"
                                }`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5"
                                  fill={
                                    user.favoriteFolders.includes(folder.id)
                                      ? "currentColor"
                                      : "none"
                                  }
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}

                  {/* Create new folder card */}
                  <div
                    onClick={() => setIsFolderModalOpen(true)}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
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
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      Create New Folder
                    </h3>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "allFiles" && user?.role === "admin" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    All Files
                  </h2>
                  <p className="text-gray-500">
                    See every file uploaded by users
                  </p>
                </div>

                {loadingAllFiles ? (
                  <p>Loading files...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-2 text-left border border-gray-300">
                            File Name
                          </th>
                          <th className="px-4 py-2 text-left border border-gray-300">
                            Uploaded By
                          </th>
                          <th className="px-4 py-2 text-left border border-gray-300">
                            Folder
                          </th>
                          <th className="px-4 py-2 text-left border border-gray-300">
                            View
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allFilesWithUploader.filter(
                          (f) => !f.folderId && !f.originalFileId
                        ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-sm text-gray-500 italic py-6"
                            >
                              No files have been uploaded outside of a folder.
                            </td>
                          </tr>
                        ) : (
                          allFilesWithUploader
                            .filter(
                              (file) => !file.folderId && !file.originalFileId
                            )
                            .map((file, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 border border-gray-200">
                                  {file.fileName}
                                </td>
                                <td className="px-4 py-2 border border-gray-200">
                                  {file.uploader?.firstName ||
                                    file.uploader?.email ||
                                    "Unknown"}
                                </td>
                                <td className="px-4 py-2 border border-gray-200">
                                  <select
                                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                                    onChange={(e) =>
                                      handleAssignToFolder(
                                        file.fileId,
                                        e.target.value
                                      )
                                    }
                                    defaultValue=""
                                  >
                                    <option value="" disabled>
                                      Assign to folder...
                                    </option>
                                    {user.allFolders.map((folder) => (
                                      <option key={folder.id} value={folder.id}>
                                        {folder.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-2 border border-gray-200">
                                  <Link
                                    href={`/viewDocuments/null/${file.fileId}`}
                                    className="text-blue-600 hover:underline"
                                  >
                                    View
                                  </Link>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {/* My Pieces Tab Content */}
            {activeTab === "my" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    My Pieces
                  </h2>
                  <p className="text-gray-500">
                    Manage your personal pieces and performances
                  </p>
                </div>

                {/* Upload area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white mb-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    Drag and drop pieces to upload
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium inline-flex items-center transition-colors"
                  >
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Select Files
                  </button>
                </div>

                {/* Files list */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden ">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between ">
                    <h3 className="text-2xl font-medium text-gray-900">
                      Your Pieces
                    </h3>
                  </div>

                  {/* Your MyFilesSection component */}

                  <MyFilesGroupedSection
                    myFiles={user?.myFiles || []}
                    previousFiles={user?.previousFiles || []}
                    requestedFiles={user?.requestedFiles || []}
                  />
                </div>
              </div>
            )}

            {activeTab === "team" && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Team Files
                  </h2>
                  <p className="text-gray-500">View team-related documents</p>
                </div>

                {/* upload component */}
                {user?.role === "admin" && (
                  <TeamFileUpload
                    onUploadSuccess={() => fetchTeamFiles({ withCount: false })}
                  />
                )}

                {/* list */}
                {loadingTeamFiles ? (
                  <LoadingSpinner />
                ) : teamFiles.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No team files have been uploaded yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {teamFiles.map((file) => {
                      // determine if this file is “new”
                      const isNew = !userLastSeen
                        ? true
                        : file.createdAt.toDate() > userLastSeen;

                      return (
                        <li
                          key={file.fileId}
                          className={`
                p-4 rounded shadow-sm flex justify-between items-center
                ${isNew ? "bg-yellow-50 border border-yellow-200" : "bg-white"}
              `}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{file.fileName}</span>
                            {isNew && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                                New
                              </span>
                            )}
                          </div>
                          <a
                            href={file.downloadURL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Folder
              </h2>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label
                htmlFor="folderName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Folder Name
              </label>
              <input
                id="folderName"
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter folder name"
                autoFocus
              />
            </div>

            {/* Optional: Add folder category or color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder Color (Optional)
              </label>
              <div className="flex space-x-2">
                {[
                  "bg-blue-500",
                  "bg-green-500",
                  "bg-amber-500",
                  "bg-red-500",
                  "bg-purple-500",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full ${color} border-2 ${
                      selectedColor === color
                        ? "border-black"
                        : "border-transparent"
                    }`}
                    type="button"
                  ></button>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewFolder}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
      {isUploadModalOpen && (
        <UploadMyFilesModal
          isOpen={isUploadModalOpen}
          closeModal={() => setIsUploadModalOpen(false)}
          onClose={() => setIsUploadModalOpen(false)}
          user={user}
          onUploadSuccess={fetchMyFiles}
        />
      )}
    </main>
  );
}
