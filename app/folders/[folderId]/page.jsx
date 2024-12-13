"use client"; // Ensure the component is client-side

import { useParams, useRouter } from "next/navigation"; // Use next/navigation for App Router
import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc, addDoc } from "firebase/firestore"; // Import Firestore methods
import { db, storage, auth } from "../../firebase/firebase"; // Adjust the path based on your setup
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase storage methods
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";

export default function FolderPage() {
  const { folderId } = useParams(); // Get folderId from the dynamic route
  const [isReady, setIsReady] = useState(false);
  const [files, setFiles] = useState([]); // State to store the list of files
  const [users, setUsers] = useState([]); // State to store the list of users
  const [loadingFiles, setLoadingFiles] = useState(true); // Loading state for files
  const [loadingUsers, setLoadingUsers] = useState(true); // Loading state for users
  const [folderName, setFolderName] = useState(""); // State to store the folder name
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [file, setFile] = useState(null); // Selected file state
  const [uploading, setUploading] = useState(false); // Upload state
  const [fileError, setFileError] = useState(null); // File error state
  const [userError, setUserError] = useState(null); // User error state
  const router = useRouter(); // For navigation

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUsers(user); // Call fetchUsers when a user is authenticated
        if (folderId) {
          await fetchFiles(); // Fetch files only after verifying authentication
        }
      } else {
        setUserError("You must be logged in to access this data.");
        setLoadingUsers(false);
      }
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, [folderId]);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    const filesList = [];
    try {
      const filesSnapshot = await getDocs(
        collection(db, "folders", folderId, "files")
      );
      filesSnapshot.forEach((doc) => {
        filesList.push({ id: doc.id, ...doc.data() });
      });

      if (filesList.length === 0) {
        console.warn(`No files found in folder ${folderId}`);
      }
      setFiles(filesList);

      const folderDoc = await getDoc(doc(db, "folders", folderId));
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name);
      } else {
        console.error(`Folder with ID ${folderId} does not exist.`);
        setFolderName("Unknown Folder");
      }
    } catch (error) {
      console.error("Error fetching files or folder:", error);
      setFileError("Error loading folder data. Please try again later.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchUsers = async (currentUser) => {
    setLoadingUsers(true);
    try {
      const currentUserRef = doc(db, "users", currentUser.uid); // Get the current user's document
      const currentUserSnap = await getDoc(currentUserRef);

      if (
        !currentUserSnap.exists() ||
        currentUserSnap.data().role !== "admin"
      ) {
        console.error("Access denied. Only admins can view all users.");
        setUserError("You do not have permission to view this data.");
        setLoadingUsers(false);
        return;
      }

      const usersList = [];
      const usersSnapshot = await getDocs(collection(db, "users")); // Fetch "users" collection
      usersSnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersList); // Update users state
    } catch (error) {
      console.error("Error fetching users:", error);
      setUserError("Error loading user data. Please try again later.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFileClick = (fileId) => {
    router.push(`/viewDocuments/${folderId}/${fileId}`);
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setFileError("Please select a file.");
      return;
    }
    setUploading(true);
    setFileError(null);

    try {
      const storageRef = ref(storage, `${folderId}/${file.name}`);
      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "folders", folderId, "files"), {
        fileName: file.name,
        fileUrl: url,
        uploadedAt: new Date(),
      });

      fetchFiles();
      setIsModalOpen(false);
      setFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      setFileError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white">
      <aside className="w-64 bg-gray-200 text-black dark:bg-gray-800 dark:text-white p-4">
        <Link href="/">
          <div className="block p-2 bg-blue-500 text-white dark:bg-blue-700 rounded text-center">
            Home
          </div>
        </Link>
      </aside>

      <section className="flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">
          {isReady ? `${folderName}` : "Loading..."}
        </h1>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 text-white px-4 py-2 rounded mb-4"
        >
          Upload File
        </button>

        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Upload a File
              </h2>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full mb-4 p-2 text-black dark:text-white"
              />
              <button
                onClick={handleUpload}
                className="w-full bg-blue-500 text-white dark:bg-blue-700 px-4 py-2 rounded mb-4"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
              {fileError && (
                <p className="text-red-500 dark:text-red-300 mt-4">
                  {fileError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* File Loading */}
        {loadingFiles ? (
          <p>Loading files...</p>
        ) : (
          <>
            {files.length > 0 ? (
              <ul>
                {files.map((file) => (
                  <li key={file.id} className="mb-4">
                    <button
                      onClick={() => handleFileClick(file.id)}
                      className="text-blue-600 underline"
                    >
                      {file.fileName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No files found in this folder.</p>
            )}
          </>
        )}

        {/* Users Section */}
        <h2 className="text-2xl font-bold mt-8 mb-4">Users</h2>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : userError ? (
          <p className="text-red-500">{userError}</p>
        ) : users.length > 0 ? (
          <ul>
            {users.map((user) => (
              <li key={user.id} className="mb-2">
                {user.name || "Anonymous"} ({user.email || "No email provided"})
              </li>
            ))}
          </ul>
        ) : (
          <p>No users found.</p>
        )}
      </section>
    </main>
  );
}
