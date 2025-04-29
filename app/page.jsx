"use client";
import { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase/firebase"; // Adjust the path as necessary
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useUser } from "@/src/context/UserContext";
import SignUpModal from "@/components/SignUpModal";
import UploadMyFilesModal from "@/components/UploadMyFilesModal";
import MyFilesSection from "@/components/MyFilesSection";
import PendingIntroChangesModal from "@/components/PendingIntroChangesModal";

export default function Home() {
  const {
    user,
    setUser,
    loading,
    toggleFavorite,
    fetchMyFiles,
    handleLogout,
    handleLogin,
  } = useUser();

  const [folders, setFolders] = useState([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAscending, setIsAscending] = useState(true); // State for sorting direction
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("user");
  const [signupError, setSignupError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState(null); // Default tab is "All Files"
  const allFolders = user?.allFolders || [];
  const [searchQuery, setSearchQuery] = useState(""); // For search input
  const [searchResults, setSearchResults] = useState([]); // For storing search results
  const [searching, setSearching] = useState(false); // Loading state for search
  const [userRole, setUserRole] = useState(null); // To store the user's role
  const [userFiles, setUserFiles] = useState([]); // To store the user's files (for non-admins)
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState([]);
  const [pendingIntroFiles, setPendingIntroFiles] = useState([]);
  const [showPendingIntroModal, setShowPendingIntroModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyFiles();
    }
  }, [user]);

  useEffect(() => {
    if (!activeTab && user) {
      setActiveTab(user.role === "admin" ? "all" : "my");
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchPendingIntroChanges();
    }
  }, [user]);

  const fetchPendingIntroChanges = async () => {
    try {
      const filesSnapshot = await getDocs(collection(db, "files"));
      const filesWithPendingChanges = filesSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((file) => file.pendingIntroChange);

      setPendingIntroFiles(filesWithPendingChanges);
    } catch (error) {
      console.error("Error fetching pending intro changes:", error);
    }
  };

  if (loading) {
    return <p>Loading...</p>; // Show a loading state while fetching user data
  }

  const handleLoginClick = async () => {
    await handleLogin(loginEmail, loginPassword);
    setLoginEmail(""); // Clear input fields
    setLoginPassword("");
  };

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
      });
      setFolders([
        ...folders,
        {
          id: docRef.id,
          name: newFolderName,
          createdAt: new Date().toISOString(),
        },
      ]);
      setIsFolderModalOpen(false);
      setNewFolderName(""); // Reset folder name input
    } catch (error) {
      console.error("Error creating new folder:", error);
    }
  };

  const handleSignup = async () => {
    if (
      !signupEmail ||
      !signupPassword ||
      !firstName ||
      !lastName ||
      !graduationYear
    ) {
      setSignupError("All fields are required.");
      return;
    }

    if (isSigningUp) return; // Prevent duplicate submissions
    setIsSigningUp(true);

    try {
      setSignupError(""); // Clear previous errors
      setIsSignUpModalOpen(false); // Close the modal immediately

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        signupEmail,
        signupPassword
      );

      const user = userCredential.user;

      // Add user to Firestore with new fields
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: signupRole, // Default role
        favoriteFolders: [],
        myFiles: [],
        previousFiles: [],
        favoriteFiles: [],
        firstName, // Add firstName
        lastName, // Add lastName
        graduationYear, // Add graduationYear
      });

      console.log("User created and added to Firestore:", user.uid);

      // Reset the inputs
      setSignupEmail("");
      setSignupPassword("");
      setFirstName("");
      setLastName("");
      setGraduationYear("");
      setSignupRole("user");
    } catch (error) {
      console.error("Error signing up:", error);
      setSignupError(error.message); // Display error message
    } finally {
      setIsSigningUp(false); // Re-enable the button
    }
  };
  const handlePendingIntroClick = async () => {
    setShowPendingIntroModal(true);
  };

  const handleUploadToMyFiles = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // ✅ Generate a unique fileId
      const fileId = doc(collection(db, "files")).id;

      // ✅ Store file in Firebase Storage
      const storageRef = ref(storage, `user_files/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // ✅ Create Firestore document in `files`
      const fileData = {
        fileId,
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        pieceDescription: "No description provided.",
        previouslyOwned: [],
        editedVersions: [],
        trackRecord: [],
      };

      const fileRef = doc(db, "files", fileId);
      await setDoc(fileRef, fileData);

      // ✅ Append { fileRef, dateGiven } to user’s `myFiles` array
      const fileEntry = {
        fileRef,
        dateGiven: new Date().toISOString(),
      };

      await updateDoc(doc(db, "users", user.uid), {
        myFiles: arrayUnion(fileEntry),
      });

      console.log("File uploaded and added to myFiles:", fileId);

      // ✅ Refresh user state to show new file
      fetchMyFiles();
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearching(true);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      if (user?.role === "admin") {
        // Admin: Search all files in the `folders` collection
        const foldersSnapshot = await getDocs(collection(db, "folders"));
        const allFiles = [];

        for (const folderDoc of foldersSnapshot.docs) {
          const folderId = folderDoc.id;
          const filesSnapshot = await getDocs(
            collection(db, "folders", folderId, "files")
          );

          filesSnapshot.forEach((fileDoc) => {
            allFiles.push({
              ...fileDoc.data(),
              id: fileDoc.id,
              folderId,
              folderName: folderDoc.data().name,
            });
          });
        }

        // Filter files based on the query
        const filteredFiles = allFiles.filter((file) =>
          file.fileName.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredFiles);
      } else {
        // Regular User: Search only in their `myFiles` array
        const filteredFiles = userFiles.filter((file) =>
          file.fileName.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredFiles);
      }
    } catch (error) {
      console.error("Error searching files:", error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-mainBg text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-asideBg text-white p-6 flex flex-col">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-white">Piece</span>
            <span className="text-blue-300">ify</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Your performances, organized.
          </p>
        </div>

        {/* User Profile */}
        {user ? (
          <div className="mb-8 bg-blue-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                {user.firstName && user.firstName[0]}
                {user.lastName && user.lastName[0]}
              </div>
              <div>
                <p className="font-medium">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.email}
                </p>
                <p className="text-xs text-blue-300">
                  {user.role === "admin" ? "Administrator" : "User"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 text-sm text-blue-300 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        ) : (
          <p className="text-sm mb-6">Please log in to access your files.</p>
        )}

        {/* Navigation */}
        <nav className="flex-1">
          <div className="mb-4">
            <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider">
              Navigation
            </h3>
          </div>

          <ul className="space-y-2">
            <li>
              <a className="flex items-center p-2 rounded-md bg-blue-800/50 font-medium">
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
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Dashboard
              </a>
            </li>
            <li>
              <a className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors">
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
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                My Pieces
              </a>
            </li>
          </ul>
        </nav>

        {/* Favorited Folders */}
        <div className="mt-6">
          <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider mb-4">
            Favorited Folders
          </h3>
          {user?.favoriteFolders?.length > 0 ? (
            <div className="space-y-2">
              {allFolders
                .filter((folder) => user.favoriteFolders.includes(folder.id))
                .map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/folders/${folder.id}`}
                    passHref
                    className="block"
                  >
                    <div className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors">
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
                      <span>{folder.name}</span>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <p className="text-sm text-blue-400">No favorites yet. Add some!</p>
          )}
        </div>

        {/* Other Links */}
        <div className="mt-6">
          <Link href="/team">
            <div className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Current Team
            </div>
          </Link>
        </div>

        {/* Admin Panel */}
        {user?.role === "admin" && (
          <div className="mt-6">
            <h3 className="text-blue-300 uppercase text-xs font-semibold tracking-wider mb-4">
              Admin
            </h3>
            <div
              className="flex items-center p-2 rounded-md text-blue-200 hover:bg-blue-800/50 hover:text-white transition-colors cursor-pointer relative"
              onClick={handlePendingIntroClick}
            >
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>Pending Intro Changes</span>

              {/* 🔵 Notification Badge */}
              {pendingIntroFiles.length > 0 && (
                <span className=" bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {pendingIntroFiles.length}
                </span>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      {user && (
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
                  placeholder="Search for pieces, folders, and more..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />

                {/* Search Results Dropdown */}
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
                )}
              </div>

              <div className="flex items-center ml-4 space-x-4">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
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
                  Upload New Piece
                </button>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="max-w-7xl mx-auto px-4 py-6">
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

            {/* All Files Tab Content */}
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
                      Sort {isAscending ? "Z-A" : "A-Z"}
                    </button>
                  </div>
                </div>

                {/* Folders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allFolders.map((folder) => (
                    <Link
                      key={folder.id}
                      href={`/folders/${folder.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <div
                        key={folder.id}
                        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden hover:-translate-y-1 transition-transform duration-200"
                      >
                        <div className="h-2 bg-blue-500"></div>
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
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Your Pieces
                    </h3>
                    <div className="flex space-x-2">
                      <button className="text-sm text-gray-500 flex items-center">
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
                        Sort
                      </button>
                      <button className="text-sm text-gray-500 flex items-center">
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
                            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                          />
                        </svg>
                        Filter
                      </button>
                    </div>
                  </div>

                  {/* Your MyFilesSection component */}
                  <MyFilesSection
                    myFiles={user?.myFiles || []}
                    previousFiles={user?.previousFiles || []}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login Modal */}
      {!user && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Welcome to Piecify
            </h2>

            {/* Login Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLoginClick();
              }}
            >
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {/* Error Message */}
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                    {loginError}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a
                      href="#"
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Forgot password?
                    </a>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Don&apos;t have an account?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setIsSignUpModalOpen(true)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Create New Account
                </button>
              </div>
            </div>
          </div>

          {/* Keep your existing SignUpModal component */}
          <SignUpModal
            isOpen={isSignUpModalOpen}
            onClose={() => setIsSignUpModalOpen(false)}
            onSignUp={handleSignup}
            email={signupEmail}
            password={signupPassword}
            firstName={firstName}
            lastName={lastName}
            graduationYear={graduationYear}
            role={signupRole}
            onEmailChange={(e) => setSignupEmail(e.target.value)}
            onPasswordChange={(e) => setSignupPassword(e.target.value)}
            onFirstNameChange={(e) => setFirstName(e.target.value)}
            onLastNameChange={(e) => setLastName(e.target.value)}
            onGraduationYearChange={(e) => setGraduationYear(e.target.value)}
            onRoleChange={(e) => setSignupRole(e.target.value)}
            error={signupError}
            disabled={isSigningUp}
          />
        </div>
      )}

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
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
                    className={`w-8 h-8 rounded-full ${color} border-2 ${
                      color === "bg-blue-500"
                        ? "border-blue-700"
                        : "border-transparent"
                    }`}
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
      {/* Your existing ChangesModal */}
      {showPendingIntroModal && (
        <PendingIntroChangesModal
          pendingFiles={pendingIntroFiles}
          setPendingFiles={setPendingIntroFiles}
          onClose={() => setShowPendingIntroModal(false)}
          refreshPendingChanges={fetchPendingIntroChanges}
        />
      )}
    </main>
  );
}
