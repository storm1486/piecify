"use client";

import { useParams, useRouter } from "next/navigation"; // Use next/navigation for App Router
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore"; // Firestore methods
import { db, auth } from "../../firebase/firebase"; // Firebase setup
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
  const [fileError, setFileError] = useState(null); // File error state
  const [userError, setUserError] = useState(null); // User error state
  const [selectedUser, setSelectedUser] = useState(null); // To store the selected user ID
  const router = useRouter(); // For navigation

  useEffect(() => {
    if (folderId) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          await fetchUsers(user); // Call fetchUsers when a user is authenticated
          await fetchFiles(); // Fetch folder files and name
        } else {
          setUserError("You must be logged in to access this data.");
          setLoadingUsers(false);
        }
      });

      return () => unsubscribe(); // Cleanup the listener on component unmount
    }
  }, [folderId]);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      // Fetch files in the folder
      const filesSnapshot = await getDocs(
        collection(db, "folders", folderId, "files")
      );
      const filesList = [];
      filesSnapshot.forEach((doc) => {
        filesList.push({ id: doc.id, ...doc.data() });
      });
      setFiles(filesList);

      // Fetch folder name
      const folderDoc = await getDoc(doc(db, "folders", folderId));
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name || "Untitled Folder");
        setIsReady(true); // Set isReady to true after fetching the folder name
      } else {
        console.error(`Folder with ID ${folderId} does not exist.`);
        setFolderName("Unknown Folder");
      }
    } catch (error) {
      console.error("Error fetching files or folder:", error);
      setFileError("Error loading folder data. Please try again later.");
      setFolderName("Error Loading Folder");
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

  const handleAssignFileToUser = async (userId, file) => {
    try {
      const userRef = doc(db, "users", userId); // Reference to the user's document
      await updateDoc(userRef, {
        myFiles: arrayUnion({
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          assignedAt: new Date(),
        }),
      });

      alert(`File "${file.fileName}" successfully assigned to ${userId}.`);
      setIsModalOpen(false); // Close the modal after assigning
    } catch (err) {
      console.error("Error assigning file to user:", err);
      setFileError("Failed to assign file. Please try again.");
    }
  };

  const handleFileClick = (fileId) => {
    router.push(`/viewDocuments/${folderId}/${fileId}`); // Navigate to the file viewing page
  };

  console.log(folderName);

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

        {users.length > 0 ? (
          <ul>
            {users.map((user) => (
              <li key={user.id} className="mb-4">
                <div>
                  <p>
                    {user.name || "Anonymous"} (
                    {user.email || "No email provided"})
                  </p>
                  <button
                    onClick={() => {
                      setSelectedUser(user.id); // Set the selected user ID
                      setIsModalOpen(true); // Open the modal
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Assign File
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No users found.</p>
        )}

        {/* Assign File Modal */}
        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Assign File to{" "}
                {users.find((user) => user.id === selectedUser)?.name || "User"}
              </h2>
              {files.length > 0 ? (
                <ul className="mb-4">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="mb-2 flex justify-between items-center"
                    >
                      <span>{file.fileName}</span>
                      <button
                        onClick={() =>
                          handleAssignFileToUser(selectedUser, file)
                        }
                        className="bg-green-500 text-white px-4 py-2 rounded"
                      >
                        Assign
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No files available to assign.</p>
              )}
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
      </section>
    </main>
  );
}
