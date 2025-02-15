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

export default function FolderPage() {
  const { folderId } = useParams();
  const router = useRouter();
  const { user, fetchMyFiles, loading } = useUser();
  const [folderName, setFolderName] = useState("");
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [assignMessage, setAssignMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // State for managing spinner

  useEffect(() => {
    if (!loading && user && folderId) {
      fetchFolderData();
    }
  }, [loading, user, folderId]);

  useEffect(() => {
    if (isModalOpen && user && user.role === "admin") {
      fetchUsers();
    }
  }, [isModalOpen, user]);

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

  console.log(users);

  console.log("selecteduser", selectedUser);

  const fetchFolderData = async () => {
    try {
      setIsLoading(true); // Start spinner

      const folderDoc = await getDoc(doc(db, "folders", folderId));
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name || "Untitled Folder");
      } else {
        setFolderName("Unknown Folder");
        console.error(`Folder with ID ${folderId} does not exist.`);
        return;
      }

      // Fetch files from the folder collection (but resolve their references)
      const filesSnapshot = await getDocs(
        collection(db, "folders", folderId, "files")
      );

      const filePromises = filesSnapshot.docs.map(async (fileDoc) => {
        const fileRefPath = fileDoc.data().fileRef; // Get the reference to top-level file

        if (fileRefPath) {
          const fileDocRef = doc(db, fileRefPath);
          const fileSnapshot = await getDoc(fileDocRef);

          return fileSnapshot.exists()
            ? { id: fileSnapshot.id, ...fileSnapshot.data() }
            : null;
        }

        return null; // Return null if there's no fileRef
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
      setIsLoading(false); // Stop spinner
    }
  };

  const handleAssignFileToUser = async (userId, file) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);

      // Reference to the top-level file
      const topLevelFileRef = doc(db, "files", file.id);
      const fileSnapshot = await getDoc(topLevelFileRef);

      if (!fileSnapshot.exists()) {
        console.error("File does not exist in top-level Firestore path.");
        return;
      }

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();

        // Ensure myFiles exists and is an array
        const myFiles = Array.isArray(userData.myFiles) ? userData.myFiles : [];

        const isFileAlreadyAssigned = myFiles.some(
          (assignedFile) => assignedFile?.fileRef?.path === topLevelFileRef.path
        );

        if (isFileAlreadyAssigned) {
          setAssignMessage({
            type: "error",
            text: `File "${file.fileName}" is already assigned to ${
              userData.name || "this user"
            }.`,
          });
          return;
        }
      }

      // Prepare the file entry with dateGiven
      const fileEntry = {
        fileRef: topLevelFileRef, // Store the document reference
        dateGiven: new Date().toISOString(), // Store the timestamp
      };

      // Update user's myFiles array with the new file entry
      await updateDoc(userRef, {
        myFiles: arrayUnion(fileEntry),
      });

      setAssignMessage({
        type: "success",
        text: `File "${file.fileName}" successfully assigned to ${
          userSnapshot.data()?.name || "this user"
        }.`,
      });

      console.log(
        `File assigned to new user ${userId} with file reference and dateGiven stored in myFiles.`
      );
    } catch (err) {
      console.error("Error assigning file to user:", err);
      setAssignMessage({
        type: "error",
        text: "Failed to assign file. Please try again.",
      });
    }
  };

  const handleFileClick = (fileId) => {
    router.push(`/viewDocuments/${folderId}/${fileId}`);
  };

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <p>Please log in to access this page.</p>;
  }

  return (
    <main className="flex min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white">
      <aside className="w-64 bg-gray-200 dark:bg-gray-800 p-4">
        <Link href="/">
          <div className="block p-2 bg-blue-500 text-white rounded text-center">
            Home
          </div>
        </Link>
      </aside>

      <section className="flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4">
          {folderName || "Loading..."}
        </h1>

        {user.role === "admin" && (
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => setIsModalOpen(true)}
          >
            Assign Users files from {folderName}
          </button>
        )}

        <h2 className="text-2xl font-bold mt-8 mb-4">All Files</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file.id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleFileClick(file.id)}
              >
                <div className="flex justify-between items-center">
                  <span
                    className="font-bold text-gray-900 dark:text-gray-100 truncate"
                    style={{ maxWidth: "75%" }}
                    title={file.fileName}
                  >
                    {file.fileName}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p>No files found in this folder.</p>
          )}
        </div>

        {user.role === "admin" && (
          <>
            {isModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
                  <h2 className="text-2xl font-semibold mb-6 text-center">
                    Assign File
                  </h2>

                  {/* User Selection */}
                  <div className="mb-4">
                    <label
                      htmlFor="user-select"
                      className="block mb-2 text-lg font-medium"
                    >
                      Select User
                    </label>
                    <select
                      id="user-select"
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedUser || ""}
                      onChange={(e) => setSelectedUser(e.target.value)}
                    >
                      <option value="" disabled>
                        -- Select a User --
                      </option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email || "Unnamed User"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* File Selection */}
                  <div className="mb-4">
                    <label
                      htmlFor="file-select"
                      className="block mb-2 text-lg font-medium"
                    >
                      Select File
                    </label>
                    <select
                      id="file-select"
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedFile || ""}
                      onChange={(e) => setSelectedFile(e.target.value)}
                    >
                      <option value="" disabled>
                        -- Select a File --
                      </option>
                      {files.map((file) => (
                        <option key={file.id} value={file.id}>
                          {file.fileName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assign Button */}
                  <button
                    onClick={async () => {
                      const file = files.find(
                        (file) => file.id === selectedFile
                      );
                      if (file) {
                        await handleAssignFileToUser(selectedUser, file);
                      }
                    }}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded"
                    disabled={!selectedUser || !selectedFile}
                  >
                    Assign File
                  </button>

                  {/* Success or Error Message */}
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

                  {/* Close Modal */}
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setAssignMessage(null); // Clear the message on close
                    }}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded mt-4"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
