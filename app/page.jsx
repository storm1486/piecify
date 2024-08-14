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
    <main className="flex min-h-screen flex-col items-center justify-center">
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

      {/* Add the button to navigate to the Documents page */}
      <Link href="/documents">
        <button className="bg-green-500 text-white px-4 py-2 rounded mt-4">
          Go to Documents Page
        </button>
      </Link>
    </main>
  );
}
