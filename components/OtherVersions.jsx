"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../app/firebase/firebase"; // Adjust path as necessary
import UploadFileModal from "./UploadFileModal"; // ✅ Import the Upload Modal

export default function OtherVersions({ fileId, onClose }) {
  const [originalFile, setOriginalFile] = useState(null);
  const [editedVersions, setEditedVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // ✅ Upload Modal State
  const modalRef = useRef(null);

  useEffect(() => {
    if (!fileId) return;

    const fetchFileVersions = async () => {
      setIsLoading(true);
      try {
        const fileRef = doc(db, "files", fileId);
        const fileSnap = await getDoc(fileRef);

        if (fileSnap.exists()) {
          const fileData = fileSnap.data();
          setOriginalFile(fileData);

          if (fileData.editedVersions && fileData.editedVersions.length > 0) {
            const versionDocs = await Promise.all(
              fileData.editedVersions.map(async (versionRef) => {
                const versionSnap = await getDoc(versionRef);
                return versionSnap.exists() ? versionSnap.data() : null;
              })
            );
            setEditedVersions(versionDocs.filter((v) => v !== null));
          }
        }
      } catch (error) {
        console.error("Error fetching file versions:", error);
      }
      setIsLoading(false);
    };

    fetchFileVersions();
  }, [fileId, isUploadModalOpen]); // ✅ Reload when modal closes (after upload)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-30">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96"
      >
        <h2 className="text-xl font-bold mb-4">File Versions</h2>
        {isLoading ? (
          <p>Loading versions...</p>
        ) : (
          <div>
            <h3 className="font-semibold">Original File</h3>
            {originalFile ? (
              <p className="mb-2">{originalFile.fileName}</p>
            ) : (
              <p className="mb-2">Original file not found.</p>
            )}
            <h3 className="font-semibold mt-4">Edited Versions</h3>
            {editedVersions.length > 0 ? (
              <ul>
                {editedVersions.map((version, index) => (
                  <li key={index} className="mt-2">
                    <a
                      href={version.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {version.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No edited versions found.</p>
            )}
          </div>
        )}

        {/* ✅ Upload Edited Version Button */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="mt-4 w-full bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Upload Edited Version
        </button>

        {/* ✅ Upload Modal */}
        <UploadFileModal
          fileId={fileId} // Pass the correct file ID
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)} // Close modal after upload
        />

        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
