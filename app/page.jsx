"use client";
import { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "./firebase/firebase"; // Adjust the path as necessary
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useUser } from "@/src/context/UserContext";
import SignUpModal from "@/components/SignUpModal";

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

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState(null);
  const [error, setError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAscending, setIsAscending] = useState(true); // State for sorting direction
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("user");
  const [signupError, setSignupError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // Default tab is "All Files"
  const allFolders = user?.allFolders || [];
  const [searchQuery, setSearchQuery] = useState(""); // For search input
  const [searchResults, setSearchResults] = useState([]); // For storing search results
  const [searching, setSearching] = useState(false); // Loading state for search
  const [userRole, setUserRole] = useState(null); // To store the user's role
  const [userFiles, setUserFiles] = useState([]); // To store the user's files (for non-admins)
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  useEffect(() => {
    if (user) {
      fetchMyFiles();
    }
  }, [user]);

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

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !selectedFolder) {
      setError("Please select a file and a folder.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Step 1: Upload the file to Firebase Storage
      const storageRef = ref(storage, `${selectedFolder}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // Step 2: Generate a consistent fileId
      const fileId = doc(collection(db, "files")).id; // Unique fileId for both collections

      // Step 3: Prepare file metadata
      const fileData = {
        fileId,
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date(),
        pieceDescription: "No description provided.",
        previouslyOwned: [],
        editedVersions: [],
        trackRecord: [],
        folderId: selectedFolder, // Track which folder the file is in
      };

      // Step 4: Store full file data in top-level collection `/files/{fileId}`
      await setDoc(doc(db, "files", fileId), fileData);

      // Step 5: Store only a reference in `/folders/{folderId}/files/{fileId}`
      await setDoc(doc(db, "folders", selectedFolder, "files", fileId), {
        fileRef: `/files/${fileId}`,
      });

      console.log("File uploaded successfully with fileId:", fileId);
      setDownloadURL(fileUrl);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      alert("Folder name cannot be empty.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "folders"), {
        name: newFolderName,
        createdAt: new Date(),
      });
      setFolders([
        ...folders,
        { id: docRef.id, name: newFolderName, createdAt: new Date() },
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

  const handleSearch = async (query) => {
    setSearchQuery(query);
    setSearching(true);

    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      if (userRole === "admin") {
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
    <main className="flex min-h-screen bg-mainBg dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-asideBg text-white p-4">
        <h1 className="text-4xl font-bold mb-4">Piecify</h1>

        {user ? (
          <div className="mb-6">
            <p className="text-sm">Logged in as:</p>
            <p className="font-bold">
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}` // Show first and last name if available
                : user.email}
              {/* Fallback to email */}
            </p>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded mt-4"
            >
              Log Out
            </button>
          </div>
        ) : (
          <p className="text-sm">Please log in to access your files.</p>
        )}

        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Favorited Folders
          </h3>
          {user?.favoriteFolders?.length > 0 ? (
            <div className="grid gap-4">
              {allFolders
                .filter((folder) => user.favoriteFolders.includes(folder.id))
                .map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/folders/${folder.id}`} // Navigate to the folder's page
                    passHref
                    className="block"
                  >
                    <div className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-shadow cursor-pointer shadow hover:shadow-lg">
                      {/* Folder Details */}
                      <div className="flex items-center">
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-200">
                          {folder.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No favorites yet. Add some!</p>
          )}
        </div>

        {/* Other Sidebar Items */}
        <div className="mt-6">
          <Link href="/team">
            <div className="p-2 bg-blue-500 text-white rounded text-center cursor-pointer">
              Current Team
            </div>
          </Link>
        </div>
      </aside>

      {/* Login Modal */}
      {!user && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-semibold mb-6 text-center">Log In</h2>
            <form
    onSubmit={(e) => {
    e.preventDefault(); // Prevent page refresh
    handleLoginClick();
  }}
>
            {/* Email Input */}
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
              placeholder="Enter email"
            />

            {/* Password Input */}
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
              placeholder="Enter password"
            />

            {/* Error Message */}
            {loginError && <p className="text-red-500 mb-4">{loginError}</p>}

            {/* Login Button */}
            <button
              onClick={handleLoginClick}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
              Log In
            </button>
            </form>

            {/* Create Account Button */}
            <button
              onClick={() => setIsSignUpModalOpen(true)}
              className="w-full bg-green-500 text-white px-4 py-2 rounded"
            >
              Create Account
            </button>
          </div>
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

      {/* Main Content Area */}
      <section className="flex-1 p-8 flex flex-col items-center justify-center">
        {/* Search Bar */}
        <div className="relative w-full flex items-center mb-10">
          {/* Search Icon */}
          <div className="absolute left-3 text-gray-500 dark:text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />

          {/* Search Results */}
          {searchQuery && (
            <div className="absolute top-full left-0 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
              {searching ? (
                <p className="p-4 text-gray-500">Searching...</p>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {searchResults.map((file, index) => (
                    <li
                      key={index}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      {userRole === "admin" ? (
                        <Link
                          href={`/viewDocuments/${file.folderId}/${file.id}`}
                          className="block"
                        >
                          <div className="flex justify-between">
                            <span className="font-bold">{file.fileName}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
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
                            <span className="font-bold">{file.fileName}</span>
                          </div>
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-gray-500">No files match your search.</p>
              )}
            </div>
          )}
        </div>

        {/* Display Folders */}
        <div className="flex-grow w-full mb-8">
          <section className="flex-1 p-8">
            {user?.role === "admin" ? (
              // Admin View with Tabs
              <>
                <div className="w-full mb-6">
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-800 dark:text-gray-200 border-2 border-dashed border-gray-500 bg-transparent rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    Upload a File
                  </button>
                </div>

                {isUploadModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
                      <h2 className="text-2xl font-bold mb-4">Upload a File</h2>

                      {/* Folder Selector */}
                      <select
                        className="w-full p-2 mb-4 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
                        value={selectedFolder}
                        onChange={(e) => setSelectedFolder(e.target.value)}
                      >
                        <option value="" disabled>
                          Select a folder
                        </option>
                        {allFolders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>

                      {/* File Input */}
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />

                      {/* Upload Button */}
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`w-full px-4 py-2 rounded mb-4 ${
                          uploading
                            ? "bg-gray-500 text-white cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600"
                        }`}
                      >
                        {uploading ? "Uploading..." : "Upload"}
                      </button>

                      {/* Error Message */}
                      {error && <p className="text-red-500 mb-4">{error}</p>}

                      {/* Success Message */}
                      {downloadURL && (
                        <p className="text-green-500 mb-4">
                          File uploaded successfully!{" "}
                          <a
                            href={downloadURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 underline"
                          >
                            View file
                          </a>
                        </p>
                      )}

                      {/* Close Modal Button */}
                      <button
                        onClick={() => setIsUploadModalOpen(false)}
                        className="w-full bg-red-500 text-white px-4 py-2 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab Navigation */}
                <div className="flex space-x-4 mb-6 border-b border-gray-300 dark:border-gray-700">
                  <button
                    className={`px-4 py-2 font-semibold ${
                      activeTab === "all"
                        ? "border-b-2 border-blue-500"
                        : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("all")}
                  >
                    All Files
                  </button>
                  <button
                    className={`px-4 py-2 font-semibold ${
                      activeTab === "my"
                        ? "border-b-2 border-blue-500"
                        : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("my")}
                  >
                    My Files
                  </button>
                  <button
                    className={`px-4 py-2 font-semibold ${
                      activeTab === "team"
                        ? "border-b-2 border-blue-500"
                        : "text-gray-500"
                    }`}
                    onClick={() => setActiveTab("team")}
                  >
                    Team Files
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === "all" && (
                  <div>
                    {/* Admin View: All Folders */}
                    {allFolders.map((folder) => (
                      <div key={folder.id} className="block">
                        <Link
                          href={`/folders/${folder.id}`} // Navigate to the folder
                          passHref
                          className="block" // Makes the container pressable
                        >
                          <div className="border mt-3 border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            {/* Folder Details */}
                            <div>
                              <h3 className="font-semibold">{folder.name}</h3>
                              <p className="text-sm text-gray-500">
                                Created:{" "}
                                {folder.createdAt?.seconds
                                  ? new Date(
                                      folder.createdAt.seconds * 1000
                                    ).toLocaleDateString()
                                  : "Unknown"}
                              </p>
                            </div>

                            {/* Favorite Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault(); // Prevent Link navigation
                                toggleFavorite(folder.id); // Toggle favorite
                              }}
                              className={`p-2 rounded-full ml-auto ${
                                user.favoriteFolders.includes(folder.id)
                                  ? "text-red-500"
                                  : "text-gray-500"
                              } hover:text-red-500`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill={
                                  user.favoriteFolders.includes(folder.id)
                                    ? "currentColor"
                                    : "none"
                                }
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                                className="w-6 h-6"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 21l-1.45-1.34C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.16L12 21z"
                                />
                              </svg>
                            </button>
                          </div>
                        </Link>
                      </div>
                    ))}

                    {/* Create New Folder Button */}
                    <button
                      onClick={() => setIsFolderModalOpen(true)}
                      className="w-full mt-4 px-4 py-2 text-gray-800 dark:text-gray-200 border-2 border-dashed border-gray-500 bg-transparent rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                      Create New Folder
                    </button>
                  </div>
                )}

                {/* Admin View: My Files */}
                {activeTab === "my" && (
                  <div>
                    {user?.myFiles.length > 0 ? (
                      <ul className="space-y-4">
                        {user.myFiles.map((file, index) => (
                          <li
                            key={index}
                            className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <Link
                              href={`/viewFile/${file.id}`}
                              className="flex justify-between items-center"
                            >
                              <span>{file.fileName || "Unnamed File"}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {file.dateGiven
                                  ? new Date(
                                      file.dateGiven
                                    ).toLocaleDateString()
                                  : "No Date"}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        No files found.
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              // Non-Admin View
              <>
                <h2 className="text-2xl font-semibold mb-4">All Files</h2>

                {/* Non-Admin View */}
                {user?.myFiles?.length > 0 ? (
                  <ul className="space-y-4">
                    {user?.myFiles
                      .slice()
                      ?.sort((a, b) =>
                        (a?.fileName || "").localeCompare(b?.fileName || "")
                      )
                      .map((file, index) => (
                        <li
                          key={index}
                          className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <Link
                            href={`/viewFile/${file.fileId}`} // Update to your file-specific route structure
                            className="flex justify-between items-center"
                          >
                            <span>{file.fileName}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {file.assignedAt
                                ? new Date(
                                    file.assignedAt.seconds * 1000
                                  ).toLocaleDateString()
                                : "No Date"}
                            </span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    No files found.
                  </p>
                )}
              </>
            )}
          </section>

          {isFolderModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-semibold mb-6 text-center">
                  Create New Folder
                </h2>
                <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full mb-4 p-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                  placeholder="Enter folder name"
                />
                <button
                  onClick={handleCreateNewFolder}
                  className="w-full bg-blue-500 text-white dark:bg-blue-700 px-4 py-2 rounded mb-4"
                >
                  Create Folder
                </button>
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
