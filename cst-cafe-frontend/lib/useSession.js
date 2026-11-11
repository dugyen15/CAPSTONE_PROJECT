"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, LOGIN_PAGES } from "@/lib/api";

export function useSession(role, required = true) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const endpoints = {
      customer: "/auth/me",
      staff: "/staff/auth/me",
      admin: "/admin/auth/me",
    };

    // Check whether the role is valid.
    if (!endpoints[role]) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Check whether a token exists.
    if (!getToken(role)) {
      setUser(null);
      setLoading(false);

      if (required) {
        router.replace(LOGIN_PAGES[role]);
      }

      return;
    }

    // Get the signed-in user's information.
    api(endpoints[role], { role })
      .then((response) => {
        if (!cancelled) {
          setUser(response?.user ?? response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [role, required, router]);

  return { user, setUser, loading };
}