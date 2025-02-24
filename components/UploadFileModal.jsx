"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, collection } from "firebase/firestore";
import { db, storage } from "../app/firebase/firebase";

export default function UploadFileModal({
  isUploadModalOpen,
  folderId,
  onUploadSuccess,
  closeModal,
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle file selection
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError(null);
    setSuccessMessage(null);
  };

  // Handle file upload logic
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Generate a unique fileId
      const fileId = doc(collection(db, "files")).id;

      // Upload the file to the current folder in Storage
      const storageRef = ref(storage, `${folderId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // Create file document data
      const fileData = {
        fileId,
        fileName: file.name,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        pieceDescription: "No description provided.",
        currentOwner: [],
        previouslyOwned: [],
        editedVersions: [],
        trackRecord: [],
        attributes: [],
        folderId: folderId,
      };

      // Create Firestore document for the file
      const fileRef = doc(db, "files", fileId);
      await setDoc(fileRef, fileData);

      // Save a reference to the file in the folder's subcollection
      await setDoc(doc(db, "folders", folderId, "files", fileId), {
        fileRef: `/files/${fileId}`,
      });

      console.log("File uploaded successfully:", fileId);
      // Set a success message instead of closing the modal
      setSuccessMessage("File uploaded successfully!");
      if (onUploadSuccess) onUploadSuccess();
      closeModal();
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!isUploadModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4">Upload a File</h2>

        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className={`w-full px-4 py-2 rounded mb-4 ${
            uploading
              ? "bg-gray-500 text-white cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {error && <p className="text-red-500 mb-4">{error}</p>}
        {successMessage && (
          <p className="text-green-500 mb-4">{successMessage}</p>
        )}

        <button
          onClick={closeModal}
          className="w-full bg-red-500 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
