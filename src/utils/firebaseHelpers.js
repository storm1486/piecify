import { collection, doc, query } from "firebase/firestore";
import { db } from "../../app/firebase/firebase";

export const getOrgCollection = (orgId, ...segments) => {
  if (!orgId) throw new Error("getOrgCollection: orgId is required");
  return collection(db, "organizations", orgId, ...segments);
};

export const getOrgDoc = (orgId, ...segments) => {
  if (!orgId) throw new Error("getOrgDoc: orgId is required");
  return doc(db, "organizations", orgId, ...segments);
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
