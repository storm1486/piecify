"use client"; // Ensure the component is client-side

import { useParams, useRouter } from "next/navigation"; // Use next/navigation for App Router
import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore"; // Import Firestore methods
import { db } from "../../firebase/firebase"; // Adjust the path based on your setup
import Link from "next/link";

export default function FolderPage() {
  const { folderId } = useParams(); // Get folderId from the dynamic route
  const [isReady, setIsReady] = useState(false);
  const [files, setFiles] = useState([]); // State to store the list of files
  const [loading, setLoading] = useState(true); // Loading state
  const [folderName, setFolderName] = useState(""); // State to store the folder name
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
      setFiles(filesList); // Update state with the fetched files

      // Fetch folder name
      const folderDoc = await getDoc(doc(db, "folders", folderId)); // Fetch the folder document
      if (folderDoc.exists()) {
        setFolderName(folderDoc.data().name); // Set the folder name (from the name field)
      }
    } catch (error) {
      console.error("Error fetching files or folder:", error);
    } finally {
      setLoading(false); // End loading
    }
  };

  // Handle file click to navigate to the same document page
  const handleFileClick = (fileId) => {
    router.push(`/viewDocuments/${folderId}/${fileId}`); // Navigate to the document viewing page
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
