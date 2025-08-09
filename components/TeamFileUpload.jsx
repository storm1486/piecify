"use client";

import { useState } from "react";
import { addDoc, Timestamp } from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { useUser } from "@/src/context/UserContext";
import { getOrgCollection } from "@/src/utils/firebaseHelpers";
import { useOrganization } from "@/src/context/OrganizationContext";

export default function TeamFileUpload({ onUploadSuccess }) {
  const { user } = useUser();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { orgId } = useOrganization();

  const storage = getStorage();

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    setError(null);
    setFile(selected || null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // 1. Upload to Storage
      const path = `teamFiles/${user.uid}/${file.name}-${Date.now()}`;
      const ref = storageRef(storage, path);
      const task = uploadBytesResumable(ref, file);

      await new Promise((res, rej) => task.on("state_changed", null, rej, res));

      // 2. Get public URL
      const downloadURL = await getDownloadURL(task.snapshot.ref);

      // 3. Write metadata to Firestore
      await addDoc(getOrgCollection(orgId, "teamFiles"), {
        fileName: file.name,
        storagePath: path,
        downloadURL,
        uploadedBy: user.uid,
        createdAt: Timestamp.now(),
      });

      // 4. Notify parent & reset
      onUploadSuccess?.();
      setFile(null);
    } catch (err) {
      console.error("Team file upload failed:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white mb-8">
      {/* Upload prompt */}
      <div className="text-center mb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          Select a file to upload to Team Files
        </p>
        <label className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors">
          Browse Files
          <input type="file" onChange={handleFileSelect} className="hidden" />
        </label>
      </div>

      {/* Selected file preview */}
      {file && (
        <div className="p-3 bg-indigo-50 rounded-md flex items-center mb-4">
          <div className="p-2 bg-indigo-100 rounded-md mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="flex-grow">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <p className="text-xs text-gray-500">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => setFile(null)}
          disabled={uploading}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`px-4 py-2 rounded-md text-white font-medium transition-colors text-sm ${
            uploading || !file
              ? "bg-indigo-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
