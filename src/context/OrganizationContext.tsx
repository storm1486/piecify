"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../app/firebase/firebase";

interface Organization {
  id: string;
  name: string;
  createdAt: string;
  settings?: {
    allowSelfRegistration?: boolean;
    defaultUserRole?: string;
    // Add more settings as needed
  };
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization | null) => void;
  orgId: string | null;
  loading: boolean;
  availableOrgs: Organization[];
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (name: string) => Promise<string>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeOrganization();
  }, []);

  const initializeOrganization = async () => {
    try {
      // Check if there's a stored organization preference
      const storedOrgId = localStorage.getItem("currentOrgId");

      if (storedOrgId) {
        await loadOrganization(storedOrgId);
      } else {
        // Load default organization or create one
        await loadDefaultOrganization();
      }

      // Also fetch available organizations for switching
      await fetchAvailableOrganizations();
    } catch (error) {
      console.error("Error initializing organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganization = async (orgId: string) => {
    try {
      const orgDoc = await getDoc(doc(db, "organizations", orgId));
      if (orgDoc.exists()) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        setCurrentOrg(orgData);
        localStorage.setItem("currentOrgId", orgId);
        return orgData;
      } else {
        throw new Error(`Organization ${orgId} not found`);
      }
    } catch (error) {
      console.error("Error loading organization:", error);
      // Fallback to default
      await loadDefaultOrganization();
    }
  };

  const loadDefaultOrganization = async () => {
    const defaultOrgId =
      process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "default-org";

    try {
      const orgDoc = await getDoc(doc(db, "organizations", defaultOrgId));

      if (orgDoc.exists()) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        setCurrentOrg(orgData);
        localStorage.setItem("currentOrgId", defaultOrgId);
      } else {
        // Create default organization if it doesn't exist
        const defaultOrg: Organization = {
          id: defaultOrgId,
          name: "Default Organization",
          createdAt: new Date().toISOString(),
          settings: {
            allowSelfRegistration: true,
            defaultUserRole: "user",
          },
        };

        await setDoc(doc(db, "organizations", defaultOrgId), {
          name: defaultOrg.name,
          createdAt: defaultOrg.createdAt,
          settings: defaultOrg.settings,
        });

        setCurrentOrg(defaultOrg);
        localStorage.setItem("currentOrgId", defaultOrgId);
      }
    } catch (error) {
      console.error("Error creating/loading default organization:", error);
    }
  };

  const fetchAvailableOrganizations = async () => {
    try {
      const orgsSnapshot = await getDocs(collection(db, "organizations"));
      const orgs = orgsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Organization[];
      setAvailableOrgs(orgs);
    } catch (error) {
      console.error("Error fetching available organizations:", error);
    }
  };

  const switchOrganization = async (orgId: string) => {
    setLoading(true);
    try {
      await loadOrganization(orgId);
      // Note: You might want to trigger a refresh of user data here
      // or emit an event that other contexts can listen to
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (name: string): Promise<string> => {
    try {
      const orgId = `org_${Date.now()}`; // Simple ID generation
      const newOrg: Organization = {
        id: orgId,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        settings: {
          allowSelfRegistration: false,
          defaultUserRole: "user",
        },
      };

      await setDoc(doc(db, "organizations", orgId), {
        name: newOrg.name,
        createdAt: newOrg.createdAt,
        settings: newOrg.settings,
      });

      // Update available orgs list
      setAvailableOrgs((prev) => [...prev, newOrg]);

      return orgId;
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        setCurrentOrg,
        orgId: currentOrg?.id || null,
        loading,
        availableOrgs,
        switchOrganization,
        createOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
};
