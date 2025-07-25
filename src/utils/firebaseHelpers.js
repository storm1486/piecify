import { collection, doc, query } from "firebase/firestore";
import { db } from "../../app/firebase/firebase";

// Organization-scoped collection helpers
export const getOrgCollection = (orgId, collectionName) => {
  return collection(db, "organizations", orgId, collectionName);
};

export const getOrgDoc = (orgId, collectionName, docId) => {
  return doc(db, "organizations", orgId, collectionName, docId);
};

// Organization-scoped subcollection helpers
export const getOrgSubCollection = (
  orgId,
  parentCollection,
  parentDocId,
  subCollection
) => {
  return collection(
    db,
    "organizations",
    orgId,
    parentCollection,
    parentDocId,
    subCollection
  );
};

export const getOrgSubDoc = (
  orgId,
  parentCollection,
  parentDocId,
  subCollection,
  subDocId
) => {
  return doc(
    db,
    "organizations",
    orgId,
    parentCollection,
    parentDocId,
    subCollection,
    subDocId
  );
};

// Common query builders with organization scope
export const createOrgQuery = (orgId, collectionName, ...constraints) => {
  const collectionRef = getOrgCollection(orgId, collectionName);
  return query(collectionRef, ...constraints);
};

// Helper to build file reference paths within organizations
export const buildOrgFileRefPath = (orgId, fileId) => {
  return `/organizations/${orgId}/files/${fileId}`;
};

// Helper to parse organization file reference paths
export const parseOrgFileRefPath = (path) => {
  const match = path.match(/^\/organizations\/([^\/]+)\/files\/([^\/]+)$/);
  if (match) {
    return { orgId: match[1], fileId: match[2] };
  }
  return null;
};

// Helper for building folder file reference paths
export const buildOrgFolderFileRefPath = (orgId, folderId, fileId) => {
  return `/organizations/${orgId}/folders/${folderId}/files/${fileId}`;
};
