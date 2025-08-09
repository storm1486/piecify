"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { query, where, getDocs, getDoc } from "firebase/firestore";
import DocumentTags from "@/src/componenets/DocumentTags";
import { useOrganization } from "../../../src/context/OrganizationContext";
import {
  getOrgCollection,
  getOrgDoc,
} from "../../../src/utils/firebaseHelpers";

export default function ViewSharedFile() {
  const params = useParams();
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState("");
  const { orgId } = useOrganization();

  // --- Robust resolver for fileRef (DocRef | string path) ---
  const resolveDocRef = (orgId, refOrPath) => {
    // DocumentReference (duck-typed)
    if (refOrPath && typeof refOrPath === "object") {
      // Most v9 DocRefs have a "path" prop; some have "_key". Either is fine here.
      if ("path" in refOrPath || "_key" in refOrPath) return refOrPath;
    }
    if (typeof refOrPath !== "string") return null;

    const cleaned = refOrPath.replace(/^\/+/, ""); // strip leading "/"

    // Absolute org-scoped path
    if (cleaned.startsWith("organizations/")) {
      const parts = cleaned.split("/").slice(2); // drop "organizations/{orgId}"
      if (parts.length < 2) return null; // need at least "collection/doc"
      return getOrgDoc(orgId, ...parts);
    }

    // Relative path like "files/{id}"
    const parts = cleaned.split("/");
    if (parts.length < 2) return null;
    return getOrgDoc(orgId, ...parts);
  };

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }
    if (!orgId) return;

    let cancelled = false;

    const resolveDocRef = (orgId, refOrPath) => {
      if (
        refOrPath &&
        typeof refOrPath === "object" &&
        ("path" in refOrPath || "_key" in refOrPath)
      ) {
        return refOrPath; // DocumentReference
      }
      if (typeof refOrPath !== "string") return null;
      const cleaned = refOrPath.replace(/^\/+/, "");
      if (cleaned.startsWith("organizations/")) {
        const parts = cleaned.split("/").slice(2);
        return getOrgDoc(orgId, ...parts);
      }
      const parts = cleaned.split("/");
      return getOrgDoc(orgId, ...parts);
    };

    const fetchSharedFile = async () => {
      try {
        setError("");
        const q = query(
          getOrgCollection(orgId, "sharedLinks"),
          where("token", "==", token)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          if (!cancelled) setError("This link is invalid or has expired.");
          return;
        }

        const sharedDoc = snapshot.docs[0];
        const { fileRef, fileId, filePath, expiresAt } = sharedDoc.data() || {};
        console.log("sharedLink data", {
          fileRef,
          fileId,
          filePath,
          expiresAt,
          orgId,
          token,
        });

        const exp =
          expiresAt && typeof expiresAt?.toDate === "function"
            ? expiresAt.toDate()
            : expiresAt
            ? new Date(expiresAt)
            : null;
        if (!exp || new Date() > exp) {
          if (!cancelled) setError("This link has expired.");
          return;
        }

        // --- robust resolve: fileRef -> fileId -> filePath
        let fileDocRef = null;
        if (fileRef) {
          fileDocRef = resolveDocRef(orgId, fileRef);
        } else if (fileId) {
          fileDocRef = getOrgDoc(orgId, "files", fileId);
        } else if (filePath) {
          fileDocRef = resolveDocRef(orgId, filePath);
        }
        if (!fileDocRef) {
          if (!cancelled)
            setError("This link is misconfigured: missing or invalid fileRef.");
          return;
        }

        const fileSnap = await getDoc(fileDocRef);
        if (!fileSnap.exists()) {
          if (!cancelled) setError("File not found.");
          return;
        }

        if (!cancelled) setFileData(fileSnap.data());
      } catch (err) {
        console.error("Error fetching shared file:", err);
        if (!cancelled) setError("An error occurred while fetching the file.");
      }
    };

    fetchSharedFile();
    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  if (error) return <p className="text-red-500 text-center mt-10">{error}</p>;
  if (!fileData) return <p className="text-center mt-10">Loading file...</p>;

  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
    fileData.fileUrl
  )}&embedded=true`;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      onContextMenu={(e) => e.preventDefault()}
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
