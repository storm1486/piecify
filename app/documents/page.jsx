"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase/firebase"; // Adjust the path as necessary
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Documents() {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      // Assuming you have the user's UID available
      const userId = "user's-uid"; // Replace with actual user ID
      const q = query(collection(db, "uploads"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDocuments(docs);
    };

    fetchDocuments();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Documents Page</h1>
      <p>This is where users can manage their documents.</p>

      <div className="mt-4">
        {documents.length > 0 ? (
          <ul>
            {documents.map((doc) => (
              <li key={doc.id} className="mb-4">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {doc.fileName}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>No documents uploaded yet.</p>
        )}
      </div>
    </main>
  );
}
