"use client";
import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase/firebase"; // Adjust the path as necessary
import { collection, addDoc } from "firebase/firestore";
import Link from "next/link";

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const storageRef = ref(storage, `uploads/${file.name}`);
      await uploadBytes(storageRef, file);

      const url = await getDownloadURL(storageRef);
      setDownloadURL(url);

      // Store the file information in Firestore
      await addDoc(collection(db, "uploads"), {
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
    <main className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-200 p-4">
        <h2 className="text-xl font-semibold mb-4">Navigation</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/documents">
              <div className="block p-2 bg-blue-500 text-white rounded text-center">
                Documents Page
              </div>
            </Link>
          </li>
          {/* Add more navigation links here as needed */}
        </ul>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Piecify</h1>

        <input type="file" onChange={handleFileChange} className="mb-4" />
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {error && <p className="text-red-500 mt-4">{error}</p>}

        {downloadURL && (
          <p className="mt-4">
            File uploaded successfully! Access it{" "}
            <a href={downloadURL} className="text-blue-600 underline">
              here
            </a>
            .
          </p>
        )}
      </section>
    </main>
  );
}
