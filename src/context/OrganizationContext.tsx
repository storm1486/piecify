"use client";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../app/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../app/firebase/firebase";

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
  availableOrgs: Organization[]; // only orgs the user belongs to
  switchOrganization: (orgId: string, uidOverride?: string) => Promise<void>;
  createOrganization: (name: string) => Promise<string>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(
    undefined
  );
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) Wait for auth to resolve once
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // 2) After auth resolves, initialize organization based on membership
  useEffect(() => {
    if (firebaseUid === null) {
      // user is signed out
      setCurrentOrg(null);
      setAvailableOrgs([]);
      setLoading(false);
      return;
    }
    if (firebaseUid === undefined) {
      // still resolving; do nothing
      return;
    }
    initializeForUser(firebaseUid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUid]);

  const initializeForUser = async (uid: string) => {
    setLoading(true);
    try {
      const orgsSnapshot = await getDocs(collection(db, "organizations"));
      const memberOrgs: Organization[] = [];

      // collect only orgs where organizations/{orgId}/users/{uid} exists
      for (const orgDocSnap of orgsSnapshot.docs) {
        const orgId = orgDocSnap.id;
        const memberSnap = await getDoc(
          doc(db, "organizations", orgId, "users", uid)
        );
        if (memberSnap.exists()) {
          const orgData = {
            id: orgId,
            ...(orgDocSnap.data() as any),
          } as Organization;
          memberOrgs.push(orgData);
        }
      }

      setAvailableOrgs(memberOrgs);

      // prefer stored orgId if still a member
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem("currentOrgId")
          : null;
      let nextOrg: Organization | null = null;

      if (stored) {
        nextOrg = memberOrgs.find((o) => o.id === stored) ?? null;
      }
      if (!nextOrg && memberOrgs.length > 0) {
        nextOrg = memberOrgs[0];
      }

      setCurrentOrg(nextOrg);
      if (nextOrg) localStorage.setItem("currentOrgId", nextOrg.id);
      else localStorage.removeItem("currentOrgId");
    } catch (err) {
      console.error("Error initializing organization:", err);
      setCurrentOrg(null);
      setAvailableOrgs([]);
      localStorage.removeItem("currentOrgId");
    } finally {
      setLoading(false);
    }
  };

  const loadOrganization = async (orgId: string) => {
    const orgSnap = await getDoc(doc(db, "organizations", orgId));
    if (!orgSnap.exists()) throw new Error(`Organization ${orgId} not found`);
    const orgData = { id: orgSnap.id, ...orgSnap.data() } as Organization;
    setCurrentOrg(orgData);
    localStorage.setItem("currentOrgId", orgId);
    return orgData;
  };

  const switchOrganization = async (orgId: string, uidOverride?: string) => {
    setLoading(true);
    try {
      const uid = uidOverride ?? firebaseUid ?? auth.currentUser?.uid ?? null;
      if (!uid) throw new Error("Not signed in.");

      const memberSnap = await getDoc(
        doc(db, "organizations", orgId, "users", uid)
      );
      if (!memberSnap.exists()) {
        throw new Error("You do not have access to this organization.");
      }
      await loadOrganization(orgId);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (name: string): Promise<string> => {
    // Keep your existing implementation (or invite flow). Left unchanged.
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
    // NOTE: you probably also want to create organizations/{orgId}/users/{uid}
    // for the creator here.

    return orgId;
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
  const ctx = useContext(OrganizationContext);
  if (!ctx)
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  return ctx;
};
