"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc } from "firebase/firestore";

export default function ViewDocument() {
  const { folderId, fileId } = useParams(); // Retrieve both folderId and fileId from the URL parameters
  const router = useRouter();
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Track loading state

  useEffect(() => {
    const fetchDocument = async () => {
      if (folderId && fileId) {
        try {
          setIsLoading(true); // Start loading
          const docRef = doc(db, "folders", folderId, "files", fileId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log("Document Data:", docSnap.data());
            setDocData(docSnap.data()); // Set the fetched document data
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching document:", error);
        } finally {
          setIsLoading(false); // Stop loading
        }
      }
    };

    fetchDocument();
  }, [folderId, fileId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (!docData) {
    return <p>Document not found!</p>;
  }

  const fileExtension = docData.fileName.split(".").pop().toLowerCase();
  const supportedExtensions = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
  ];

  const handleViewFull = () => {
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
      docData.fileUrl
    )}&embedded=false`;
    window.open(viewerUrl, "_blank"); // Opens the full Google Docs Viewer
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Header */}
      <header className="w-full flex justify-between items-center bg-gray-200 dark:bg-gray-800 p-4 mb-4">
        <button
          onClick={() => router.back()}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Back to Documents
        </button>
        <h1 className="text-xl font-bold text-center">{docData.fileName}</h1>
        <button
          onClick={handleViewFull}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Edit/Print
        </button>
      </header>

      {/* Document Viewer */}
      {fileExtension === "pdf" ? (
        <iframe
          src={docData.fileUrl}
          className="w-full h-screen"
          title={docData.fileName}
          onLoad={() => setIsLoading(false)} // Stop loading when iframe finishes loading
        />
      ) : supportedExtensions.includes(fileExtension) ? (
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(
            docData.fileUrl
          )}&embedded=true`}
          className="w-full h-screen"
          title={docData.fileName}
          onLoad={() => setIsLoading(false)} // Stop loading when iframe finishes loading
        />
      ) : (
        <div>
          <p>
            Preview is not available for this file type. You can download it
            below.
          </p>
          <a
            href={docData.fileUrl}
            className="text-blue-600 underline"
            download
          >
            Download {docData.fileName}
          </a>
        </div>
      )}
    </main>
  );
}
