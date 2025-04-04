"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import DocumentTags from "@/src/componenets/DocumentTags";

export default function ViewSharedFile() {
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }

    const fetchSharedFile = async () => {
      try {
        const q = query(
          collection(db, "sharedLinks"),
          where("token", "==", token)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("This link is invalid or has expired.");
          return;
        }

        const sharedDoc = snapshot.docs[0];
        const { fileRef, expiresAt } = sharedDoc.data();

        if (new Date() > new Date(expiresAt.toDate())) {
          setError("This link has expired.");
          return;
        }

        const fileDoc = await getDoc(doc(db, fileRef));
        if (!fileDoc.exists()) {
          setError("File not found.");
          return;
        }

        setFileData(fileDoc.data());
      } catch (err) {
        console.error("Error fetching shared file:", err);
        setError("An error occurred while fetching the file.");
      }
    };

    fetchSharedFile();
  }, [token]);

  if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;

  if (!fileData) return <p className="text-center mt-10">Loading file...</p>;

  // 🔹 Use Google Docs Viewer to prevent downloads
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
