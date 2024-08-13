"use client"
import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase/firebase";

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const storageRef = ref(storage, `uploads/${file.name}`);
    await uploadBytes(storageRef, file);

    const url = await getDownloadURL(storageRef);
    setDownloadURL(url);
    setUploading(false);
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

      {downloadURL && (
        <p className="mt-4">
          File uploaded successfully! Access it{" "}
          <a href={downloadURL} className="text-blue-600 underline">
            here
          </a>
          .
        </p>
      )}
    </main>
  );
}
