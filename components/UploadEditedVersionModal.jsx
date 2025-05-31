"use client";

import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  arrayUnion,
  updateDoc,
  Timestamp,
  doc,
  collection,
  setDoc,
} from "firebase/firestore";
import { storage, db } from "../app/firebase/firebase"; // Adjust path as needed
import { useUser } from "@/src/context/UserContext"; // Import the user context

export default function UploadEditedVersionFileModal({
  fileId,
  isOpen,
  onClose,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const { user, fetchMyFiles } = useUser();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewFileName(file.name);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || newFileName.trim() === "") return;

    setUploading(true);
    setUploadSuccess(false);

    try {
      const newFileId = doc(collection(db, "files")).id;

      const storageRef = ref(storage, `files/${newFileId}/${newFileName}`);
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      const newFileDocRef = doc(db, "files", newFileId);
      await setDoc(newFileDocRef, {
        fileId: newFileId,
        fileName: newFileName.trim(),
        fileUrl: downloadURL,
        uploadedAt: Timestamp.now(),
        originalFileId: fileId,
      });

      const originalFileRef = doc(db, "files", fileId);
      await updateDoc(originalFileRef, {
        editedVersions: arrayUnion(newFileDocRef),
      });

      // ✅ Add edited version to user's myFiles with dateGiven
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        myFiles: arrayUnion({
          fileRef: newFileDocRef,
          dateGiven: new Date().toISOString(),
        }),
      });

      setUploadMessage("Edited version uploaded successfully!");
      setUploadSuccess(true);
      await fetchMyFiles();

      setSelectedFile(null);
      setNewFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading edited version:", error);
      setUploadMessage("Failed to upload the edited version.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Reset state when modal is closed
  const handleClose = () => {
    setSelectedFile(null);
    setNewFileName("");
    setUploadMessage("");
    setUploadSuccess(false);
    onClose(); // Close modal
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30 ${
        !isOpen && "hidden"
      }`}
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80">
        <h2 className="text-xl font-bold mb-4">Upload Edited Version</h2>

        <input
          type="file"
          ref={fileInputRef} // ✅ Attach ref to input
          onChange={handleFileChange}
          className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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

        <div className="flex justify-end space-x-2 mt-3">
          <button
            onClick={handleClose}
            className="w-full bg-red-500 text-white px-4 py-2 rounded"
          >
            {uploadSuccess ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleUploadFile}
            disabled={!selectedFile}
            className={`w-full px-4 py-2 rounded ${
              uploading
                ? "bg-gray-500 text-white cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {uploadMessage && (
          <p className="text-green-500 mt-2 text-center">{uploadMessage}</p>
        )}
      </div>
    </div>
  );
}
