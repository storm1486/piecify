"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  arrayUnion,
  updateDoc,
  Timestamp,
  doc,
  collection,
  setDoc
} from "firebase/firestore";
import { storage, db } from "../app/firebase/firebase"; // Adjust path as needed

export default function UploadFileModal({ fileId, isOpen, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFileName, setNewFileName] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewFileName(file.name);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || newFileName.trim() === "") return;

    try {
      const newFileId = doc(collection(db, "files")).id; // Generate unique file ID

      // Upload the file to Firebase Storage
      const storageRef = ref(storage, `files/${newFileId}/${newFileName}`);
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Create a new document in the 'files' collection
      const newFileDocRef = doc(db, "files", newFileId);
      await setDoc(newFileDocRef, {
        fileId: newFileId,
        fileName: newFileName.trim(),
        fileUrl: downloadURL,
        uploadedAt: Timestamp.now(),
        originalFileId: fileId, // Reference to the original file
      });

      // Add the document reference to 'editedVersions' in the original file document
      const originalFileRef = doc(db, "files", fileId);
      await updateDoc(originalFileRef, {
        editedVersions: arrayUnion(newFileDocRef), // Store as Firestore document reference
      });

      alert("Edited version uploaded successfully!");
      onClose(); // Close modal after upload
      window.location.reload(); // Refresh to show updated versions
    } catch (error) {
      console.error("Error uploading edited version:", error);
      alert("Failed to upload the edited version.");
    }
  };

  if (!isOpen) return null; // Hide modal if not open

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Upload Edited Version</h2>

        <input
          type="file"
          onChange={handleFileChange}
          className="w-full p-2 border rounded mb-3"
        />

        {selectedFile && (
          <div>
            <label className="block text-sm font-medium">Rename File</label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mt-1 bg-white dark:bg-gray-700 text-black dark:text-white"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-400 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleUploadFile}
            disabled={!selectedFile}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
