import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useAuth } from "./useAuth";

const SESSION_KEY = "zynfinder_session";

const MOCK_USER = { id: "user-123", email: "test@example.com" };
const MOCK_SESSION = { user: MOCK_USER, access_token: "tok-abc" };
const MOCK_PROFILE = {
  id: "user-123",
  username: "testuser",
  points: 50,
  reports_count: 2,
  verifications_count: 1,
};

function ok(data) {
  global.fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
}
function fail(data) {
  global.fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve(data) });
}

describe("useAuth", () => {
  describe("initial state", () => {
    it("starts with null user when no stored session", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("restores user immediately from localStorage without waiting for profile fetch", () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_SESSION));
      ok([MOCK_PROFILE]); // fetchProfile on mount
      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.isLoggedIn).toBe(true);
      expect(result.current.accessToken).toBe("tok-abc");
    });

    it("loads profile from server on mount when session exists", async () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_SESSION));
      ok([MOCK_PROFILE]);
      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.profile).not.toBeNull());
      expect(result.current.profile).toEqual(MOCK_PROFILE);
    });

    it("handles corrupted localStorage session gracefully", () => {
      localStorage.setItem(SESSION_KEY, "not-valid-json{{{");
      const { result } = renderHook(() => useAuth());
      expect(result.current.user).toBeNull();
    });
  });

  describe("signIn", () => {
    it("saves session and fetches profile on success", async () => {
      ok(MOCK_SESSION);       // token endpoint
      ok([MOCK_PROFILE]);     // fetchProfile

      const { result } = renderHook(() => useAuth());
      let res;
      await act(async () => {
        res = await result.current.signIn("test@example.com", "password123");
      });

      expect(res.success).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
      expect(result.current.isLoggedIn).toBe(true);
      expect(JSON.parse(localStorage.getItem(SESSION_KEY))).toEqual(MOCK_SESSION);
    });

    it("sets error and keeps user null on failure", async () => {
      fail({ error_description: "Invalid login credentials" });

      const { result } = renderHook(() => useAuth());
      let res;
      await act(async () => {
        res = await result.current.signIn("test@example.com", "wrongpass");
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid login credentials");
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe("Invalid login credentials");
    });

    it("sets loading to true while request is in flight then resets it", async () => {
      let resolve;
      global.fetch.mockResolvedValueOnce(
        new Promise((r) => { resolve = r; })
      );

      const { result } = renderHook(() => useAuth());
      act(() => { result.current.signIn("a@b.com", "pass"); });
      expect(result.current.loading).toBe(true);

      await act(async () => { resolve({ ok: false, json: () => Promise.resolve({}) }); });
      expect(result.current.loading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("creates profile and sets session on success", async () => {
      ok(MOCK_SESSION);       // signup
      ok([MOCK_PROFILE]);     // profile POST (return=representation)

      const { result } = renderHook(() => useAuth());
      let res;
      await act(async () => {
        res = await result.current.signUp("test@example.com", "password123", "testuser");
      });

      expect(res.success).toBe(true);
      expect(result.current.user).toEqual(MOCK_USER);
    });

    it("migrates guest localStorage points into the new profile on signup", async () => {
      localStorage.setItem("zynfinder_points", "30");
      ok(MOCK_SESSION);
      ok([MOCK_PROFILE]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("test@example.com", "password123", "testuser");
      });

      // The points value is included in the profile POST body
      const postBody = JSON.parse(global.fetch.mock.calls[1][1].body);
      expect(postBody.points).toBe(30);
    });

    it("returns error on failure", async () => {
      fail({ error: { message: "User already registered" } });

      const { result } = renderHook(() => useAuth());
      let res;
      await act(async () => {
        res = await result.current.signUp("existing@example.com", "pass", "user");
      });

      expect(res.success).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe("signOut", () => {
    it("clears session, profile, and localStorage", async () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_SESSION));
      ok([MOCK_PROFILE]); // fetchProfile on mount
      ok({});             // logout endpoint

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.profile).not.toBeNull());

      await act(async () => { await result.current.signOut(); });

      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });
  });

  describe("awardPoints", () => {
    it("PATCHes DB and updates profile.points when logged in", async () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_SESSION));
      ok([MOCK_PROFILE]); // fetchProfile on mount
      ok({});             // PATCH

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.profile).not.toBeNull());

      await act(async () => { await result.current.awardPoints(10); });

      expect(result.current.profile.points).toBe(MOCK_PROFILE.points + 10);
    });

    it("stores points in localStorage for guests", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.awardPoints(15); });

      expect(localStorage.getItem("zynfinder_points")).toBe("15");
    });

    it("accumulates guest points across multiple calls", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => { await result.current.awardPoints(10); });
      await act(async () => { await result.current.awardPoints(5); });

      expect(localStorage.getItem("zynfinder_points")).toBe("15");
    });
  });

  describe("incrementStat", () => {
    it("increments the named counter on the profile and PATCHes DB", async () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_SESSION));
      ok([MOCK_PROFILE]);
      ok({});

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.profile).not.toBeNull());

      await act(async () => { await result.current.incrementStat("reports_count"); });

      expect(result.current.profile.reports_count).toBe(MOCK_PROFILE.reports_count + 1);
    });

    it("is a no-op when not logged in", async () => {
      const { result } = renderHook(() => useAuth());
      const beforeCalls = global.fetch.mock.calls.length;

      await act(async () => { await result.current.incrementStat("reports_count"); });

      expect(global.fetch.mock.calls.length).toBe(beforeCalls);
    });
  });

  describe("displayPoints", () => {
    it("shows profile points when logged in", async () => {
      localStorage.setItem(SESSION_KEY, JSON.stringify(MOCK_SESSION));
      ok([MOCK_PROFILE]);

      const { result } = renderHook(() => useAuth());
      await waitFor(() => expect(result.current.profile).not.toBeNull());

      expect(result.current.displayPoints).toBe(MOCK_PROFILE.points);
    });

    it("shows localStorage points for guests", () => {
      localStorage.setItem("zynfinder_points", "25");
      const { result } = renderHook(() => useAuth());
      expect(result.current.displayPoints).toBe(25);
    });

    it("returns 0 for a guest with no stored points", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.displayPoints).toBe(0);
    });
  });
});
