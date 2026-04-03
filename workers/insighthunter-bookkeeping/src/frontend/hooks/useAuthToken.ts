import { useMemo } from "react";

// Align with insighthunter-main convention: token from cookie or localStorage
export function useAuthToken(): string | null {
  return useMemo(() => {
    const fromStorage = localStorage.getItem("ih_token");
    if (fromStorage) return fromStorage;
    const match = document.cookie.match(/ih_session=([^;]+)/);
    return match ? match[1] : null;
  }, []);
}
