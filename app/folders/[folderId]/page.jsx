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
import LoadingSpinner from "@/components/LoadingSpinner";
import { sortedAttributeOptions } from "@/src/componenets/AttributeIcons";
import { useLayout } from "@/src/context/LayoutContext";

export default function FolderPage() {
  const { folderId } = useParams();
  const router = useRouter();
  const { user, loading, isPrivileged } = useUser();
  const isPrivilegedUser = isPrivileged();
  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [assignMessage, setAssignMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUnassignUser, setSelectedUnassignUser] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [isAssignMode, setIsAssignMode] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [hasChanged, setHasChanged] = useState(false);
  const [ownersMap, setOwnersMap] = useState({});
  const [lengthFilter, setLengthFilter] = useState("all");
  const [assignLengthFilter, setAssignLengthFilter] = useState("all");
  const [availableLengths, setAvailableLengths] = useState([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState(""); // For search functionality
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignFile, setReassignFile] = useState(null);
  const [reassignFromUser, setReassignFromUser] = useState(null);
  // For "undo assignment" window
  const [undoData, setUndoData] = useState(null);
  const [undoTimeLeft, setUndoTimeLeft] = useState(0);

  const tagOptions = sortedAttributeOptions.map((opt) => opt.value);

  const filteredModalFiles =
    assignLengthFilter === "all"
      ? files
      : files.filter((file) => file.length === assignLengthFilter);

  const { setActivePage, setCustomAdminButtons } = useLayout();

  useEffect(() => {
    setActivePage("folders");

    setCustomAdminButtons([
      {
        label: "Manage Assignments",
        onClick: () => setIsModalOpen(true),
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 md:h-6 md:w-6 text-blue-200"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
            <path d="M3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
      },
    ]);

    return () => {
      setCustomAdminButtons([]); // Clean up when leaving the page
    };
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      fetchOwners();

      // Extract unique length values from files
      const lengths = new Set();
      files.forEach((file) => {
        if (file.length) {
          lengths.add(file.length);
        }
      });
      setAvailableLengths(Array.from(lengths).sort());
    }
  }, [files]);

  useEffect(() => {
    // Fetch folder data when user and folderId are available
    if (!loading && user && folderId) {
      fetchFolderData();
    }

    // Fetch users when the modal is open and user is an admin
    if (isPrivilegedUser) {
      fetchUsers();
    }
  }, [loading, user, folderId]);

  const fetchOwners = async () => {
    try {
      const newOwnersMap = {};

      await Promise.all(
        files.map(async (file) => {
          // 1) Build a uniform array of { userId, dateGiven? } entries
          let ownerEntries = [];
          if (Array.isArray(file.currentOwner)) {
            ownerEntries = file.currentOwner;
          } else if (file.currentOwner) {
            // legacy single ref
            ownerEntries = [{ userId: file.currentOwner.id }];
          }

          // 2) If we have any, look up their names
          if (ownerEntries.length > 0) {
            const names = await fetchOwnerNames(ownerEntries);
            newOwnersMap[file.id] = names;
          }
        })
      );

      setOwnersMap(newOwnersMap);
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
      setUserFiles([]);

      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.error("User does not exist.");
        return;
      }

      const userData = userSnap.data();
      const fileRefs = userData.myFiles || [];

      const filePromises = fileRefs.map(async (fileEntry) => {
        if (!fileEntry.fileRef) return null;

        const fileDocRef = fileEntry.fileRef;
        const fileDocSnap = await getDoc(fileDocRef);

        return fileDocSnap.exists()
          ? {
              id: fileDocSnap.id,
              fileRef: fileEntry.fileRef,
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
      setIsLoading(true);

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
            fileRefDoc = await getDoc(fileData.fileRef);
          } else if (typeof fileData.fileRef === "string") {
            fileRefDoc = await getDoc(doc(db, fileData.fileRef));
          }

          return fileRefDoc?.exists()
            ? { id: fileRefDoc.id, ...fileRefDoc.data() }
            : null;
        }

        return null;
      });

      const resolvedFiles = (await Promise.all(filePromises)).filter(
        (file) => file !== null
      );

      setFiles(
        resolvedFiles.sort((a, b) => a.fileName.localeCompare(b.fileName))
      );
    } catch (error) {
      console.error("Error fetching folder data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOwnerNames = async (ownerEntries) => {
    try {
      const names = await Promise.all(
        ownerEntries.map(async (entry) => {
          const userRef = doc(db, "users", entry.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            return data.firstName && data.lastName
              ? `${data.firstName} ${data.lastName}`
              : data.email || "Unknown User";
          }
          return "Unknown User";
        })
      );
      return names;
    } catch (error) {
      console.error("Error fetching owner names:", error);
      return ["Unknown"];
    }
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

      // Check if there is already a current owner
      const isDuo =
        fileData.attributes?.includes("DUO") ||
        ["Boy-Boy", "Girl-Girl", "Boy-Girl"].some((tag) =>
          fileData.attributes?.includes(tag)
        );

      const currentOwners = fileData.currentOwner || [];

      if (!isDuo && fileData.currentOwner.length > 0) {
        const currentOwnerId = fileData.currentOwner[0].userId;

        // Fetch the current owner's user details
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
        if (isDuo && currentOwners.length >= 2) {
          setAssignMessage({
            type: "error",
            text: "This DUO piece already has two assigned users.",
          });
          return;
        }
      }

      // New structure for assignment history
      const assignmentEntry = {
        dateGiven: new Date().toISOString(),
        userId: user.uid,
        assignedUser: userId,
      };

      // New structure for currentOwner
      const currentOwnerEntry = {
        userId: userId,
        dateGiven: new Date().toISOString(),
      };

      console.log("Assigning file:", {
        fileName: file.fileName,
        assigner: user.uid,
        assignedTo: userId,
      });

      // Update the file document
      // Only bump currentOwner for now; history comes later
      await updateDoc(topLevelFileRef, {
        currentOwner: arrayUnion(currentOwnerEntry),
      });

      // Assign file reference to the selected user
      const fileEntry = {
        fileRef: topLevelFileRef,
        dateGiven: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        myFiles: arrayUnion(fileEntry),
      });

      setAssignMessage({
        type: "success",
        text: `File "${file.fileName}" successfully assigned to ${
          `${userData.firstName} ${userData.lastName}` ||
          userData.email ||
          "this user"
        }.`,
      });

      setHasChanged(true);

      // Reset the user and file selection
      setSelectedUser(null);
      setSelectedFile(null);

      // Show "Undo" option for 10 seconds with countdown
      const UNDO_DURATION = 10000; // 10 seconds
      setUndoTimeLeft(UNDO_DURATION);

      // Update countdown every 100ms for smooth progress bar
      const countdownInterval = setInterval(() => {
        setUndoTimeLeft((prev) => {
          const newTime = prev - 100;
          if (newTime <= 0) {
            clearInterval(countdownInterval);
            setUndoData(null);
            return 0;
          }
          return newTime;
        });
      }, 100);

      // Main timeout to clear undo data
      const timeoutId = setTimeout(() => {
        clearInterval(countdownInterval);
        setUndoData(null);
        setUndoTimeLeft(0);
      }, UNDO_DURATION);

      // schedule writing assignment history once undo expires
      const historyTimeoutId = setTimeout(async () => {
        try {
          await updateDoc(topLevelFileRef, {
            previouslyOwned: arrayUnion(assignmentEntry),
          });
        } catch (e) {
          console.error("Failed to record assignment history:", e);
        }
      }, UNDO_DURATION);

      // Save enough info to reverse the assignment
      setUndoData({
        timeoutId,
        countdownInterval, // Store interval ID so we can clear it on manual undo
        historyTimeoutId, // ← new
        userId, // the person you just assigned to
        fileRef: topLevelFileRef, // reference to the file doc
        fileName: file.fileName, // for displaying in the undo button
      });
    } catch (err) {
      console.error("Error assigning file to user:", err);
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
        console.error("Invalid file reference for unassignment. File:", file);
        return;
      }

      const userRef = doc(db, "users", userId);
      const fileRef =
        typeof file.fileRef === "object" ? file.fileRef : doc(db, file.fileRef);

      console.log("Resolved file reference:", fileRef.path);

      // Step 1: Remove file from `myFiles` in the user document
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

      // Step 2: Remove user from `currentOwner` in the file document
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

      setHasChanged(true);

      // Step 3: Refresh user files after unassigning
      fetchUserFiles(userId);
    } catch (error) {
      console.error("Error unassigning file:", error);
    }
  };
  const reassignFileToUser = async (fromUserId, toUserId, file) => {
    try {
      const fileRef = doc(db, "files", file.id);
      const fileSnap = await getDoc(fileRef);

      if (!fileSnap.exists()) {
        throw new Error("File does not exist.");
      }

      const fileData = fileSnap.data();
      const oldOwnerArray = Array.isArray(fileData.currentOwner)
        ? fileData.currentOwner
        : [];

      // Remove `fromUserId` from `currentOwner`
      const newOwnerArray = oldOwnerArray.filter(
        (entry) => entry.userId !== fromUserId
      );

      // Add `toUserId` to `currentOwner`
      newOwnerArray.push({
        userId: toUserId,
        dateGiven: new Date().toISOString(),
      });

      // Add reassignment history
      const reassignmentEntry = {
        dateGiven: new Date().toISOString(),
        assignedBy: user.uid, // assigning admin
        fromUser: fromUserId,
        assignedUser: toUserId,
      };

      // Step 1: Update the file document
      await updateDoc(fileRef, {
        currentOwner: newOwnerArray,
        previouslyOwned: arrayUnion(reassignmentEntry),
      });

      // Step 2: Remove from old user's myFiles
      const fromUserRef = doc(db, "users", fromUserId);
      const fromUserSnap = await getDoc(fromUserRef);
      if (fromUserSnap.exists()) {
        const fromUserData = fromUserSnap.data();
        const updatedFiles = (fromUserData.myFiles || []).filter(
          (entry) =>
            entry.fileRef?.id !== fileRef.id &&
            entry.fileRef?.path !== fileRef.path
        );
        await updateDoc(fromUserRef, { myFiles: updatedFiles });
      }

      // Step 3: Add to new user's myFiles
      const toUserRef = doc(db, "users", toUserId);
      await updateDoc(toUserRef, {
        myFiles: arrayUnion({
          fileRef: fileRef,
          dateGiven: new Date().toISOString(),
        }),
      });

      return { success: true };
    } catch (error) {
      console.error("Error reassigning file:", error);
      return { success: false, error: error.message };
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

  console.log(filteredFiles);
  // Filter assigned and unassigned pieces based on length filter
  const assignedPieces = filteredFiles.filter((file) => {
    if (Array.isArray(file.currentOwner)) {
      return file.currentOwner.length > 0;
    }
    // any single DocumentReference counts as one owner
    return !!file.currentOwner;
  });

  const unassignedPieces = filteredFiles.filter((file) => {
    if (Array.isArray(file.currentOwner)) {
      return file.currentOwner.length === 0;
    }
    // null/undefined → truly unassigned
    return !file.currentOwner;
  });

  const handleClearFilters = () => {
    setLengthFilter("all");
    setTagFilter("all");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAssignMessage(null);

    // Refresh folder only if changes occurred
    if (hasChanged) {
      // Delay fetching folder data to allow Firestore to update
      setTimeout(() => {
        fetchFolderData();
      }, 500);
      setHasChanged(false);
    }
  };

  if (isLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-gray-800">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-6">Please log in to access this page.</p>
          <Link href="/login">
            <div className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Go to Login
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-gray-800">
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Search for files, folders, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center ml-4 space-x-4">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
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
                Upload New File
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {folderName || "Loading..."}
            </h1>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-4 px-1 font-medium text-sm ${
                  activeTab === "all"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                All Files
              </button>
              <button
                onClick={() => setActiveTab("assign")}
                className={`pb-4 px-1 font-medium text-sm ${
                  activeTab === "assign"
                    ? "text-indigo-600 border-b-2 border-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Assignments
              </button>
            </div>
          </div>

          {activeTab === "all" && (
            <>
              <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center gap-6">
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
                        {availableLengths.map((length) => (
                          <option key={length} value={length}>
                            {length}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 20 20"
                        >
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
                        <svg
                          className="h-4 w-4 fill-current"
                          viewBox="0 0 20 20"
                        >
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
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center"
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
                  <span className="ml-auto text-sm text-gray-500">
                    Showing {filteredFiles.length} of {files.length} files
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Render Filtered Files */}
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleFileClick(file.id)}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                    >
                      <div className="p-5">
                        {/* Header with file info and length badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3
                              className="font-medium text-gray-900 truncate"
                              title={file.fileName} // Shows full name on hover
                            >
                              {file.fileName}
                            </h3>
                          </div>
                          {/* Length badge positioned on the right */}
                          {file.length && (
                            <div className="flex-shrink-0">
                              <span className="inline-block px-2 py-1 bg-indigo-100 text-xs font-medium rounded text-indigo-800">
                                {file.length}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Owner information */}
                        <div className="border-t border-gray-100 pt-3">
                          <div className="flex items-center text-sm text-gray-600">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-2 flex-shrink-0"
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
                            <div className="flex-1 min-w-0">
                              {(
                                Array.isArray(file.currentOwner)
                                  ? file.currentOwner.length > 0
                                  : !!file.currentOwner
                              ) ? (
                                <div className="space-y-1">
                                  {(ownersMap[file.id] || ["Loading..."]).map(
                                    (name, idx) => (
                                      <div
                                        key={idx}
                                        className="truncate text-sm"
                                        title={name}
                                      >
                                        {name}
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm italic text-gray-400">
                                  Not currently assigned to anyone
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full flex items-center justify-center h-32 border border-gray-300 rounded-lg bg-white">
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
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between">
                  <div className="flex space-x-8">
                    {/* Unassigned Stats */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-indigo-500">
                        <span className="text-xl font-bold">
                          {unassignedPieces.length}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Unassigned</p>
                    </div>

                    {/* Assigned Stats */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-green-600">
                        <span className="text-xl font-bold">
                          {assignedPieces.length}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Assigned</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <h3 className="text-gray-500 text-sm">
                      Assignment Overview
                    </h3>
                    <p className="text-lg">
                      Total pieces: {filteredFiles.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Unassigned Pieces Section */}
              <div>
                <div className="flex items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Unassigned Pieces
                  </h2>
                  <span className="ml-3 px-2 py-1 bg-gray-100 text-xs font-medium rounded-full">
                    {unassignedPieces.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unassignedPieces.length > 0 ? (
                    unassignedPieces.map((file) => (
                      <div
                        key={file.id}
                        className="border border-gray-300 rounded-lg p-4 bg-white hover:bg-gray-50 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => handleFileClick(file.id)}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-left w-full">
                            {file.fileName}
                          </span>

                          {/* Only show length as badge */}
                          {file.length && (
                            <div className="ml-2 px-2 py-1 bg-indigo-100 text-xs rounded font-semibold whitespace-nowrap text-indigo-800">
                              {file.length}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex items-center justify-center h-32 border border-gray-300 rounded-lg bg-white">
                      <p className="text-gray-500">
                        No unassigned files found.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Pieces Section */}
              <div>
                <div className="flex items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Assigned Pieces
                  </h2>
                  <span className="ml-3 px-2 py-1 bg-gray-100 text-xs font-medium rounded-full">
                    {assignedPieces.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {assignedPieces.length > 0 ? (
                    assignedPieces.map((file) => (
                      <div
                        key={file.id}
                        className="border border-gray-300 rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => handleFileClick(file.id)}
                      >
                        <div className="p-4 flex flex-col h-full">
                          {/* Main Content - Centered */}
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex-1 flex items-center justify-between">
                              <span className="font-bold text-left">
                                {file.fileName}
                              </span>
                              {file.length && (
                                <div className="px-2 py-1 bg-indigo-100 text-xs font-semibold rounded whitespace-nowrap text-indigo-800">
                                  {file.length}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Owner information - Centered */}
                          <div className="flex-1 flex items-center mt-2">
                            <div className="text-sm text-gray-500 flex items-center">
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
                              <div className="flex flex-col">
                                {(ownersMap[file.id] || ["Loading..."]).map(
                                  (name, idx) => (
                                    <span key={idx}>{name}</span>
                                  )
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Divider Line and Reassign Button */}
                          {isPrivilegedUser &&
                            file.currentOwner.length === 1 && (
                              <>
                                <hr className="border-gray-200 my-3" />
                                <div className="flex justify-end">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // <- THIS IS CRITICAL
                                      setReassignFile(file);
                                      setReassignFromUser(
                                        file.currentOwner[0].userId
                                      );
                                      setIsReassignModalOpen(true);
                                    }}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 group"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-3 w-3 mr-1 group-hover:rotate-12 transition-transform duration-200"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                      />
                                    </svg>
                                    Reassign
                                  </button>
                                </div>
                              </>
                            )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex items-center justify-center h-32 border border-gray-300 rounded-lg bg-white">
                      <p className="text-gray-500">No assigned files found.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Admin Modals */}
          {isPrivilegedUser && (
            <>
              {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                  <div className="relative bg-white p-8 rounded-lg shadow-lg w-[600px] max-w-full min-h-[450px] flex flex-col">
                    {/* Toggle Switch - Top Right */}
                    <div className="absolute top-4 right-4 flex items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!isAssignMode}
                          onChange={handleToggleMode}
                        />
                        <div className="w-12 h-6 bg-gray-400 rounded-full peer-checked:bg-red-500 relative flex items-center transition-all">
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

                        {/* Length filter to file selection in modal */}
                        <div className="mb-2">
                          <label
                            htmlFor="modal-length-filter"
                            className="text-sm font-medium mb-1 block text-gray-700"
                          >
                            Filter files by length:
                          </label>
                          <select
                            id="modal-length-filter"
                            value={assignLengthFilter}
                            onChange={(e) =>
                              setAssignLengthFilter(e.target.value)
                            }
                            className="w-full bg-gray-50 text-gray-700 py-2 px-3 rounded border border-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-indigo-300"
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
                          <ul className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                            {userFiles.map((file) => (
                              <li
                                key={file.id}
                                className="flex justify-between items-center border-b border-gray-300 py-2"
                              >
                                <span>{file.fileName}</span>
                                <button
                                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                  onClick={() =>
                                    handleUnassignFile(
                                      selectedUnassignUser,
                                      file
                                    )
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
                      <div className="mt-6 space-y-3">
                        {/* Main Message */}
                        <div
                          className={`relative p-4 rounded-lg border ${
                            assignMessage.type === "success"
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-red-50 border-red-200 text-red-800"
                          }`}
                        >
                          <div className="flex items-start">
                            {/* Icon */}
                            <div className="flex-shrink-0">
                              {assignMessage.type === "success" ? (
                                <svg
                                  className="h-5 w-5 text-green-400"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.23a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="h-5 w-5 text-red-400"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>

                            {/* Message Text */}
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium">
                                {assignMessage.text}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Undo Button with Countdown */}
                        {undoData && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  <svg
                                    className="h-5 w-5 text-blue-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm text-blue-800 font-medium">
                                    Changed your mind?
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    Undo expires in{" "}
                                    {Math.ceil(undoTimeLeft / 1000)} seconds
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  clearTimeout(undoData.timeoutId);
                                  clearInterval(undoData.countdownInterval);
                                  clearTimeout(undoData.historyTimeoutId);
                                  // reverse what we just did
                                  handleUnassignFile(undoData.userId, {
                                    fileRef: undoData.fileRef,
                                    fileName: undoData.fileName,
                                  });
                                  setUndoData(null);
                                  setUndoTimeLeft(0);
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                              >
                                <svg
                                  className="h-3 w-3 mr-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                                  />
                                </svg>
                                Undo
                              </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-blue-100 rounded-full h-1.5">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-100 ease-linear"
                                style={{
                                  width: `${(undoTimeLeft / 10000) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Close Button */}
                    <button
                      onClick={handleCloseModal}
                      className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded mt-4 hover:bg-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
              {isReassignModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-[400px]">
                    <h3 className="text-xl font-bold mb-4">Reassign File</h3>
                    <p className="mb-2 text-sm text-gray-700">
                      <strong>File:</strong> {reassignFile?.fileName}
                    </p>

                    <UserSearchSelect
                      users={users}
                      label="New Assignee"
                      onSelect={(newUserId) => {
                        setSelectedUser(newUserId); // Store the selected user
                      }}
                    />

                    {/* Confirm and Cancel Buttons */}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={async () => {
                          if (selectedUser) {
                            const result = await reassignFileToUser(
                              reassignFromUser,
                              selectedUser,
                              reassignFile
                            );

                            if (result.success) {
                              setIsReassignModalOpen(false);
                              setAssignMessage({
                                type: "success",
                                text: `Successfully reassigned file.`,
                              });
                              setTimeout(() => fetchFolderData(), 300); // Refresh
                              setSelectedUser(null); // Reset selection
                            } else {
                              setAssignMessage({
                                type: "error",
                                text: result.error,
                              });
                            }
                          }
                        }}
                        disabled={!selectedUser}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Confirm Reassignment
                      </button>

                      <button
                        onClick={() => {
                          setIsReassignModalOpen(false);
                          setSelectedUser(null); // Reset selection
                        }}
                        className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <UploadFileModal
                isUploadModalOpen={isUploadModalOpen}
                folderId={folderId}
                user={user}
                onUploadSuccess={fetchFolderData}
                closeModal={() => setIsUploadModalOpen(false)}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
