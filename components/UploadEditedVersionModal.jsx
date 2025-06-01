"use client";

import { useState, useRef, useEffect } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  arrayUnion,
  updateDoc,
  Timestamp,
  doc,
  collection,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { storage, db } from "../app/firebase/firebase"; // Adjust path as needed
import { useUser } from "@/src/context/UserContext"; // Import the user context
import CreatableSelect from "react-select/creatable";
import { sortedAttributeOptions } from "../src/componenets/AttributeIcons";

const customStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "#ffffff",
    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
    color: "#1f2937",
    padding: "0.25rem",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : null,
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 20,
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: "#e0e7ff",
    color: "#4f46e5",
    borderRadius: "0.375rem",
    padding: "0.125rem",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: "#4f46e5",
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: "#4f46e5",
    "&:hover": {
      backgroundColor: "#c7d2fe",
      color: "#4338ca",
    },
  }),
};

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
  const [intro, setIntro] = useState("");
  const [pieceDescription, setPieceDescription] = useState("");
  const [attributes, setAttributes] = useState([]);
  const [length, setLength] = useState("10 min");
  const [originalFileName, setOriginalFileName] = useState("");

  useEffect(() => {
    const fetchOriginalFileData = async () => {
      if (!fileId || !isOpen) return;

      try {
        const docRef = doc(db, "files", fileId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIntro(data.intro || "");
          setPieceDescription(data.pieceDescription || "");
          setAttributes(data.attributes || []);
          setLength(data.length || "10 min");
          setOriginalFileName(data.fileName || "");

          // Set auto-generated name
          const userName = `${user.firstName} ${user.lastName}`;
          setNewFileName(`${userName}'s version of ${data.fileName}`);
        }
      } catch (err) {
        console.error("Failed to fetch original file data:", err);
      }
    };

    fetchOriginalFileData();
  }, [fileId, isOpen]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);

      // Preserve the auto-generated name and don't overwrite it
      if (originalFileName && user?.firstName && user?.lastName) {
        const userName = `${user.firstName} ${user.lastName}`;
        setNewFileName(`${userName}'s version of ${originalFileName}`);
      }
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || newFileName.trim() === "") return;

    setUploading(true);
    setUploadSuccess(false);

    try {
      const newFileId = doc(collection(db, "files")).id;
      const safeFileName = newFileName.replace(/[^\w\s.-]/gi, "").trim();

      const storageRef = ref(storage, `files/${newFileId}/${safeFileName}`);
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);

      const newFileDocRef = doc(db, "files", newFileId);
      await setDoc(newFileDocRef, {
        fileId: newFileId,
        fileName: newFileName.trim(),
        fileUrl: downloadURL,
        uploadedAt: Timestamp.now(),
        originalFileId: fileId,
        intro,
        pieceDescription,
        attributes,
        length,
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
          <>
            <div>
              <label className="block text-sm font-medium">Rename File</label>
              <input
                type="text"
                value={newFileName}
                readOnly
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mt-1 bg-gray-100 dark:bg-gray-700 text-black dark:text-white"
              />
            </div>
            {/* Piece Description */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Piece Description
              </label>
              <textarea
                value={pieceDescription}
                onChange={(e) => setPieceDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mt-1 bg-white dark:bg-gray-700 text-black dark:text-white text-sm"
                rows={3}
                placeholder="Enter a description for the piece"
              />
            </div>

            {/* Intro Paragraph */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Intro Paragraph
              </label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded mt-1 bg-white dark:bg-gray-700 text-black dark:text-white text-sm"
                rows={3}
                placeholder="Enter the intro paragraph"
              />
            </div>
            {/* Attributes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attributes
              </label>
              <CreatableSelect
                isMulti
                options={sortedAttributeOptions}
                value={attributes.map((attr) => ({
                  value: attr,
                  label: attr.charAt(0).toUpperCase() + attr.slice(1),
                }))}
                onChange={(selected) =>
                  setAttributes(selected.map((item) => item.value))
                }
                styles={customStyles}
                placeholder="Select or create attributes"
                className="text-sm"
              />
            </div>

            {/* Length */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Piece Length
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white text-sm"
              >
                <option value="5 min">5 min</option>
                <option value="10 min">10 min</option>
              </select>
            </div>
          </>
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
