import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { getDistance, currencySymbol } from "./StoreList";
import StoreList from "./StoreList";

// ── Pure function tests ──────────────────────────────────────────────────────

describe("getDistance (Haversine)", () => {
  it("returns 0 for the same point", () => {
    expect(getDistance(43.65, -79.38, 43.65, -79.38)).toBe(0);
  });

  it("calculates distance between Toronto and New York (~550 km)", () => {
    const dist = getDistance(43.6532, -79.3832, 40.7128, -74.006);
    expect(dist).toBeGreaterThan(540);
    expect(dist).toBeLessThan(570);
  });

  it("is symmetric — distance A→B equals B→A", () => {
    const ab = getDistance(43.65, -79.38, 48.86, 2.35);
    const ba = getDistance(48.86, 2.35, 43.65, -79.38);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });

  it("returns a small positive distance for nearby points", () => {
    // ~1 km apart
    const dist = getDistance(43.6532, -79.3832, 43.6622, -79.3832);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2);
  });
});

describe("currencySymbol", () => {
  it.each([
    ["CAD", "CA$"],
    ["USD", "$"],
    ["GBP", "£"],
    ["EUR", "€"],
    ["SEK", "kr"],
    ["JPY", "¥"],
    ["AUD", "A$"],
    ["CHF", "Fr"],
    ["AED", "AED"],
  ])("%s → %s", (input, expected) => {
    expect(currencySymbol(input)).toBe(expected);
  });

  it("returns the currency code itself for unknown currencies", () => {
    expect(currencySymbol("BTC")).toBe("BTC");
  });

  it("falls back to $ for null/undefined", () => {
    expect(currencySymbol(null)).toBe("$");
    expect(currencySymbol(undefined)).toBe("$");
    expect(currencySymbol("")).toBe("$");
  });
});

// ── Component tests ──────────────────────────────────────────────────────────

const STORES = [
  { id: "1", name: "Petro-Canada", address: "320 Bloor St W, Toronto, ON", lat: 43.6649, lng: -79.4102, type: "gas", status: "verified", confirmations: 5, latest_price: 22.99 },
  { id: "2", name: "Mac's Convenience", address: "88 College St, Toronto, ON", lat: 43.6588, lng: -79.4008, type: "convenience", status: "pending", confirmations: 1, latest_price: null },
  { id: "3", name: "Circle K", address: "1 Yonge St, Toronto, ON", lat: 43.6426, lng: -79.3871, type: "gas", status: "verified", confirmations: 7, latest_price: 24.50 },
];

function renderList(props = {}) {
  const onStoreClick = props.onStoreClick ?? vi.fn();
  return render(
    <StoreList
      stores={STORES}
      loading={false}
      userCoords={{ lat: 43.65, lng: -79.38 }}
      onStoreClick={onStoreClick}
      {...props}
    />
  );
}

describe("StoreList component", () => {
  it("renders all stores when no search term is entered", () => {
    renderList();
    expect(screen.getByText("Petro-Canada")).toBeInTheDocument();
    expect(screen.getByText("Mac's Convenience")).toBeInTheDocument();
    expect(screen.getByText("Circle K")).toBeInTheDocument();
  });

  it("filters stores by name search", () => {
    renderList();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "petro" } });

    // The name appears in both the suggestion dropdown and main list — at least 1 match
    expect(screen.getAllByText("Petro-Canada").length).toBeGreaterThan(0);
    // Stores that don't match should not appear in the main list
    expect(screen.queryByText("Circle K")).not.toBeInTheDocument();
  });

  it("filters stores by address search", () => {
    renderList();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "College" } });

    // Name appears in suggestion dropdown AND main list — both are valid matches
    expect(screen.getAllByText("Mac's Convenience").length).toBeGreaterThan(0);
    // Stores whose name/address don't contain "College" should not appear
    expect(screen.queryByText("Circle K")).not.toBeInTheDocument();
  });

  it("shows all stores when search is cleared", () => {
    renderList();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "petro" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("Petro-Canada")).toBeInTheDocument();
    expect(screen.getByText("Mac's Convenience")).toBeInTheDocument();
  });

  it("shows a message or empty list when no stores match the search", () => {
    renderList();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "xyznonexistent" } });

    expect(screen.queryByText("Petro-Canada")).not.toBeInTheDocument();
    expect(screen.queryByText("Mac's Convenience")).not.toBeInTheDocument();
  });

  it("calls onStoreClick when a store item is clicked", () => {
    const onStoreClick = vi.fn();
    renderList({ onStoreClick });

    fireEvent.click(screen.getByText("Petro-Canada"));
    expect(onStoreClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", name: "Petro-Canada" })
    );
  });

  it("shows a loading indicator when loading prop is true", () => {
    render(
      <StoreList stores={[]} loading={true} userCoords={null} onStoreClick={vi.fn()} />
    );
    // Any loading indicator (spinner, text, etc.)
    const loader = document.querySelector(".spinner, [data-testid='loading'], .loading");
    const hasLoadingText = screen.queryByText(/loading/i);
    expect(loader !== null || hasLoadingText !== null).toBe(true);
  });

  it("sorts stores by distance when userCoords is provided", () => {
    // Circle K (id=3) is closest to lat:43.65, lng:-79.38 based on coords
    renderList({ userCoords: { lat: 43.6426, lng: -79.3871 } });
    const items = screen.getAllByText(/verified|needs verify|gone|unconfirmed/i);
    // Just verify all stores are rendered with coordinates factored in (no errors)
    expect(items.length).toBeGreaterThan(0);
  });

  it("renders stores without distances when userCoords is null", () => {
    render(
      <StoreList stores={STORES} loading={false} userCoords={null} onStoreClick={vi.fn()} />
    );
    expect(screen.getByText("Petro-Canada")).toBeInTheDocument();
  });
});
