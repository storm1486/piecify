"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc } from "firebase/firestore";

export default function ViewFile() {
  const { fileId } = useParams(); // Retrieve the fileId from the URL
  const router = useRouter();
  const [docData, setDocData] = useState(null);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const currentUserId = "user-id"; // Replace with actual user ID logic
        console.log("Current User ID:", currentUserId);

        const userDocRef = doc(db, "users", currentUserId); // Reference to the user's document
        console.log("User Document Reference:", userDocRef);

        const userDocSnap = await getDoc(userDocRef);
        console.log("User Document Snapshot:", userDocSnap);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log("User Data:", userData);

          const file = userData.myFiles?.find((f) => f.fileId === fileId); // Find the file by fileId
          if (file) {
            setDocData(file);
          } else {
            console.error("No such file found in user's myFiles!");
          }
        } else {
          console.error("No such user document!");
        }
      } catch (error) {
        console.error("Error fetching file:", error);
      }
    };

    fetchFile();
  }, [fileId]);

  if (!docData) {
    return <p>Loading...</p>;
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
          Back to Files
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
        />
      ) : supportedExtensions.includes(fileExtension) ? (
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(
            docData.fileUrl
          )}&embedded=true`}
          className="w-full h-screen"
          title={docData.fileName}
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
