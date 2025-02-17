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
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { db, storage } from "../../firebase/firebase";
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
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [error, setError] = useState(null);
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

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // ✅ Generate a unique fileId
      const fileId = doc(collection(db, "files")).id;

      // ✅ Ensure file is uploaded to the current folder
      const storageRef = ref(storage, `${folderId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // ✅ Modify `fileData` to ensure correct folder association
      const fileData = {
        fileId,
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        pieceDescription: "No description provided.",
        previouslyOwned: [],
        editedVersions: [],
        trackRecord: [],
        folderId: folderId, // ✅ Ensure the correct folder ID is stored
      };

      // ✅ Create Firestore reference for file
      const fileRef = doc(db, "files", fileId);
      await setDoc(fileRef, fileData);

      // ✅ Store reference in the folder’s Firestore collection
      await setDoc(doc(db, "folders", folderId, "files", fileId), {
        fileRef: `/files/${fileId}`, // ✅ Store as a string path
      });

      console.log("File uploaded successfully:", fileId);
      fetchFolderData(); // Refresh file list after upload
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
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

  const handleAssignFileToUser = async (userId, file) => {
    try {
      if (!userId || !file?.id) {
        console.error("Invalid user or file data.");
        return;
      }

      const userRef = doc(db, "users", userId);
      const userSnapshot = await getDoc(userRef);

      const topLevelFileRef = doc(db, "files", file.id);
      const fileSnapshot = await getDoc(topLevelFileRef);

      if (!fileSnapshot.exists()) {
        console.error("File does not exist in Firestore.");
        return;
      }

      if (!userSnapshot.exists()) {
        console.error("Selected user does not exist.");
        return;
      }

      const userData = userSnapshot.data();

      // ✅ New structure for assignment history
      const assignmentEntry = {
        dateGiven: new Date().toISOString(),
        userId: user.uid, // The admin/assigner who is making the assignment
        assignedUser: userId, // The user receiving the file
      };

      console.log("Assigning file:", {
        fileName: file.fileName,
        assigner: user.uid,
        assignedTo: userId,
      });

      // ✅ Update the file document with the new `previouslyOwned` entry
      await updateDoc(topLevelFileRef, {
        previouslyOwned: arrayUnion(assignmentEntry),
      });

      // ✅ Assign file reference to the selected user
      const fileEntry = {
        fileRef: topLevelFileRef, // Store the document reference
        dateGiven: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        myFiles: arrayUnion(fileEntry),
      });

      setAssignMessage({
        type: "success",
        text: `File "${file.fileName}" successfully assigned to ${
          userData.name || userData.email || "this user"
        }.`,
      });

      console.log(
        `✅ File assigned to ${userId}. Assignment entry stored:`,
        assignmentEntry
      );
    } catch (err) {
      console.error("❌ Error assigning file to user:", err);
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
    <main className="flex min-h-screen bg-mainBg text-white">
      <aside className="w-64 bg-asideBg p-4">
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
          {/* Upload File Container - Always First */}
          <div
            className="border border-dashed border-gray-500 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-center gap-2"
            onClick={() => setIsUploadModalOpen(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-6 h-6 text-gray-500 dark:text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span className="font-bold text-gray-700 dark:text-gray-300">
              Upload File
            </span>
          </div>

          {/* Render Actual Files */}
          {files.length > 0 ? (
            files.map((file) => (
              <div
                key={file.id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleFileClick(file.id)}
              >
                <span className="font-bold">{file.fileName}</span>
              </div>
            ))
          ) : (
            <></> // Don't show "No files found" because upload button is always there
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
            {isUploadModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
                  <h2 className="text-2xl font-bold mb-4">Upload a File</h2>

                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />

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

                  {error && <p className="text-red-500 mb-4">{error}</p>}

                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded"
                  >
                    Cancel
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
