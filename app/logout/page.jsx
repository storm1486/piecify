// app/logout/page.tsx
"use client";
import { useEffect } from "react";
import { useUser } from "@/src/context/UserContext";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const { handleLogout } = useUser();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      await handleLogout();
      router.push("/login");
    };

    performLogout();
  }, [handleLogout, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Logging out...</h1>
        <p className="text-gray-600">
          You will be redirected to the login page.
        </p>
      </div>
    </div>
  );
}
