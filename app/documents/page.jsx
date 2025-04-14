"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { db } from "../firebase/firebase"; // Adjust the path as necessary
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function Documents() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const router = useRouter(); // Initialize useRouter

  useEffect(() => {
    const fetchFolders = async () => {
      const folderList = [];

      // Get all documents (folders)
      const collections = await getDocs(collection(db, "folders"));
      collections.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          folderList.push({ id: doc.id, name: data.name });
        }
      });

      setFolders(folderList);
    };

    fetchFolders();
  }, []);

  const fetchFiles = async (folderId) => {
    setSelectedFolder(folderId);
    const filesList = [];

    const filesSnapshot = await getDocs(
      collection(db, "folders", folderId, "files")
    );
    filesSnapshot.forEach((doc) => {
      filesList.push({ id: doc.id, ...doc.data() });
    });

    setFiles(filesList);
  };

  const handleFileClick = (fileId) => {
    // Navigate to the view document page with the selected file ID
    if (selectedFolder) {
      router.push(`/viewDocuments/${selectedFolder}/${fileId}`);
    } else {
      console.error("No folder selected.");
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("Enter the name of the new folder:");

    if (folderName && folderName.trim()) {
      try {
        const folderRef = collection(db, "folders");
        const docRef = await addDoc(folderRef, {
          name: folderName,
          createdAt: new Date().toISOString(),
        });

        setFolders([...folders, { id: docRef.id, name: folderName }]);
      } catch (error) {
        console.error("Error creating folder:", error);
      }
    } else {
      alert("Folder name cannot be empty.");
    }
  };

  return (
    <main className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 p-4 flex flex-col">
        <Link href="/" passHref>
          <button className="bg-blue-500 text-white px-4 py-2 rounded mb-4">
            Home
          </button>
        </Link>

        <h2 className="text-xl font-semibold mb-4">Your Folders</h2>

        {/* Plus button to create a new folder */}
        <button
          onClick={handleCreateFolder}
          className="bg-green-500 text-white px-2 py-1 mb-4 rounded-full"
        >
          +
        </button>

        <ul className="space-y-2 flex-1 overflow-y-auto">
          {folders.length > 0 ? (
            folders.map((folder) => (
              <li key={folder.id}>
                <button
                  onClick={() => fetchFiles(folder.id)}
                  className="text-blue-600 underline block truncate text-left w-full"
                >
                  {folder.name}
                </button>
              </li>
            ))
          ) : (
            <p className="text-gray-600">No folders available.</p>
          )}
        </ul>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-8">
        <h1 className="text-4xl font-bold mb-4">
          {selectedFolder
            ? `Files in Folder: ${
                folders.find((f) => f.id === selectedFolder)?.name
              }`
            : "Documents Page"}
        </h1>
        {selectedFolder ? (
          files.length > 0 ? (
            <ul>
              {files.map((file) => (
                <li key={file.id} className="mb-4">
                  <button
                    onClick={() => handleFileClick(file.id)}
                    className="text-blue-600 underline block"
                  >
                    {file.fileName}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No files in this folder.</p>
          )
        ) : (
          <p>Select a folder to view its contents or create a new folder.</p>
        )}
      </section>
    </main>
  );
}
