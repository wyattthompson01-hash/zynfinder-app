import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseAddress, filterByPeriod } from "./PricesPage";

describe("parseAddress", () => {
  describe("null / empty input", () => {
    it("returns Unknown placeholders for null", () => {
      expect(parseAddress(null)).toEqual({ city: "Unknown", region: "Unknown", country: "Other" });
    });

    it("returns Unknown placeholders for empty string", () => {
      expect(parseAddress("")).toEqual({ city: "Unknown", region: "Unknown", country: "Other" });
    });
  });

  describe("single segment", () => {
    it("returns the segment as city with empty region", () => {
      const result = parseAddress("Toronto");
      expect(result.city).toBe("Toronto");
      expect(result.region).toBe("");
      expect(result.country).toBe("Other");
    });
  });

  describe("Canadian addresses", () => {
    it("detects province abbreviation in last segment", () => {
      const result = parseAddress("320 Bloor St W, Toronto, ON");
      expect(result.country).toBe("Canada");
      expect(result.region).toBe("ON");
      expect(result.city).toBe("Toronto");
    });

    it("detects province abbreviation BC", () => {
      expect(parseAddress("123 Main St, Vancouver, BC").country).toBe("Canada");
    });

    it("detects full province name Ontario", () => {
      expect(parseAddress("123 St, Toronto, Ontario").country).toBe("Canada");
    });

    it("strips Canadian postal codes from the region", () => {
      const result = parseAddress("123 St, Toronto, ON M5V 2T6");
      expect(result.region).toBe("ON");
      expect(result.country).toBe("Canada");
    });
  });

  describe("US addresses", () => {
    it("detects state abbreviation CA", () => {
      const result = parseAddress("456 Sunset Blvd, Los Angeles, CA");
      expect(result.country).toBe("United States");
      expect(result.region).toBe("CA");
      expect(result.city).toBe("Los Angeles");
    });

    it("detects state abbreviation TX", () => {
      expect(parseAddress("1 Main St, Austin, TX").country).toBe("United States");
    });

    it("detects full state name California", () => {
      expect(parseAddress("1 Road, LA, California").country).toBe("United States");
    });

    it("strips US ZIP codes from the region", () => {
      const result = parseAddress("1 Main St, Austin, TX 78701");
      expect(result.region).toBe("TX");
      expect(result.country).toBe("United States");
    });
  });

  describe("other countries", () => {
    it("returns Other for unrecognized regions", () => {
      const result = parseAddress("10 Downing St, London, UK");
      expect(result.country).toBe("Other");
    });
  });
});

// ── filterByPeriod ──────────────────────────────────────────────────────────

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

const DATASET = [
  { date: daysAgo(400), price: 18 },  // >1Y old
  { date: daysAgo(200), price: 20 },  // >6M old
  { date: daysAgo(100), price: 21 },  // >3M old
  { date: daysAgo(40),  price: 22 },  // >1M old
  { date: daysAgo(10),  price: 23 },  // >1W
  { date: daysAgo(3),   price: 24 },  // within 1W
];

describe("filterByPeriod", () => {
  it("returns all data for ALL period", () => {
    expect(filterByPeriod(DATASET, "ALL")).toHaveLength(DATASET.length);
  });

  it("returns all data for unknown period id", () => {
    expect(filterByPeriod(DATASET, "UNKNOWN")).toHaveLength(DATASET.length);
  });

  it("filters to last 7 days for 1W", () => {
    const result = filterByPeriod(DATASET, "1W");
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(24);
  });

  it("filters to last 30 days for 1M", () => {
    const result = filterByPeriod(DATASET, "1M");
    // items from daysAgo(10) and daysAgo(3) qualify
    expect(result).toHaveLength(2);
  });

  it("filters to last 90 days for 3M", () => {
    const result = filterByPeriod(DATASET, "3M");
    // daysAgo(40), daysAgo(10), daysAgo(3) are all within 90 days
    expect(result).toHaveLength(3);
    expect(result.every((d) => d.price >= 22)).toBe(true);
  });

  it("filters to last 180 days for 6M", () => {
    const result = filterByPeriod(DATASET, "6M");
    // daysAgo(100) and daysAgo(40) and daysAgo(10) and daysAgo(3) qualify
    expect(result).toHaveLength(4);
  });

  it("filters to last 365 days for 1Y", () => {
    const result = filterByPeriod(DATASET, "1Y");
    // everything except daysAgo(400)
    expect(result).toHaveLength(5);
  });

  it("returns an empty array when no entries fall within the period", () => {
    const oldData = [{ date: daysAgo(60), price: 10 }];
    expect(filterByPeriod(oldData, "1W")).toHaveLength(0);
  });
});
