"use client";
import { useOrganization } from "@/src/context/OrganizationContext";
import LoadingSpinner from "./LoadingSpinner";

export default function OrganizationLoader({
  children,
  fallback = <LoadingSpinner />,
}) {
  const { loading, currentOrg } = useOrganization();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Organization Found
          </h2>
          <p className="text-gray-600 mb-4">
            Please contact your administrator or try again later.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
