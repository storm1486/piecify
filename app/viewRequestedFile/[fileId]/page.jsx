"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import DocumentTags from "@/src/componenets/DocumentTags";

export default function ViewRequestedFile() {
  const { fileId } = useParams();
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fileId) {
      setError("Invalid or missing file ID.");
      return;
    }

    const fetchRequestedFile = async () => {
      try {
        const fileDocRef = doc(db, "files", fileId);
        const fileDoc = await getDoc(fileDocRef);

        if (!fileDoc.exists()) {
          setError("File not found.");
          return;
        }

        setFileData(fileDoc.data());
      } catch (err) {
        console.error("Error fetching requested file:", err);
        setError("An error occurred while fetching the file.");
      }
    };

    fetchRequestedFile();
  }, [fileId]);

  if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;

  if (!fileData) return <p className="text-center mt-10">Loading file...</p>;

  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
    fileData.fileUrl
  )}&embedded=true`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      onContextMenu={(e) => e.preventDefault()} // 🔹 Disable right-click
    >
      <h1 className="text-2xl font-bold">{fileData.fileName}</h1>
      <DocumentTags attributes={fileData.attributes} />
      <iframe
        src={viewerUrl}
        className="w-full h-[80vh] border mt-4"
        title={fileData.fileName}
      />
    </div>
  );
}
