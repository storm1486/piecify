"use client";
import { useState, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase/firebase"; // Adjust the path as necessary
import { collection, addDoc, getDocs } from "firebase/firestore";
import Link from "next/link";

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState(null);
  const [error, setError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAscending, setIsAscending] = useState(true); // State for sorting direction
  const [favorites, setFavorites] = useState([]); // State to track favorite folders

  useEffect(() => {
    const fetchFolders = async () => {
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

      setFolders(folderList);
    };

    fetchFolders();
  }, []);

  const handleToggleFavorite = (folderId) => {
    if (favorites.includes(folderId)) {
      setFavorites(favorites.filter((id) => id !== folderId)); // Remove from favorites
    } else {
      setFavorites([...favorites, folderId]); // Add to favorites
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

  return (
    <main className="flex min-h-screen bg-gray-100 text-black dark:bg-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 text-black dark:bg-gray-800 dark:text-white p-4">
        <h2 className="text-xl font-semibold mb-4">Navigation</h2>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Pieceify</h1>

        {/* Display Folders */}
        <div className="w-full mb-8">
          <h2 className="text-2xl font-semibold mb-4">All Files</h2>

          {/* Filter/Description Header */}
          <div className="flex justify-between px-4 py-2 border-b border-gray-300 dark:border-gray-700">
            <span
              className="font-bold cursor-pointer"
              onClick={handleSortByName}
            >
              Name {isAscending ? "↑" : "↓"}
            </span>
            <span className="font-bold">Date Created</span>
          </div>

          <ul className="space-y-2">
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                <div className="flex justify-between p-4 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg">
                  {/* Display folder name with navigation */}
                  <Link href={`/folders/${folder.id}`}>
                    <span className="cursor-pointer">{folder.name}</span>
                  </Link>

                  <div className="flex items-center">
                    {/* Favorite Button */}
                    <button
                      onClick={(event) => {
                        event.stopPropagation(); // Prevent navigation
                        handleToggleFavorite(folder.id);
                      }}
                      className={`mr-4 text-xl ${
                        favorites.includes(folder.id)
                          ? "text-yellow-500"
                          : "text-gray-400"
                      }`}
                    >
                      ★
                    </button>

                    {/* Display formatted date */}
                    <span>
                      {folder.createdAt
                        ? `${
                            folder.createdAt.getMonth() + 1
                          }/${folder.createdAt.getDate()}/${folder.createdAt
                            .getFullYear()
                            .toString()
                            .slice(-2)}`
                        : "No Date"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

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

              {/* Folder Label and Selection */}
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Select Folder
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full mb-4 p-2 border border-gray-300 bg-white text-black dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded"
              >
                <option value="" disabled>
                  Select Folder to Upload
                </option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>

              {/* File Upload Label and Input */}
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
                Select File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full mb-4 p-2 text-black dark:text-white"
              />

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                className="w-full bg-blue-500 text-white dark:bg-blue-700 px-4 py-2 rounded mb-4"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>

              {error && (
                <p className="text-red-500 dark:text-red-300 mt-4 text-center">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
