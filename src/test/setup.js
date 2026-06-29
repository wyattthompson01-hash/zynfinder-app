import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  // Fresh fetch mock before each test — defaults to a failed response so hooks
  // fall back to their seed/local state without throwing.
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve([]),
  });
});
