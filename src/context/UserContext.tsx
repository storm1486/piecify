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
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { email, uid } = firebaseUser;

        try {
          // Fetch user document from Firestore
          const userDocRef = doc(db, "users", uid);
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
          if (userData.role === "admin") {
            const folderSnapshot = await getDocs(collection(db, "folders"));
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

  const fetchMyFiles = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const myFileRefs = data.myFiles || [];
        const previousFileRefs = data.previousFiles || [];
        const requestedFileRefs = data.requestedFiles || [];

        const now = new Date();

        // 🔹 Resolve requested files
        const requestedFilePromises = requestedFileRefs.map(
          async (fileEntry: {
            fileRef: { path: any };
            dateGiven: any;
            expiresAt: string;
          }) => {
            const filePath = fileEntry.fileRef?.path;
            const dateGiven = fileEntry.dateGiven;
            const expiresAt = fileEntry.expiresAt;

            if (!filePath) return null;

            const fileDocRef = doc(db, filePath);
            const fileDocSnapshot = await getDoc(fileDocRef);

            return fileDocSnapshot.exists()
              ? {
                  id: fileDocSnapshot.id,
                  ...fileDocSnapshot.data(),
                  dateGiven,
                  expiresAt,
                }
              : null;
          }
        );

        const resolvedRequestedFiles = (
          await Promise.all(requestedFilePromises)
        ).filter(Boolean);
        const validRequestedFiles = resolvedRequestedFiles.filter((file) => {
          const expiresAt = file.expiresAt ? new Date(file.expiresAt) : null;
          return !expiresAt || expiresAt > now;
        });

        // 🔹 Resolve myFiles
        const myFilePromises = myFileRefs.map(
          async (fileEntry: { fileRef: { path: any }; dateGiven: any }) => {
            const filePath = fileEntry.fileRef?.path;
            const dateGiven = fileEntry.dateGiven;

            if (!filePath) return null;

            const fileDocRef = doc(db, filePath);
            const fileDocSnapshot = await getDoc(fileDocRef);

            if (!fileDocSnapshot.exists()) return null;

            const fileData = fileDocSnapshot.data();
            let originalFileName = null;

            // 🧠 If this is a cutting, fetch its original file name
            if (fileData.originalFileId) {
              const originalRef = doc(db, "files", fileData.originalFileId);
              const originalSnap = await getDoc(originalRef);
              if (originalSnap.exists()) {
                originalFileName = originalSnap.data().fileName || null;
              }
            }

            return {
              id: fileDocSnapshot.id,
              ...fileData,
              dateGiven,
              originalFileName, // ✅ Add to be used in UI
            };
          }
        );

        const resolvedMyFiles = (await Promise.all(myFilePromises)).filter(
          Boolean
        );

        // 🔹 Resolve previousFiles
        const previousFilePromises = previousFileRefs.map(
          async (fileEntry: { fileRef: { path: any }; dateGiven: any }) => {
            const filePath = fileEntry.fileRef?.path;
            const dateGiven = fileEntry.dateGiven;

            if (!filePath) return null;

            const fileDocRef = doc(db, filePath);
            const fileDocSnapshot = await getDoc(fileDocRef);

            return fileDocSnapshot.exists()
              ? { id: fileDocSnapshot.id, ...fileDocSnapshot.data(), dateGiven }
              : null;
          }
        );

        const resolvedPreviousFiles = (
          await Promise.all(previousFilePromises)
        ).filter(Boolean);

        // 🔹 Set into user context
        setUser((prevUser) => ({
          ...prevUser!,
          myFiles: resolvedMyFiles,
          previousFiles: resolvedPreviousFiles,
          requestedFiles: validRequestedFiles, // ✅ Include valid temporary files
        }));
      }
    } catch (error) {
      console.error("Error fetching user's files:", error);
    }
  };

  const toggleFavorite = async (folderId: string) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
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

      // Fetch user document from Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();

        const userData: User = {
          email: firebaseUser.email || "",
          role: data.role || "user",
          uid: firebaseUser.uid,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          graduationYear: data.graduationYear || null,
          myFiles: data.myFiles || [],
          previousFiles: data.previousFiles || [],
          requestedFiles: [],
          favoriteFolders: data.favoriteFolders || [],
          allFolders: [],
        };

        // Fetch all folders for admin users
        if (userData.role === "admin") {
          const folderSnapshot = await getDocs(collection(db, "folders"));
          userData.allFolders = folderSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }

        setUser(userData); // Update context state
        closeLoginModal(); // Close login modal after successful login
      } else {
        throw new Error("User document not found in Firestore.");
      }
    } catch (error) {
      console.error("Error logging in:", error);
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
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role,
        firstName,
        lastName,
        graduationYear,
        favoriteFolders: [],
        myFiles: [],
        previousFiles: [],
        favoriteFiles: [],
      });

      console.log("User successfully signed up:", user.uid);
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
