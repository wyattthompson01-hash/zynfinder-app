import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PriceChart from "./PriceChart";

function price(p, canSize = 15, daysAgo = 0) {
  const d = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return { price: p, can_size: canSize, reported_at: d };
}

describe("PriceChart", () => {
  describe("empty / null input", () => {
    it("renders nothing when prices is null", () => {
      const { container } = render(<PriceChart prices={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when prices is an empty array", () => {
      const { container } = render(<PriceChart prices={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("single price — ticker only", () => {
    it("renders the price value", () => {
      render(<PriceChart prices={[price(22.99)]} />);
      expect(screen.getByText("$22.99")).toBeInTheDocument();
    });

    it("shows the can size", () => {
      render(<PriceChart prices={[price(22.99, 20)]} />);
      expect(screen.getByText(/20 pouches/)).toBeInTheDocument();
    });

    it("shows '1 report'", () => {
      render(<PriceChart prices={[price(22.99)]} />);
      expect(screen.getByText(/1 report/)).toBeInTheDocument();
    });

    it("does not render an SVG chart for a single price", () => {
      const { container } = render(<PriceChart prices={[price(22.99)]} />);
      expect(container.querySelector("svg")).toBeNull();
    });
  });

  describe("multiple prices — full chart", () => {
    const prices = [
      price(20.0, 15, 10),
      price(21.5, 15, 5),
      price(22.99, 15, 0),
    ];

    it("renders an SVG element", () => {
      const { container } = render(<PriceChart prices={prices} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });

    it("renders the latest (most recent) price in the ticker", () => {
      render(<PriceChart prices={prices} />);
      expect(screen.getByText("$22.99")).toBeInTheDocument();
    });

    it("shows the report count", () => {
      render(<PriceChart prices={prices} />);
      expect(screen.getByText(/3 reports/)).toBeInTheDocument();
    });

    it("shows a positive change when price increased", () => {
      // first=20, latest=22.99 → +$2.99 (+14.95%)
      render(<PriceChart prices={prices} />);
      const changeEl = document.querySelector(".price-ticker-change");
      expect(changeEl).toBeInTheDocument();
      expect(changeEl.textContent).toMatch(/\+/);
    });

    it("shows a negative change when price decreased", () => {
      const falling = [price(25, 15, 10), price(22, 15, 5), price(20, 15, 0)];
      render(<PriceChart prices={falling} />);
      const changeEl = document.querySelector(".price-ticker-change");
      // No leading + and change has a minus sign (or we check the 'down' class)
      expect(changeEl?.classList.contains("down")).toBe(true);
    });

    it("renders Low and High range labels", () => {
      render(<PriceChart prices={prices} />);
      expect(screen.getByText(/low:/i)).toBeInTheDocument();
      expect(screen.getByText(/high:/i)).toBeInTheDocument();
    });

    it("shows the low as the minimum price", () => {
      render(<PriceChart prices={prices} />);
      expect(screen.getByText(/low:.*\$20\.00/i)).toBeInTheDocument();
    });

    it("shows the high as the maximum price", () => {
      render(<PriceChart prices={prices} />);
      expect(screen.getByText(/high:.*\$22\.99/i)).toBeInTheDocument();
    });
  });

  describe("flat prices (all same value)", () => {
    it("renders without crashing when all prices are equal", () => {
      const flat = [price(20, 15, 5), price(20, 15, 3), price(20, 15, 0)];
      expect(() => render(<PriceChart prices={flat} />)).not.toThrow();
    });

    it("shows 0% change for flat prices", () => {
      const flat = [price(20, 15, 5), price(20, 15, 0)];
      render(<PriceChart prices={flat} />);
      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
    });
  });

  describe("two prices", () => {
    it("renders correctly with exactly two data points", () => {
      const two = [price(19.99, 15, 7), price(21.99, 15, 0)];
      const { container } = render(<PriceChart prices={two} />);
      expect(container.querySelector("polyline")).toBeInTheDocument();
    });
  });
});
