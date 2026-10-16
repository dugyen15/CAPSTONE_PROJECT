"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, LOGIN_PAGES } from "@/lib/api";

// Loads the signed-in person for a role ("customer" or "staff").
// required = true  -> sends visitors who are not logged in to that role's login page.
// required = false -> just returns user = null (used for pages guests may browse).
export function useSession(role, required = true) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!getToken(role)) {
      if (required) router.replace(LOGIN_PAGES[role]);
      setLoading(false);
      return;
    }

    api(role === "staff" ? "/staff/auth/me" : "/auth/me", { role })
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [role, required, router]);

  return { user, setUser, loading };
}
