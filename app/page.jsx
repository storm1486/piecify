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

  useEffect(() => {
    const fetchFolders = async () => {
      const folderList = [];
      const folderSnapshot = await getDocs(collection(db, "folders"));

      folderSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name) {
          folderList.push({ id: doc.id, name: data.name });
        }
      });

      setFolders(folderList);
    };

    fetchFolders();
  }, []);

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
        <ul className="space-y-2">
          <li>
            <Link href="/documents">
              <div className="block p-2 bg-blue-500 text-white dark:bg-blue-700 rounded text-center">
                Documents Page
              </div>
            </Link>
          </li>
        </ul>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4 dark:text-white">Piecify</h1>

        {/* Display Folders */}
        <div className="w-full mb-8">
          <h2 className="text-2xl font-semibold mb-4">Folders</h2>
          <ul className="space-y-2">
            {folders.map((folder) => (
              <li
                key={folder.id}
                className="border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                <Link href={`/folders/${folder.id}`}>
                  <div className="block p-4 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
                    {folder.name}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Folder Selection for Uploading */}
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="mb-4 p-2 border border-gray-300 bg-white text-black dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded"
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

        <input
          type="file"
          onChange={handleFileChange}
          className="mb-4 text-black dark:text-white"
        />
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white dark:bg-blue-700 px-4 py-2 rounded"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {error && (
          <p className="text-red-500 dark:text-red-300 mt-4">{error}</p>
        )}

        {downloadURL && (
          <p className="mt-4">
            File uploaded successfully! Access it{" "}
            <a
              href={downloadURL}
              className="text-blue-600 dark:text-blue-400 underline"
            >
              here
            </a>
            .
          </p>
        )}
      </section>
    </main>
  );
}
