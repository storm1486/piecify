"use client";
import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { auth, db } from "../../app/firebase/firebase"; // Adjust path to your Firebase setup
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth"; // At the top
import { useOrganization } from "./OrganizationContext";
import { getOrgCollection, getOrgDoc } from "../utils/firebaseHelpers";

// Define the shape of the user data
interface User {
  email: string;
  role: string;
  uid: string;
  firstName: string; // New field
  lastName: string; // New field
  graduationYear: number | null; // New field (nullable)
  myFiles: Array<any>;
  previousFiles: Array<any>;
  requestedFiles: Array<any>; // ✅ Add this
  favoriteFolders: Array<string>;
  allFolders: Array<any>;
}

// Define the context properties
interface UserContextProps {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  fetchMyFiles: () => Promise<void>;
  toggleFavorite: (folderId: string) => Promise<void>;
  handleLogin: (email: string, password: string) => Promise<void>; // 🔹 Added
  handleLogout: () => Promise<void>;
  handleSignUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    graduationYear: string;
    role: string;
  }) => Promise<void>;
  isPrivileged: () => boolean;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { orgId, switchOrganization } = useOrganization();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!orgId) {
        setLoading(false);
        return;
      }
      if (firebaseUser) {
        const { email, uid } = firebaseUser;

        try {
          // Fetch user document from Firestore
          const userDocRef = getOrgDoc(orgId, "users", uid);
          const userDoc = await getDoc(userDocRef);

          let userData: User = {
            email: email || "",
            role: "user",
            uid,
            firstName: "", // Default value
            lastName: "", // Default value
            graduationYear: null, // Default value
            myFiles: [],
            previousFiles: [],
            requestedFiles: [],
            favoriteFolders: [],
            allFolders: [],
          };

          if (userDoc.exists()) {
            const data = userDoc.data();
            userData = {
              ...userData,
              role: data.role || "user",
              firstName: data.firstName || "", // Fetch firstName
              lastName: data.lastName || "", // Fetch lastName
              graduationYear: data.graduationYear || null, // Fetch graduationYear
              favoriteFolders: data.favoriteFolders || [],
              myFiles: data.myFiles || [],
              previousFiles: data.previousFiles || [],
            };
          }

          // Fetch all folders for admin
          if (["admin", "coach"].includes(userData.role)) {
            const folderSnapshot = await getDocs(
              getOrgCollection(orgId, "folders")
            );
            userData.allFolders = folderSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
          }

          setUser(userData);
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isPrivileged = () => {
    return user?.role === "admin" || user?.role === "coach";
  };

  const fetchMyFiles = async () => {
    if (!user || !orgId) return;

    try {
      const userDocRef = getOrgDoc(orgId, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) return;

      const data = userDoc.data();
      const myFileRefs = data.myFiles || [];
      const previousFileRefs = data.previousFiles || [];
      const requestedFileRefs = data.requestedFiles || [];

      const now = new Date();

      // Helper: normalize a path to a proper doc ref
      const toFileDocRef = (filePath: string) => {
        if (!filePath) return null;
        if (filePath.startsWith("/organizations/")) {
          return doc(db, filePath.slice(1)); // strip leading slash
        }
        if (filePath.startsWith("files/")) {
          // legacy path -> convert to org scoped
          const fileId = filePath.split("/")[1];
          return getOrgDoc(orgId, "files", fileId);
        }
        // already a clean path (rare)
        return doc(db, filePath);
      };

      // requestedFiles (temp access)
      const requestedFilePromises = requestedFileRefs.map(
        async (fileEntry: {
          fileRef: { path: string };
          dateGiven: any;
          expiresAt: string;
        }) => {
          const filePath = fileEntry?.fileRef?.path;
          if (!filePath) return null;

          const fileDocRef = toFileDocRef(filePath);
          if (!fileDocRef) return null;

          const snap = await getDoc(fileDocRef);
          if (!snap.exists()) return null;

          return {
            id: snap.id,
            ...snap.data(),
            dateGiven: fileEntry.dateGiven,
            expiresAt: fileEntry.expiresAt,
          };
        }
      );

      const resolvedRequestedFiles = (
        await Promise.all(requestedFilePromises)
      ).filter(Boolean) as any[];
      const validRequestedFiles = resolvedRequestedFiles.filter((file) => {
        const exp = file.expiresAt ? new Date(file.expiresAt) : null;
        return !exp || exp > now;
      });

      // myFiles
      const myFilePromises = myFileRefs.map(
        async (fileEntry: { fileRef: { path: string }; dateGiven: any }) => {
          const filePath = fileEntry?.fileRef?.path;
          if (!filePath) return null;

          const fileDocRef = toFileDocRef(filePath);
          if (!fileDocRef) return null;

          const snap = await getDoc(fileDocRef);
          if (!snap.exists()) return null;

          const fileData = snap.data() as any;
          let originalFileName: string | null = null;

          if (fileData.originalFileId) {
            const originalRef = getOrgDoc(
              orgId,
              "files",
              fileData.originalFileId
            );
            const originalSnap = await getDoc(originalRef);
            if (originalSnap.exists()) {
              originalFileName = originalSnap.data().fileName || null;
            }
          }

          return {
            id: snap.id,
            ...fileData,
            dateGiven: fileEntry.dateGiven,
            originalFileName,
          };
        }
      );

      const resolvedMyFiles = (await Promise.all(myFilePromises)).filter(
        Boolean
      ) as any[];

      // previousFiles
      const previousFilePromises = previousFileRefs.map(
        async (fileEntry: { fileRef: { path: string }; dateGiven: any }) => {
          const filePath = fileEntry?.fileRef?.path;
          if (!filePath) return null;

          const fileDocRef = toFileDocRef(filePath);
          if (!fileDocRef) return null;

          const snap = await getDoc(fileDocRef);
          if (!snap.exists()) return null;

          return {
            id: snap.id,
            ...snap.data(),
            dateGiven: fileEntry.dateGiven,
          };
        }
      );

      const resolvedPreviousFiles = (
        await Promise.all(previousFilePromises)
      ).filter(Boolean) as any[];

      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          myFiles: resolvedMyFiles,
          previousFiles: resolvedPreviousFiles,
          requestedFiles: validRequestedFiles,
        };
      });
    } catch (error) {
      console.error("Error fetching user's files:", error);
    }
  };

  const toggleFavorite = async (folderId: string) => {
    if (!user) return;

    try {
      const userDocRef = getOrgDoc(orgId, "users", user.uid);
      const updatedFavorites = user.favoriteFolders.includes(folderId)
        ? user.favoriteFolders.filter((id) => id !== folderId) // Remove favorite
        : [...user.favoriteFolders, folderId]; // Add favorite

      // Update Firestore
      await setDoc(
        userDocRef,
        { favoriteFolders: updatedFavorites },
        { merge: true }
      );

      // Update local state ensuring the User type structure
      setUser((prevUser) => {
        if (!prevUser) return null; // Safeguard against null state

        return {
          ...prevUser,
          favoriteFolders: updatedFavorites,
        };
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Find the user's org by scanning orgs (your current approach)
      const findUserAndOrg = async (uid: string) => {
        const orgsSnapshot = await getDocs(collection(db, "organizations"));
        for (const orgDoc of orgsSnapshot.docs) {
          const candidateOrgId = orgDoc.id;
          const userDocRef = getOrgDoc(candidateOrgId, "users", uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            return { orgId: candidateOrgId, userSnap };
          }
        }
        throw new Error("User not found in any organization.");
      };

      const { orgId: resolvedOrgId, userSnap } = await findUserAndOrg(
        firebaseUser.uid
      );

      // Switch org *first*
      await switchOrganization(resolvedOrgId);

      // Use the snap we already have
      if (!userSnap.exists())
        throw new Error("User document not found in Firestore.");
      const data = userSnap.data();

      const nextUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        role: data.role || "user",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        graduationYear: data.graduationYear ?? null,
        myFiles: data.myFiles || [],
        previousFiles: data.previousFiles || [],
        requestedFiles: [],
        favoriteFolders: data.favoriteFolders || [],
        allFolders: [],
      };

      if (["admin", "coach"].includes(nextUser.role)) {
        const folderSnapshot = await getDocs(
          getOrgCollection(resolvedOrgId, "folders")
        );
        nextUser.allFolders = folderSnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
      }

      setUser(nextUser);
      closeLoginModal();
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); // Ensure Firebase logs out the user
      setUser(null); // Reset user state safely
      router.push("/login"); // Add this line to navigate to login page
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleSignUp = async ({
    email,
    password,
    firstName,
    lastName,
    graduationYear,
    role,
  }: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    graduationYear: string;
    role: string;
  }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const newUser = userCredential.user;

      await setDoc(getOrgDoc(orgId, "users", newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        orgId,
        role,
        firstName,
        lastName,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        favoriteFolders: [],
        myFiles: [],
        previousFiles: [],
        favoriteFiles: [],
      });

      console.log("User successfully signed up:", newUser.uid);
    } catch (error) {
      console.error("Error signing up user:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        loading,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        fetchMyFiles,
        toggleFavorite,
        handleLogout,
        handleLogin,
        handleSignUp,
        isPrivileged,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
