"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, collection } from "firebase/firestore";
import { db, storage } from "../app/firebase/firebase";
import CreatableSelect from "react-select/creatable";
import { sortedAttributeOptions } from "../src/componenets/AttributeIcons";

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#f9fafb" : "#f9fafb", // Light gray background
    borderColor: state.isFocused ? "#6366f1" : "#d1d5db", // indigo-500 when focused
    color: "#1f2937", // gray-800
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : null, // indigo ring on focus
    "&:hover": {
      borderColor: "#4f46e5", // indigo-600
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#ffffff", // White menu bg
    color: "#1f2937", // gray-800
    zIndex: 20,
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    borderRadius: "0.375rem",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#eef2ff" : "#ffffff", // indigo-50 on hover
    color: state.isFocused ? "#4f46e5" : "#1f2937", // indigo-600 when focused
    padding: "0.5rem 1rem",
    cursor: "pointer",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#e0e7ff", // indigo-100
    color: "#4f46e5", // indigo-600
    borderRadius: "0.375rem",
    padding: "0.125rem",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#4f46e5", // indigo-600
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#4f46e5", // indigo-600
    "&:hover": {
      backgroundColor: "#c7d2fe", // indigo-200
      color: "#4338ca", // indigo-700
    },
  }),
  input: (provided) => ({
    ...provided,
    color: "#1f2937", // gray-800
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9ca3af", // text-gray-400
  }),
};

export default function UploadFileModal({
  isUploadModalOpen,
  folderId,
  user,
  onUploadSuccess,
  closeModal,
}) {
  const [file, setFile] = useState(null);
  const [customFileName, setCustomFileName] = useState("");
  const [pieceDescription, setPieceDescription] = useState("");
  const [attributes, setAttributes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [length, setLength] = useState("10 min");
  const [error, setError] = useState(null);
  const [intro, setIntro] = useState("");

  const handleCancel = () => {
    setFile(null);
    setCustomFileName("");
    setPieceDescription("");
    setAttributes("");
    setIntro("");
    setError(null);
    closeModal();
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
    setError(null);
    // Prepopulate customFileName with the default file name
    if (selectedFile) {
      setCustomFileName(selectedFile.name);
    }
  };

  // Handle file upload logic
  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // Generate a unique fileId
      const fileId = doc(collection(db, "files")).id;

      // Upload the file to Storage under the current folder
      const storageRef = ref(storage, `${folderId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // Create file document data with custom fields
      const fileData = {
        fileId,
        fileName: customFileName || file.name,
        fileUrl,
        uploadedBy: user.uid,
        uploadedByEmail: user.email,
        uploadedByName: `${user.firstName} ${user.lastName}`,
        uploadedAt: new Date().toISOString(),
        pieceDescription: pieceDescription || "No description provided.",
        intro: intro || "", // Include intro here
        currentOwner: [],
        previouslyOwned: [],
        editedVersions: [],
        pendingIntroChange: null,
        trackRecord: [],
        attributes: attributes || [],
        length: length,
        folderId,
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
      <div className="bg-white rounded-lg shadow-lg w-[600px] max-w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload a File</h2>

        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mb-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
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
              Drag and drop files here, or
            </p>
            <label className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors">
              Browse Files
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {file && (
            <div className="p-3 bg-indigo-50 rounded-md flex items-center">
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
        </div>

        {file && (
          <>
            {/* Custom File Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File Name
              </label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="Enter file name"
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>

            {/* Piece Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Piece Description
              </label>
              <textarea
                value={pieceDescription}
                onChange={(e) => setPieceDescription(e.target.value)}
                placeholder="Enter a description for the file"
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[80px] max-h-40 overflow-y-auto resize-y"
                rows={3}
              />
            </div>

            {/* Intro Paragraph */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intro Paragraph
              </label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Enter the intro paragraph for the piece"
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[80px] max-h-40 overflow-y-auto resize-y"
                rows={3}
              />
            </div>

            {/* Attributes */}
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
              />
            </div>

            {/* 5 Min Version Checkbox */}
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

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
              uploading || !file
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
