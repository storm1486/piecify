"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation'; // Correct import for Next.js 13+
import { db } from "../../firebase/firebase"; // Adjust the path as necessary
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function ViewDocument() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Correctly handling query parameters in Next.js 13+
  const [document, setDocument] = useState(null);

  useEffect(() => {
    const fetchDocument = async () => {
      const id = searchParams.get('id'); // Get the ID directly from search parameters
      
      console.log("Document ID:", id);

      if (id) {
        try {
          const docRef = doc(db, "uploads", id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setDocument(docSnap.data());
          } else {
            console.error("No such document!");
          }
        } catch (error) {
          console.error("Error fetching document:", error);
        }
      } else {
        console.error("No ID found in the URL");
      }
    };

    fetchDocument();
  }, [searchParams]);

  if (!document) {
    return <p>Loading...</p>;
  }

  const fileExtension = document.fileName.split(".").pop().toLowerCase();
  const supportedExtensions = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"];

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <Link href="/documents" passHref>
        <button className="bg-blue-500 text-white px-4 py-2 rounded mb-4">
          Back to Documents
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-4">{document.fileName}</h1>

      {fileExtension === "pdf" ? (
        <iframe src={document.fileUrl} className="w-full h-screen" title={document.fileName} />
      ) : supportedExtensions.includes(fileExtension) ? (
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(document.fileUrl)}&embedded=true`}
          className="w-full h-screen"
          title={document.fileName}
        />
      ) : (
        <div>
          <p>Preview is not available for this file type. You can download it below.</p>
          <a href={document.fileUrl} className="text-blue-600 underline" download>
            Download {document.fileName}
          </a>
        </div>
      )}
    </main>
  );
}
