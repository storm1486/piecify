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

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState(null);
  const [error, setError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAscending, setIsAscending] = useState(true); // State for sorting direction
  const [favorites, setFavorites] = useState([]); // State to track favorite folders
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("user");
  const [signupError, setSignupError] = useState("");
  const [myFiles, setMyFiles] = useState([]); // State for storing user's files
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user); // Set the logged-in user
        await fetchFavorites(); // Fetch favorites as soon as user logs in
        await fetchFolders(); // Fetch folders
      } else {
        clearState(); // Clear state on logout
        console.log("User logged out.");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFavorites(); // Re-fetch favorites whenever currentUser is updated
    }
  }, [currentUser]);

  const fetchMyFiles = async () => {
    try {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setMyFiles(userData.myFiles || []); // Update state with `myFiles`
        } else {
          console.warn("User document does not exist.");
          setMyFiles([]); // Reset files if no document is found
        }
      }
    } catch (error) {
      console.error("Error fetching user's files:", error);
      setError("Unable to fetch files. Please try again.");
    }
  };

  // Call `fetchMyFiles` after login or authentication state changes
  useEffect(() => {
    if (currentUser) {
      fetchMyFiles(); // Fetch user's files
    }
  }, [currentUser]);

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

  const clearState = () => {
    setFavorites([]);
    setFolders([]);
    setDownloadURL(null);
    setSelectedFolder("");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearState();
      setCurrentUser(null);
      console.log("User logged out and state reset.");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const fetchFavorites = async () => {
    try {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid); // Reference to the user's document
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("Fetched favorite folders:", userData.favoriteFolders);
          setFavorites(userData.favoriteFolders || []); // Store the user's favorite folders
        } else {
          console.warn("User document does not exist");
          setFavorites([]); // Reset favorites if no document found
        }
      }
    } catch (error) {
      console.error("Error fetching favorite folders:", error);
    }
  };

  const fetchFolders = async () => {
    try {
      const folderList = [];
      const folderSnapshot = await getDocs(collection(db, "folders"));

      folderSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          folderList.push({
            id: doc.id,
            name: data.name,
            createdAt: data.createdAt?.toDate(),
          });
        }
      });

      setFolders(folderList); // Update folders state
    } catch (error) {
      console.error("Error fetching folders:", error);
      setError(
        "Unable to fetch folders. Please ensure you have the necessary permissions."
      );
    }
  };

  const loadUserData = async () => {
    if (currentUser) {
      await fetchFavorites(); // Fetch favorite folders for the logged-in user
    }
  };

  const handleToggleFavorite = async (folderId) => {
    try {
      if (!currentUser) {
        console.error("User is not logged in");
        return;
      }

      const userDocRef = doc(db, "users", currentUser.uid); // Correct document reference
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedFavorites = userData.favoriteFolders || [];

        if (updatedFavorites.includes(folderId)) {
          // Remove folder from favorites
          const filteredFavorites = updatedFavorites.filter(
            (id) => id !== folderId
          );
          await setDoc(
            userDocRef,
            { favoriteFolders: filteredFavorites },
            { merge: true } // Ensures only 'favoriteFolders' is updated
          );
          setFavorites(filteredFavorites); // Update local state
        } else {
          // Add folder to favorites
          updatedFavorites.push(folderId);
          await setDoc(
            userDocRef,
            { favoriteFolders: updatedFavorites },
            { merge: true }
          );
          setFavorites(updatedFavorites); // Update local state
        }
      } else {
        console.error("User document does not exist");
      }
    } catch (error) {
      console.error("Error updating favorite folders:", error);
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
        userId: "user's-uid", // Replace with actual user ID
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
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 text-black dark:bg-gray-800 dark:text-white p-4">
        <h1 className="text-4xl font-bold mb-4">Piecify</h1>

        {currentUser ? (
          <div className="mb-6">
            <p className="text-sm">Logged in as:</p>
            <p className="font-bold">{currentUser.email}</p>
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
      {!currentUser && (
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
          <h2 className="text-2xl font-semibold mb-4">All Files</h2>

          {/* Filter/Description Header */}
          <div className="flex justify-between px-4 py-2 border-b border-gray-300 dark:border-gray-700 mb-4">
            <span
              className="font-bold cursor-pointer"
              onClick={handleSortByName}
            >
              Name {isAscending ? "↑" : "↓"}
            </span>
            <span className="font-bold">Date Created</span>
          </div>

          <ul className="space-y-2">
            {myFiles.length > 0 ? (
              <ul className="space-y-4">
                {myFiles.map((file, index) => (
                  <li
                    key={index}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 flex justify-between items-center bg-white dark:bg-gray-800"
                  >
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {file.fileName}
                    </a>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {file.assignedAt
                        ? new Date(
                            file.assignedAt.seconds * 1000
                          ).toLocaleDateString()
                        : "No Date"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                No files found.
              </p>
            )}
            <li
              className="border border-dashed border-gray-400 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 p-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={() => setIsFolderModalOpen(true)}
            >
              <div className="flex justify-center items-center text-gray-500 dark:text-gray-300">
                + Create New Folder
              </div>
            </li>
          </ul>
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
