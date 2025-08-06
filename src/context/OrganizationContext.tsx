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
      const storedOrgId = localStorage.getItem("currentOrgId");

      if (storedOrgId) {
        await loadOrganization(storedOrgId);
      }

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
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (name: string): Promise<string> => {
    try {
      const orgId = `org_${Date.now()}`;
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
