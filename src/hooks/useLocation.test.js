import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useLocation } from "./useLocation";

const TORONTO = { lat: 43.6532, lng: -79.3832 };

function mockGeolocation(overrides = {}) {
  const geo = {
    getCurrentPosition: vi.fn(),
    ...overrides,
  };
  Object.defineProperty(global.navigator, "geolocation", {
    value: geo,
    configurable: true,
    writable: true,
  });
  return geo;
}

describe("useLocation", () => {
  it("returns the device coordinates when geolocation succeeds", async () => {
    const geo = mockGeolocation();
    geo.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 51.5074, longitude: -0.1278 } }); // London
    });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.coords).not.toBeNull());
    expect(result.current.coords).toEqual({ lat: 51.5074, lng: -0.1278 });
  });

  it("falls back to Toronto when geolocation fails", async () => {
    const geo = mockGeolocation();
    geo.getCurrentPosition.mockImplementation((_success, error) => {
      error(new Error("Permission denied"));
    });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.coords).not.toBeNull());
    expect(result.current.coords).toEqual(TORONTO);
  });

  it("falls back to Toronto when geolocation is not available", async () => {
    Object.defineProperty(global.navigator, "geolocation", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => expect(result.current.coords).not.toBeNull());
    expect(result.current.coords).toEqual(TORONTO);
  });

  it("starts with null coords before geolocation resolves", () => {
    mockGeolocation({ getCurrentPosition: vi.fn() }); // never calls back

    const { result } = renderHook(() => useLocation());
    expect(result.current.coords).toBeNull();
  });
});
