"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc, collection } from "firebase/firestore";
import { db, storage } from "../app/firebase/firebase";
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

export default function UploadFileModal({
  isUploadModalOpen,
  folderId,
  onUploadSuccess,
  closeModal,
}) {
  const [file, setFile] = useState(null);
  const [customFileName, setCustomFileName] = useState("");
  const [pieceDescription, setPieceDescription] = useState("");
  const [attributes, setAttributes] = useState("");
  const [uploading, setUploading] = useState(false);
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
        uploadedAt: new Date().toISOString(),
        pieceDescription: pieceDescription || "No description provided.",
        intro: intro || "", // ✅ Include intro here
        currentOwner: [],
        previouslyOwned: [],
        editedVersions: [],
        trackRecord: [],
        attributes: attributes || [],
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
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-4">Upload a File</h2>

        <input
          type="file"
          onChange={handleFileChange}
          className="block w-full mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {file && (
          <>
            {/* Custom File Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                File Name
              </label>
              <input
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder="Enter file name"
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Piece Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Piece Description
              </label>
              <textarea
                value={pieceDescription}
                onChange={(e) => setPieceDescription(e.target.value)}
                placeholder="Enter a description for the file"
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            {/* Intro Paragraph */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Intro Paragraph
              </label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Enter the intro paragraph for the piece"
                className="w-full p-2 mt-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            {/* Attributes */}
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
