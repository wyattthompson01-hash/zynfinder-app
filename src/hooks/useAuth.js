import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_KEY = "zynfinder_session";

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${token || SUPABASE_KEY}`,
  };
}

export function useAuth() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch { return null; }
  });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = session?.user || null;
  const accessToken = session?.access_token || null;

  const fetchProfile = useCallback(async (userId, token) => {
    if (!userId || !token) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
        { headers: authHeaders(token) }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setProfile(data[0]);
    } catch (e) { console.warn("Profile fetch failed:", e); }
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (session?.access_token && session?.user) {
      fetchProfile(session.user.id, session.access_token);
    }
  }, []);

  const _saveSession = (data) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setSession(data);
  };

  const signUp = useCallback(async (email, password, username) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: authHeaders(null),
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || data.error?.message || "Signup failed");

      _saveSession(data);

      // Migrate any existing localStorage points on signup
      const localPts = parseInt(localStorage.getItem("zynfinder_points") || "0");

      if (data.user?.id && data.access_token) {
        const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: "POST",
          headers: { ...authHeaders(data.access_token), "Prefer": "return=representation" },
          body: JSON.stringify({
            id: data.user.id,
            username: username.trim(),
            points: localPts,
            reports_count: 0,
            verifications_count: 0,
          }),
        });
        const profileData = await profileRes.json();
        if (Array.isArray(profileData) && profileData.length > 0) {
          setProfile(profileData[0]);
        } else {
          await fetchProfile(data.user.id, data.access_token);
        }
      }
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally { setLoading(false); }
  }, [fetchProfile]);

  const signIn = useCallback(async (email, password) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: authHeaders(null),
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.error || "Login failed");

      _saveSession(data);
      await fetchProfile(data.user?.id, data.access_token);
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally { setLoading(false); }
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    if (accessToken) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: "POST",
          headers: authHeaders(accessToken),
        });
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setProfile(null);
  }, [accessToken]);

  // Award points — uses DB when logged in, localStorage when guest
  const awardPoints = useCallback(async (pts) => {
    if (user?.id && accessToken) {
      const newPts = (profile?.points || 0) + pts;
      setProfile((p) => p ? { ...p, points: newPts } : p);
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: "PATCH",
          headers: authHeaders(accessToken),
          body: JSON.stringify({ points: newPts }),
        });
      } catch (e) { console.warn("Points update failed:", e); }
    } else {
      // Guest fallback — localStorage
      const cur = parseInt(localStorage.getItem("zynfinder_points") || "0");
      localStorage.setItem("zynfinder_points", cur + pts);
    }
  }, [user, accessToken, profile]);

  // Increment a stat counter on the profile (reports_count or verifications_count)
  const incrementStat = useCallback(async (field) => {
    if (!user?.id || !accessToken) return;
    const newVal = (profile?.[field] || 0) + 1;
    setProfile((p) => p ? { ...p, [field]: newVal } : p);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ [field]: newVal }),
      });
    } catch (e) { console.warn("Stat update failed:", e); }
  }, [user, accessToken, profile]);

  const updateProfile = useCallback(async (fields) => {
    if (!user?.id || !accessToken) return;
    setProfile((p) => p ? { ...p, ...fields } : p);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify(fields),
      });
    } catch (e) { console.warn("Profile update failed:", e); }
  }, [user, accessToken]);

  // Points to display: DB if logged in, localStorage if guest
  const displayPoints = user
    ? (profile?.points ?? 0)
    : parseInt(localStorage.getItem("zynfinder_points") || "0");

  return {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    awardPoints,
    incrementStat,
    isLoggedIn: !!user,
    accessToken,
    displayPoints,
    updateProfile,
  };
}
