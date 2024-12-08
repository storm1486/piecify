"use client"; // Ensure the component is client-side

import { useParams, useRouter } from "next/navigation"; // Use next/navigation for App Router
import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc, addDoc } from "firebase/firestore"; // Import Firestore methods
import { db, storage } from "../../firebase/firebase"; // Adjust the path based on your setup
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase storage methods
import Link from "next/link";

export default function FolderPage() {
  const { folderId } = useParams(); // Get folderId from the dynamic route
  const [isReady, setIsReady] = useState(false);
  const [files, setFiles] = useState([]); // State to store the list of files
  const [loading, setLoading] = useState(true); // Loading state
  const [folderName, setFolderName] = useState(""); // State to store the folder name
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [file, setFile] = useState(null); // Selected file state
  const [uploading, setUploading] = useState(false); // Upload state
  const [error, setError] = useState(null); // Error state
  const router = useRouter(); // For navigation

  useEffect(() => {
    if (folderId) {
      setIsReady(true); // Indicate that the page is ready to render
      fetchFiles(); // Fetch files once folderId is available
    }
  }, [folderId]);

  const fetchFiles = async () => {
    setLoading(true);
    const filesList = [];
    try {
      // Fetch files inside the folder
      const filesSnapshot = await getDocs(
        collection(db, "folders", folderId, "files")
      );
      filesSnapshot.forEach((doc) => {
        filesList.push({ id: doc.id, ...doc.data() });
      });

      if (filesList.length === 0) {
        console.warn(`No files found in folder ${folderId}`);
      }
      setFiles(filesList); // Update state with the fetched files

      // Fetch folder name
      const folderDoc = await getDoc(doc(db, "folders", folderId)); // Fetch the folder document
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name); // Set the folder name (from the name field)
      } else {
        console.error(`Folder with ID ${folderId} does not exist.`);
        setFolderName("Unknown Folder");
      }
    } catch (error) {
      console.error("Error fetching files or folder:", error);
      setError("Error loading folder data. Please try again later.");
    } finally {
      setLoading(false); // End loading
    }
  };
  console.log("Folder ID:", folderId);

  const handleFileClick = (fileId) => {
    router.push(`/viewDocuments/${folderId}/${fileId}`); // Navigate to the document viewing page
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
      const storageRef = ref(storage, `${folderId}/${file.name}`);
      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);

      // Store file info in Firestore
      await addDoc(collection(db, "folders", folderId, "files"), {
        fileName: file.name,
        fileUrl: url,
        uploadedAt: new Date(),
      });

      // Refresh file list after upload
      fetchFiles();
      setIsModalOpen(false);
      setFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 text-black dark:bg-gray-800 dark:text-white p-4">
        <Link href="/">
          <div className="block p-2 bg-blue-500 text-white dark:bg-blue-700 rounded text-center">
            Home
          </div>
        </Link>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">
          {isReady ? `${folderName}` : "Loading..."}
        </h1>

        {/* Upload File Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 text-white px-4 py-2 rounded mb-4"
        >
          Upload File
        </button>

        {/* File Upload Modal */}
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
              {error && (
                <p className="text-red-500 dark:text-red-300 mt-4">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Display loading state */}
        {loading ? (
          <p>Loading files...</p>
        ) : (
          <>
            {/* Display list of files */}
            {files.length > 0 ? (
              <ul>
                {files.map((file) => (
                  <li key={file.id} className="mb-4">
                    <button
                      onClick={() => handleFileClick(file.id)} // Navigate on file click
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
      </section>
    </main>
  );
}
