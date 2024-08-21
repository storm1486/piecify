"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc } from "firebase/firestore";

export default function ViewDocument() {
  const { folderId, fileId } = useParams(); // Retrieve both folderId and fileId from the URL parameters
  const router = useRouter();
  const [document, setDocument] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (folderId && fileId) {
        try {
          // Construct the path to the document in the Firestore database
          const docRef = doc(db, "folders", folderId, "files", fileId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setDocument(docSnap.data());
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching document:", error);
        }
      }
    };

    fetchDocument();
  }, [folderId, fileId]);

  if (!document) {
    return <p>Loading...</p>;
  }

  const fileExtension = document.fileName.split(".").pop().toLowerCase();
  const supportedExtensions = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
  ];

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <button
        onClick={() => router.back()}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Back to Documents
      </button>

      <h1 className="text-3xl font-bold mb-4">{document.fileName}</h1>

      {fileExtension === "pdf" ? (
        <iframe
          src={document.fileUrl}
          className="w-full h-screen"
          title={document.fileName}
        />
      ) : supportedExtensions.includes(fileExtension) ? (
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(
            document.fileUrl
          )}&embedded=true`}
          className="w-full h-screen"
          title={document.fileName}
        />
      ) : (
        <div>
          <p>
            Preview is not available for this file type. You can download it
            below.
          </p>
          <a
            href={document.fileUrl}
            className="text-blue-600 underline"
            download
          >
            Download {document.fileName}
          </a>
        </div>
      )}
    </main>
  );
}
