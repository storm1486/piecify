"use client";
import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../app/firebase/firebase"; // Keep your current import path
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
} from "firebase/firestore";
import CreatableSelect from "react-select/creatable";
import { sortedAttributeOptions } from "@/src/componenets/AttributeIcons";

// Updated custom styles for the select component
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "white", // Light background
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db", // Blue focus, gray border
    color: "#111827", // Dark text
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : null, // Blue ring on focus
    "&:hover": {
      borderColor: "#9ca3af",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "white", // Light background
    color: "#111827", // Dark text
    zIndex: 20,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#bfdbfe" : "white", // Light blue on hover
    color: state.isFocused ? "#1e40af" : "#111827", // Dark blue text on hover
    padding: "0.5rem 1rem",
    cursor: "pointer",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#dbeafe", // Light blue background
    color: "#1e40af", // Dark blue text
    borderRadius: "0.375rem",
    padding: "0.25rem",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#1e40af", // Dark blue text
  }),
  input: (provided) => ({
    ...provided,
    color: "#111827", // Dark text
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9ca3af", // Gray placeholder
  }),
};

export default function UploadMyFilesModal({
  isOpen,
  closeModal,
  user,
  onUploadSuccess,
}) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [pieceDescription, setPieceDescription] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [length, setLength] = useState("10 min");
  const fileInputRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setFileName(droppedFile.name);
      setError(null);
    }
  };

  const simulateProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress > 95) {
        clearInterval(interval);
        progress = 95;
      }
      setUploadProgress(Math.min(progress, 95));
    }, 300);

    return () => clearInterval(interval);
  };

  const handleCancel = () => {
    setFile(null);
    setFileName("");
    setPieceDescription("");
    setAttributes("");
    setError(null);
    closeModal();
  };

  const handleUploadToMyFiles = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setUploading(true);
    setError(null);

    // Start progress simulation
    const stopProgressSimulation = simulateProgress();

    try {
      // ✅ Generate a unique fileId
      const fileId = doc(collection(db, "files")).id;

      // ✅ Upload file to Firebase Storage
      const storageRef = ref(storage, `user_files/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // ✅ Create a Firestore document in `files`
      const fileRef = doc(db, "files", fileId);
      const userRef = doc(db, "users", user.uid);
      await setDoc(fileRef, {
        fileId,
        fileName: fileName || file.name,
        fileUrl,
        uploadedBy: user.uid,
        uploadedByEmail: user.email,
        length: length,
        uploadedByName: `${user.firstName} ${user.lastName}`,
        uploadedAt: new Date().toISOString(),
        pieceDescription: pieceDescription || "No description provided.",
        attributes: attributes || [],
        currentOwner: userRef,
      });

      // ✅ Add file reference inside user's `myFiles`
      await updateDoc(doc(db, "users", user.uid), {
        myFiles: arrayUnion({
          fileRef: fileRef,
          dateGiven: new Date().toISOString(),
        }),
      });

      // Complete progress
      setUploadProgress(100);
      stopProgressSimulation();

      // ✅ Call success callback and close modal
      if (onUploadSuccess) onUploadSuccess();

      // Close modal after a brief delay to show 100%
      setTimeout(() => {
        closeModal();
      }, 1000);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Upload Piece</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-500"
            disabled={uploading}
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Drag and drop area */}
        <div
          className={`border-2 ${
            isDragging
              ? "border-blue-600 bg-blue-50"
              : "border-dashed border-gray-300"
          } rounded-lg p-8 text-center mb-4`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(2)} KB
              </p>
              <button
                onClick={() => setFile(null)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                disabled={uploading}
              >
                Change file
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                Drag and drop your file here
              </h3>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center transition-colors"
                disabled={uploading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Browse Files
              </button>
            </>
          )}
        </div>

        {/* Show additional fields only after file is selected */}
        {file && (
          <>
            {/* File Name Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={uploading}
              />
            </div>

            {/* Description field */}
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Piece Description
              </label>
              <textarea
                id="description"
                rows="3"
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a description for this piece..."
                value={pieceDescription}
                onChange={(e) => setPieceDescription(e.target.value)}
                disabled={uploading}
              ></textarea>
            </div>

            {/* Attributes Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Attributes
              </label>
              <CreatableSelect
                isMulti
                options={sortedAttributeOptions}
                onChange={(selectedOptions) =>
                  setAttributes(selectedOptions.map((option) => option.value))
                }
                placeholder="Select or create attributes"
                styles={customStyles}
                className="w-full"
                classNamePrefix="select"
                isDisabled={uploading}
              />
            </div>
            <div className="mb-6 flex items-center">
              <input
                type="checkbox"
                id="fiveMinVersion"
                checked={length === "5 min"}
                onChange={(e) =>
                  setLength(e.target.checked ? "5 min" : "10 min")
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label
                htmlFor="fiveMinVersion"
                className="ml-2 text-sm text-gray-700"
              >
                5 min version of the piece (optional)
              </label>
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">Uploading...</span>
              <span className="text-gray-700">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUploadToMyFiles}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            disabled={uploading || !file}
          >
            {uploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
