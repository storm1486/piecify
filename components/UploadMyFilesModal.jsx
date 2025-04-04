"use client";
import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../app/firebase/firebase"; // Adjust path as needed
import {
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
} from "firebase/firestore";
import CreatableSelect from "react-select/creatable";
import { sortedAttributeOptions } from "@/src/componenets/AttributeIcons";

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#1f2937" : "#1f2937", // dark:bg-gray-800
    borderColor: state.isFocused ? "#4b5563" : "#374151", // dark:border-gray-700
    color: "#f3f4f6", // dark:text-gray-100
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : null, // ring on focus
    "&:hover": {
      borderColor: "#6b7280",
    },
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "#1f2937", // dark menu bg
    color: "#f3f4f6",
    zIndex: 20,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#2563eb" : "#1f2937", // blue-600 on hover
    color: state.isFocused ? "#ffffff" : "#f3f4f6",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#2563eb",
    color: "#ffffff",
    borderRadius: "0.375rem",
    padding: "0.25rem",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#ffffff",
  }),
  input: (provided) => ({
    ...provided,
    color: "#f3f4f6",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9ca3af", // text-gray-400
  }),
};

export default function UploadMyFilesModal({
  isOpen,
  closeModal,
  user,
  onUploadSuccess,
}) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState(""); // Store custom file name
  const [pieceDescription, setPieceDescription] = useState(""); // Store description
  const [attributes, setAttributes] = useState(""); // Store attributes (comma-separated)
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCancel = () => {
    setFile(null);
    setFileName("");
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

    if (selectedFile) {
      setFileName(selectedFile.name); // Default to the original file name
    }
  };

  // Handle file upload logic
  const handleUploadToMyFiles = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }
    setUploading(true);
    setError(null);

    try {
      // ✅ Generate a unique fileId
      const fileId = doc(collection(db, "files")).id;

      // ✅ Upload file to Firebase Storage
      const storageRef = ref(storage, `user_files/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // ✅ Create a Firestore document in `files`
      const fileRef = doc(db, "files", fileId); // Firestore document reference
      const userRef = doc(db, "users", user.uid);
      await setDoc(fileRef, {
        fileId,
        fileName,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        pieceDescription: pieceDescription || "No description provided.",
        attributes: attributes || [],
        currentOwner: userRef,
      });

      // ✅ Add file reference inside user's `myFiles` (as a Firestore reference)
      await updateDoc(doc(db, "users", user.uid), {
        myFiles: arrayUnion({
          fileRef: fileRef, // Store as a Firestore document reference
          dateGiven: new Date().toISOString(),
        }),
      });

      console.log("File uploaded successfully:", fileId);

      // ✅ Call success callback and close modal
      if (onUploadSuccess) onUploadSuccess();
      closeModal();
    } catch (err) {
      console.error("Error uploading file:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-semibold mb-6 text-center">Upload File</h2>
        {/* File Selection */}
        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {/* Show additional fields only after file is selected */}
        {file && (
          <>
            {/* File Name Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Description Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                value={pieceDescription}
                onChange={(e) => setPieceDescription(e.target.value)}
                placeholder="Enter a description for the file"
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            {/* Attributes Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
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
          </>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUploadToMyFiles}
          disabled={uploading}
          className={`w-full px-4 py-2 rounded mb-4 ${
            uploading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white`}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {/* Error Message */}
        {error && <p className="text-red-500">{error}</p>}

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="w-full bg-red-500 text-white px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
