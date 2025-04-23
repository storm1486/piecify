"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import Link from "next/link";
import { db } from "../../firebase/firebase";
import { useUser } from "@/src/context/UserContext";
import UploadFileModal from "@/components/UploadFileModal";
import UserSearchSelect from "@/components/UserSearchSelect";
import FileSearchSelect from "@/components/FileSearchSelect";
import FileCard from "@/components/FileCard";
import TabButton from "@/components/TabButton";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function FolderPage() {
  const { folderId } = useParams();
  const router = useRouter();
  const { user, loading } = useUser();
  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [assignMessage, setAssignMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // State for managing spinner
  const [selectedUnassignUser, setSelectedUnassignUser] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [isAssignMode, setIsAssignMode] = useState(true); // ✅ Toggle Assign/Unassign
  const [activeTab, setActiveTab] = useState("all");
  const [hasChanged, setHasChanged] = useState(false);
  const [ownersMap, setOwnersMap] = useState({}); // Store fileId -> ownerName mapping

  // NEW: Length filter states
  const [lengthFilter, setLengthFilter] = useState("all"); // Default to showing all lengths
  const [assignLengthFilter, setAssignLengthFilter] = useState("all"); // Default to showing all lengths
  const [availableLengths, setAvailableLengths] = useState([]); // Store unique length values

  // Tag filter states
  const [tagFilter, setTagFilter] = useState("all");

  const tagOptions = [
    "Boy",
    "Girl",
    "Boy-Boy",
    "Girl-Girl",
    "Boy-Girl",
    "Novice Friendly",
  ];

  const filteredModalFiles =
    assignLengthFilter === "all"
      ? files
      : files.filter((file) => file.length === assignLengthFilter);

  useEffect(() => {
    if (files.length > 0) {
      fetchOwners();

      // NEW: Extract unique length values from files
      const lengths = new Set();
      files.forEach((file) => {
        if (file.length) {
          lengths.add(file.length);
        }
      });
      setAvailableLengths(Array.from(lengths).sort());
    }
  }, [files]); // Fetch owners and lengths only when files change

  useEffect(() => {
    // Fetch folder data when user and folderId are available
    if (!loading && user && folderId) {
      fetchFolderData();
    }

    // Fetch users when the modal is open and user is an admin
    if (user?.role === "admin") {
      fetchUsers();
    }
  }, [loading, user, folderId]); // ✅ Removed `files` dependency to prevent infinite loop

  const fetchOwners = async () => {
    try {
      const newOwnersMap = {};

      await Promise.all(
        files.map(async (file) => {
          if (file.currentOwner && file.currentOwner.length > 0) {
            const ownerId = file.currentOwner[0].userId;
            const ownerName = await fetchOwnerName(ownerId);
            newOwnersMap[file.id] = ownerName; // Store owner name
          }
        })
      );

      setOwnersMap(newOwnersMap); // Update owner names in state
    } catch (error) {
      console.error("Error fetching owner names:", error);
    }
  };

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
    }
  };

  const fetchUserFiles = async (userId) => {
    try {
      setUserFiles([]); // Reset before fetching

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error("User does not exist.");
        return;
      }

      const userData = userSnap.data();
      const fileRefs = userData.myFiles || [];

      const filePromises = fileRefs.map(async (fileEntry) => {
        if (!fileEntry.fileRef) return null; // Ensure fileRef exists

        const fileDocRef = fileEntry.fileRef;
        const fileDocSnap = await getDoc(fileDocRef);

        return fileDocSnap.exists()
          ? {
              id: fileDocSnap.id,
              fileRef: fileEntry.fileRef, // ✅ Ensure fileRef is included
              ...fileDocSnap.data(),
            }
          : null;
      });

      const resolvedFiles = (await Promise.all(filePromises)).filter(
        (file) => file !== null
      );

      setUserFiles(resolvedFiles);
    } catch (error) {
      console.error("Error fetching user files:", error);
    }
  };

  const fetchFolderData = async () => {
    try {
      setIsLoading(true); // Start loading indicator

      const folderDoc = await getDoc(doc(db, "folders", folderId));
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name || "Untitled Folder");
      } else {
        setFolderName("Unknown Folder");
        console.error(`Folder with ID ${folderId} does not exist.`);
        return;
      }

      // Fetch files from the folder subcollection
      const filesSnapshot = await getDocs(
        collection(db, "folders", folderId, "files")
      );

      const filePromises = filesSnapshot.docs.map(async (fileDoc) => {
        const fileData = fileDoc.data();

        if (fileData.fileRef) {
          let fileRefDoc;

          if (typeof fileData.fileRef === "object") {
            // ✅ Properly resolve Firestore document reference
            fileRefDoc = await getDoc(fileData.fileRef);
          } else if (typeof fileData.fileRef === "string") {
            // Handle old case where `fileRef` is stored as a string path (fallback)
            fileRefDoc = await getDoc(doc(db, fileData.fileRef));
          }

          return fileRefDoc?.exists()
            ? { id: fileRefDoc.id, ...fileRefDoc.data() }
            : null;
        }

        return null; // Skip if there's no valid fileRef
      });

      const resolvedFiles = (await Promise.all(filePromises)).filter(
        (file) => file !== null
      );

      setFiles(
        resolvedFiles.sort((a, b) => a.fileName.localeCompare(b.fileName))
      );
    } catch (error) {
      console.error("Error fetching folder data:", error);
      setFileError("Failed to load folder data.");
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  const fetchOwnerName = async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        return userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData.email || "Unknown User"; // Fallback to email if name is missing
      }
    } catch (error) {
      console.error("Error fetching owner name:", error);
    }
    return "Unknown User"; // Default if not found
  };

  const handleToggleMode = () => {
    setIsAssignMode(!isAssignMode);

    // Reset state when switching modes
    setSelectedUser(null);
    setSelectedFile(null);
    setSelectedUnassignUser(null);
    setAssignMessage(null);
    setUserFiles([]);
  };

  const handleAssignFileToUser = async (userId, file) => {
    try {
      if (!userId || !file?.id) {
        console.error("Invalid user or file data.");
        return;
      }

      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        console.error("Selected user does not exist.");
        return;
      }

      const userData = userSnapshot.data();

      const topLevelFileRef = doc(db, "files", file.id);
      const fileSnapshot = await getDoc(topLevelFileRef);

      if (!fileSnapshot.exists()) {
        console.error("File does not exist in Firestore.");
        return;
      }

      const fileData = fileSnapshot.data();

      // ✅ Check if there is already a current owner
      if (fileData.currentOwner && fileData.currentOwner.length > 0) {
        const currentOwnerId = fileData.currentOwner[0].userId; // Get the current owner's ID

        // ✅ Fetch the current owner's user details
        const currentOwnerRef = doc(db, "users", currentOwnerId);
        const currentOwnerSnap = await getDoc(currentOwnerRef);

        let currentOwnerName = "Unknown User";
        if (currentOwnerSnap.exists()) {
          const currentOwnerData = currentOwnerSnap.data();
          currentOwnerName =
            currentOwnerData.firstName + " " + currentOwnerData.lastName ||
            currentOwnerData.email ||
            "Unknown User";
        }

        setAssignMessage({
          type: "error",
          text: `This file is already assigned to ${currentOwnerName}.`,
        });
        return; // ❌ Stop execution if the file has an owner
      }

      // ✅ New structure for assignment history (previouslyOwned)
      const assignmentEntry = {
        dateGiven: new Date().toISOString(),
        userId: user.uid, // The admin/assigner who is making the assignment
        assignedUser: userId, // The user receiving the file
      };

      // ✅ New structure for currentOwner (only one allowed)
      const currentOwnerEntry = {
        userId: userId, // The user receiving the file
        dateGiven: new Date().toISOString(), // Timestamp of assignment
      };

      console.log("Assigning file:", {
        fileName: file.fileName,
        assigner: user.uid,
        assignedTo: userId,
      });

      // ✅ Update the file document with the new `previouslyOwned` and `currentOwner` entry
      await updateDoc(topLevelFileRef, {
        previouslyOwned: arrayUnion(assignmentEntry),
        currentOwner: [currentOwnerEntry], // ✅ Overwrites to ensure only one currentOwner
      });

      // ✅ Assign file reference to the selected user
      const fileEntry = {
        fileRef: topLevelFileRef, // Store the document reference
        dateGiven: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        myFiles: arrayUnion(fileEntry),
      });

      // ✅ Keep the success message but reset fields
      setAssignMessage({
        type: "success",
        text: `File "${file.fileName}" successfully assigned to ${
          userData.name || userData.email || "this user"
        }.`,
      });

      setHasChanged(true); // ✅ Mark that an assignment occurred

      // ✅ Reset the user and file selection without clearing the message
      setSelectedUser(null);
      setSelectedFile(null);
    } catch (err) {
      console.error("❌ Error assigning file to user:", err);
      setAssignMessage({
        type: "error",
        text: "Failed to assign file. Please try again.",
      });
    }
  };

  const handleUnassignFile = async (userId, file) => {
    try {
      console.log("Attempting to unassign file:", file);

      if (!file || !file.fileRef) {
        console.error(
          "❌ Invalid file reference for unassignment. File:",
          file
        );
        return;
      }

      const userRef = doc(db, "users", userId);
      const fileRef =
        typeof file.fileRef === "object"
          ? file.fileRef // ✅ Keep it as a reference
          : doc(db, file.fileRef); // Handle old string paths (if needed)

      console.log("Resolved file reference:", fileRef.path);

      // ✅ Step 1: Remove file from `myFiles` in the user document
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const myFilesArray = Array.isArray(userData.myFiles)
          ? userData.myFiles
          : [];

        const updatedFiles = myFilesArray.filter(
          (entry) =>
            entry.fileRef?.id !== fileRef.id &&
            entry.fileRef?.path !== fileRef.path
        );

        await updateDoc(userRef, { myFiles: updatedFiles });
      }

      // ✅ Step 2: Remove user from `currentOwner` in the file document
      const fileSnap = await getDoc(fileRef);
      if (fileSnap.exists()) {
        const fileData = fileSnap.data();
        const currentOwnerArray = Array.isArray(fileData.currentOwner)
          ? fileData.currentOwner
          : [];

        const updatedCurrentOwner = currentOwnerArray.filter(
          (entry) => entry.userId !== userId
        );

        await updateDoc(fileRef, { currentOwner: updatedCurrentOwner });
      }

      setAssignMessage({
        type: "success",
        text: `File "${file.fileName}" successfully unassigned.`,
      });

      setHasChanged(true); // ✅ Mark that an unassignment occurred

      // ✅ Step 3: Refresh user files after unassigning
      fetchUserFiles(userId);
    } catch (error) {
      console.error("❌ Error unassigning file:", error);
    }
  };

  const handleFileClick = (fileId) => {
    router.push(`/viewDocuments/${folderId}/${fileId}`);
  };

  // Function to filter files by length
  const getFilteredFiles = () => {
    return files.filter((file) => {
      const lengthMatch =
        lengthFilter === "all" || file.length === lengthFilter;
      const tagMatch =
        tagFilter === "all" || (file.attributes || []).includes(tagFilter);
      return lengthMatch && tagMatch;
    });
  };

  // Get filtered files based on current filter
  const filteredFiles = getFilteredFiles();

  // Filter assigned and unassigned pieces based on length filter
  const assignedPieces = filteredFiles.filter(
    (file) => file.currentOwner && file.currentOwner.length > 0
  );
  const unassignedPieces = filteredFiles.filter(
    (file) => !file.currentOwner || file.currentOwner.length === 0
  );

  const handleClearFilters = () => {
    setLengthFilter("all");
    setTagFilter("all");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAssignMessage(null);

    // ✅ Refresh folder only if changes occurred
    if (hasChanged) {
      // ✅ Delay fetching folder data to allow Firestore to update
      setTimeout(() => {
        fetchFolderData();
      }, 500);
      setHasChanged(false); // Reset after refresh
    }
  };

  if (isLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mainBg text-white">
        <div className="bg-asideBg p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">Please log in to access this page.</p>
          <Link href="/login">
            <div className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Go to Login
            </div>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <main className="flex min-h-screen bg-mainBg text-white">
      <aside className="w-64 bg-asideBg p-4 shadow-lg">
        <Link href="/">
          <div className="block p-3 bg-blue-500 text-white rounded text-center hover:bg-blue-600 transition-colors mb-6">
            Home
          </div>
        </Link>

        <nav className="mt-8">
          <h3 className="text-lg font-medium mb-2 text-gray-400">Navigation</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/folders">
                <div className="flex items-center p-2 rounded hover:bg-gray-700 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-3"
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
                  All Folders
                </div>
              </Link>
            </li>
            <li>
              <Link href="/dashboard">
                <div className="flex items-center p-2 rounded hover:bg-gray-700 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Dashboard
                </div>
              </Link>
            </li>
          </ul>
        </nav>

        {user?.role === "admin" && (
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-2 text-gray-400">
              Admin Tools
            </h3>
            <button
              className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white p-2 rounded flex items-center justify-center transition-colors"
              onClick={() => setIsModalOpen(true)}
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
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Manage Assignments
            </button>
          </div>
        )}
      </aside>
      <section className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">{folderName || "Loading..."}</h1>

          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center transition-colors"
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload File
          </button>
        </div>

        <div className="flex space-x-4 border-b border-gray-700 mb-6">
          <TabButton
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
          >
            All Files
          </TabButton>
          <TabButton
            active={activeTab === "assign"}
            onClick={() => setActiveTab("assign")}
          >
            Assignments
          </TabButton>
        </div>

        {activeTab === "all" && (
          <>
            <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative">
                  <label htmlFor="length-filter" className="mr-2 font-medium">
                    Length:
                  </label>
                  <div className="relative inline-block">
                    <select
                      id="length-filter"
                      value={lengthFilter}
                      onChange={(e) => setLengthFilter(e.target.value)}
                      className="bg-gray-700 text-white py-2 pl-3 pr-10 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Lengths</option>
                      {availableLengths.map((length) => (
                        <option key={length} value={length}>
                          {length}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
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

                <div className="relative">
                  <label htmlFor="tag-filter" className="mr-2 font-medium">
                    Tag:
                  </label>
                  <div className="relative inline-block">
                    <select
                      id="tag-filter"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="bg-gray-700 text-white py-2 pl-3 pr-10 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Tags</option>
                      {tagOptions.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
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

                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
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
                  Clear Filters
                </button>

                {/* File count */}
                <span className="ml-auto text-sm text-gray-400">
                  Showing {filteredFiles.length} of {files.length} files
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Render Filtered Files */}
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onClick={() => handleFileClick(file.id)}
                    showOwner={
                      file.currentOwner && file.currentOwner.length > 0
                    }
                    ownerName={ownersMap[file.id]}
                  />
                ))
              ) : (
                <div className="col-span-full flex items-center justify-center h-32 border border-gray-700 rounded-lg">
                  <p className="text-gray-500">
                    No files found with the selected filter.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "assign" && (
          <div className="space-y-8">
            {/* Assignment Statistics Dashboard */}
            <div className="bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex space-x-8">
                  {/* Unassigned Stats */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-blue-500">
                      <span className="text-xl font-bold">
                        {unassignedPieces.length}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">Unassigned</p>
                  </div>

                  {/* Assigned Stats */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-green-600">
                      <span className="text-xl font-bold">
                        {assignedPieces.length}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">Assigned</p>
                  </div>
                </div>

                <div className="text-right">
                  <h3 className="text-gray-400 text-sm">Assignment Overview</h3>
                  <p className="text-lg">
                    Total pieces: {filteredFiles.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Unassigned Pieces Section */}
            <div>
              <div className="flex items-center mb-4">
                <h2 className="text-2xl font-bold">Unassigned Pieces</h2>
                <span className="ml-3 px-2 py-1 bg-gray-700 text-xs font-medium rounded-full">
                  {unassignedPieces.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {unassignedPieces.length > 0 ? (
                  unassignedPieces.map((file) => (
                    <div
                      key={file.id}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={() => handleFileClick(file.id)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-left w-full">
                          {file.fileName}
                        </span>

                        {/* Only show length as badge */}
                        {file.length && (
                          <div className="ml-2 px-2 py-1 bg-blue-500 text-xs font-semibold rounded-full whitespace-nowrap text-white">
                            {file.length}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center h-32 border border-gray-700 rounded-lg">
                    <p className="text-gray-500">No unassigned files found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Pieces Section */}
            <div>
              <div className="flex items-center mb-4">
                <h2 className="text-2xl font-bold">Assigned Pieces</h2>
                <span className="ml-3 px-2 py-1 bg-gray-700 text-xs font-medium rounded-full">
                  {assignedPieces.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {assignedPieces.length > 0 ? (
                  assignedPieces.map((file) => (
                    <div
                      key={file.id}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={() => handleFileClick(file.id)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-left w-full">
                          {file.fileName}
                        </span>

                        {file.length && (
                          <div className="ml-2 px-2 py-1 bg-blue-500 text-xs font-semibold rounded-full whitespace-nowrap text-white">
                            {file.length}
                          </div>
                        )}
                      </div>

                      {/* Only show owner information */}
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
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
                        {ownersMap[file.id] || "Loading..."}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center h-32 border border-gray-700 rounded-lg">
                    <p className="text-gray-500">No assigned files found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {user.role === "admin" && (
          <>
            {isModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                <div className="relative bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-[600px] max-w-full min-h-[450px] flex flex-col">
                  {/* Toggle Switch - Top Right */}
                  <div className="absolute top-4 right-4 flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!isAssignMode}
                        onChange={handleToggleMode} // ✅ Call function on toggle
                      />
                      <div className="w-12 h-6 bg-gray-400 dark:bg-gray-700 rounded-full peer-checked:bg-red-500 relative flex items-center transition-all">
                        {/* Assign Icon (Right - Swappable) */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`absolute right-1 w-4 h-4 transition-all ${
                            isAssignMode ? "text-white" : "text-gray-600"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                          />
                        </svg>

                        {/* Unassign Icon (Left - Swappable) */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`absolute left-1 w-4 h-4 transition-all ${
                            isAssignMode ? "text-gray-600" : "text-white"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                          />
                        </svg>

                        {/* Sliding Indicator (Moves Left/Right) */}
                        <div
                          className={`absolute top-1 h-4 w-4 bg-white border border-gray-300 rounded-full transition-transform ${
                            isAssignMode
                              ? "translate-x-1"
                              : "translate-x-[26px]"
                          }`}
                        ></div>
                      </div>
                    </label>
                  </div>

                  {/* Modal Title */}
                  <h2 className="text-2xl font-semibold mb-6 text-center">
                    {isAssignMode ? "Assign File" : "Unassign File"}
                  </h2>

                  {/* Assign Mode */}
                  {isAssignMode ? (
                    <div className="flex-1">
                      {/* User Selection with Search */}
                      <div className="mb-4 relative">
                        <UserSearchSelect
                          users={users}
                          onSelect={(userId, userObj) => {
                            setSelectedUser(userId);
                            setAssignMessage(null);
                          }}
                        />
                      </div>

                      {/* NEW: Add length filter to file selection in modal */}
                      <div className="mb-2">
                        <label
                          htmlFor="modal-length-filter"
                          className="text-sm font-medium mb-1 block"
                        >
                          Filter files by length:
                        </label>
                        <select
                          id="modal-length-filter"
                          value={assignLengthFilter}
                          onChange={(e) =>
                            setAssignLengthFilter(e.target.value)
                          }
                          className="w-full bg-gray-700 text-white py-2 px-3 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Lengths</option>
                          {availableLengths.map((length) => (
                            <option key={length} value={length}>
                              {length}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* File Selection */}
                      <div className="mb-4">
                        <FileSearchSelect
                          files={filteredModalFiles}
                          onSelect={(fileId, fileObj) => {
                            setSelectedFile(fileId);
                            setAssignMessage(null);
                          }}
                        />
                      </div>

                      {/* Assign Button */}
                      <button
                        onClick={async () => {
                          const file = filteredModalFiles.find(
                            (file) => file.id === selectedFile
                          );
                          if (file) {
                            await handleAssignFileToUser(selectedUser, file);
                          }
                        }}
                        className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        disabled={!selectedUser || !selectedFile}
                      >
                        Assign File
                      </button>
                    </div>
                  ) : (
                    /* Unassign Mode */
                    <div className="flex-1 overflow-auto max-h-[400px]">
                      {/* User Selection */}
                      <div className="mb-4">
                        <UserSearchSelect
                          users={users}
                          label="Unassign From"
                          onSelect={(userId, userObj) => {
                            setSelectedUnassignUser(userId);
                            fetchUserFiles(userId);
                          }}
                        />
                      </div>

                      {/* List of Assigned Files */}
                      {userFiles.length > 0 ? (
                        <ul className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2">
                          {userFiles.map((file) => (
                            <li
                              key={file.id}
                              className="flex justify-between items-center border-b border-gray-300 py-2"
                            >
                              <span>{file.fileName}</span>
                              <button
                                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                onClick={() =>
                                  handleUnassignFile(selectedUnassignUser, file)
                                }
                              >
                                Unassign
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-center mt-4">
                          No files assigned to this user.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Success/Error Message (Only Show in Active Mode) */}
                  {assignMessage && (
                    <p
                      className={`mt-4 text-center ${
                        assignMessage.type === "success"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {assignMessage.text}
                    </p>
                  )}

                  {/* Close Button */}
                  <button
                    onClick={handleCloseModal}
                    className="w-full bg-gray-500 text-white px-4 py-2 rounded mt-4 hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            <UploadFileModal
              isUploadModalOpen={isUploadModalOpen}
              folderId={folderId}
              onUploadSuccess={fetchFolderData} // Refresh folder data after upload
              closeModal={() => setIsUploadModalOpen(false)}
            />
          </>
        )}
      </section>
    </main>
  );
}
