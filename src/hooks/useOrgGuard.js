"use client";
import { useEffect } from "react";
import { useOrganization } from "../context/OrganizationContext";
import { useRouter } from "next/navigation";

// Custom hook to ensure organization is loaded before proceeding
export const useOrgGuard = (redirectTo = "/") => {
  const { orgId, loading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !orgId) {
      console.warn("No organization found, redirecting...");
      router.push(redirectTo);
    }
  }, [loading, orgId, router, redirectTo]);

  return { orgId, loading, isReady: !loading && !!orgId };
};
