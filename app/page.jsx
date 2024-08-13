"use client"
import { useState } from "react";

export default function Home() {
  const [fileInfo, setFileInfo] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileInfo({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Example: Reading file content (for text files)
      const reader = new FileReader();
      reader.onload = function (event) {
        console.log("File content:", event.target.result);
      };

      if (file.type === "text/plain") {
        reader.readAsText(file);
      } else {
        console.log("File reading is not implemented for this file type.");
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Piecify</h1>

      <input
        type="file"
        id="fileInput"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="mb-4"
      />
      <button
        onClick={() => console.log(fileInfo)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Upload
      </button>

      {fileInfo && (
        <div className="mt-4">
          <p>
            <strong>File Name:</strong> {fileInfo.name}
          </p>
          <p>
            <strong>File Size:</strong> {fileInfo.size} bytes
          </p>
          <p>
            <strong>File Type:</strong> {fileInfo.type}
          </p>
        </div>
      )}
    </main>
  );
}
