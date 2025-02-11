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

// Define the shape of the user data
interface User {
  email: string;
  role: string;
  uid: string;
  firstName: string; // New field
  lastName: string; // New field
  graduationYear: number | null; // New field (nullable)
  myFiles: Array<any>;
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
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

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

  // Fetch user's files
  const fetchMyFiles = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const fileRefs = data.myFiles || [];

        // Resolve file references to actual file data
        const filePromises = fileRefs.map(async (fileRef: { path: string }) => {
          const fileDocRef = doc(db, fileRef.path); // Get the actual document using the path
          const fileDocSnapshot = await getDoc(fileDocRef);
          return fileDocSnapshot.exists()
            ? { id: fileDocSnapshot.id, ...fileDocSnapshot.data() }
            : null;
        });

        const resolvedFiles = (await Promise.all(filePromises)).filter(
          (file) => file !== null
        );

        setUser((prevUser) => ({
          ...prevUser!,
          myFiles: resolvedFiles, // Store resolved files
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
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        loading,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        fetchMyFiles,
        toggleFavorite,
        handleLogout,
        handleLogin,
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
function closeLoginModal() {
  throw new Error("Function not implemented.");
}
