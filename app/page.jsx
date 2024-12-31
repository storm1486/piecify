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
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useUser } from "@/src/context/UserContext";

export default function Home() {
  const {
    user,
    setUser,
    loading,
    isLoginModalOpen,
    openLoginModal,
    closeLoginModal,
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

  if (loading) {
    return <p>Loading...</p>; // Show a loading state while fetching user data
  }

  const handleLogout = () => {
    setUser(null); // Clear user state
    openLoginModal(); // Show the login modal
  };

  const handleLogin = async () => {
    try {
      setLoginError(""); // Clear previous errors
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        loginPassword
      );
      setCurrentUser(userCredential.user); // Set the current user
      setLoginEmail("");
      setLoginPassword(""); // Clear the inputs
    } catch (error) {
      console.error("Error logging in:", error);
      setLoginError(error.message); // Display error message
    }
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
      const storageRef = ref(storage, `${selectedFolder}/${file.name}`);
      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);
      setDownloadURL(url);

      // Store the file information in Firestore under the selected folder
      await addDoc(collection(db, "folders", selectedFolder, "files"), {
        userId: user.uid, // Replace with actual user ID
        fileName: file.name,
        fileUrl: url,
        uploadedAt: new Date(),
      });
    } catch (err) {
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

  const handleSignup = async (email, password, role = "user") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Add user to Firestore with default arrays
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role, // Default role is "user"
        favoriteFolders: [],
        viewableFolders: [],
        myFiles: [],
      });

      console.log("User created and added to Firestore:", user.uid);

      // Close the modal and reset inputs
      setIsSignUpModalOpen(false);
      setSignupEmail("");
      setSignupPassword("");
      setSignupRole("user");
      setSignupError("");
    } catch (error) {
      console.error("Error signing up:", error);
      setSignupError(error.message); // Display error message if sign-up fails
    }
  };

  return (
    <main className="flex min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 text-black dark:bg-gray-800 dark:text-white p-4">
        <h1 className="text-4xl font-bold mb-4">Piecify</h1>

        {user ? (
          <div className="mb-6">
            <p className="text-sm">Logged in as:</p>
            <p className="font-bold">{user.email}</p>
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

        {/* Favorited Section */}
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">Favorited</h3>
          <ul className="space-y-2">
            {folders
              .filter((folder) => favorites.includes(folder.id)) // Show folders that are in favorites
              .map((folder) => (
                <li key={folder.id} className="text-sm">
                  <Link
                    href={`/folders/${folder.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    {folder.name}
                  </Link>
                </li>
              ))}
            {folders.filter((folder) => favorites.includes(folder.id))
              .length === 0 && (
              <p className="text-sm text-gray-500">No favorites yet.</p>
            )}
          </ul>
        </div>
      </aside>

      {/* Login Modal */}
      {!user && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
            <h2 className="text-2xl font-semibold mb-6 text-center">Log In</h2>

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

            {/* Buttons */}
            <button
              onClick={handleLogin}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded mb-4"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <section className="flex-1 p-8 flex flex-col items-center justify-center">
        {/* Search Bar */}
        <div className="w-full mb-6">
          <input
            type="text"
            placeholder="Search folders..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setIsSignUpModalOpen(true)}
          className="bg-green-500 text-white px-4 py-2 rounded mb-4"
        >
          Create Account
        </button>

        {/* Sign Up Modal */}
        {isSignUpModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Sign Up
              </h2>

              {/* Email Input */}
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Email
              </label>
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter email"
              />

              {/* Password Input */}
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Password
              </label>
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
                placeholder="Enter password"
              />

              {/* Role Selection */}
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Role
              </label>
              <select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value)}
                className="w-full mb-4 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white text-black dark:bg-gray-700 dark:text-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              {/* Error Message */}
              {signupError && (
                <p className="text-red-500 mb-4">{signupError}</p>
              )}

              {/* Buttons */}
              <button
                onClick={() =>
                  handleSignup(signupEmail, signupPassword, signupRole)
                }
                className="w-full bg-blue-500 text-white px-4 py-2 rounded mb-4"
              >
                Sign Up
              </button>
              <button
                onClick={() => setIsSignUpModalOpen(false)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {/* Display Folders */}
        <div className="flex-grow w-full mb-8">
          <section className="flex-1 p-8">
            {user?.role === "admin" ? (
              // Admin View with Tabs
              <>
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
                </div>

                {/* Tab Content */}
                {activeTab === "all" && (
                  <div>
                    {/* Admin View: All Folders */}
                    {allFolders.length > 0 ? (
                      <ul className="space-y-4">
                        {allFolders.map((folder) => (
                          <li
                            key={folder.id}
                            className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <Link
                              href={`/folders/${folder.id}`}
                              className="flex justify-between items-center"
                            >
                              <span>{folder.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        No folders available.
                      </p>
                    )}
                  </div>
                )}

                {/* Admin View: My Files */}
                {activeTab === "my" && (
                  <div>
                    {user?.myFiles.length > 0 ? (
                      <ul className="space-y-4">
                        {user?.myFiles.map((file, index) => (
                          <li
                            key={index}
                            className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                          >
                            <Link
                              href={`/files/${file.fileName}`} // Update to your file-specific route structure
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
                  </div>
                )}
              </>
            ) : (
              // Non-Admin View
              <>
                <h2 className="text-2xl font-semibold mb-4">All Files</h2>

                {/* Non-Admin View */}
                {user?.myFiles.length > 0 ? (
                  <ul className="space-y-4">
                    {user?.myFiles.map((file, index) => (
                      <li
                        key={index}
                        className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <Link
                          href={`/files/${file.fileName}`} // Update to your file-specific route structure
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
