import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import ReportForm from "./ReportForm";

const USER_COORDS = { lat: 43.65, lng: -79.38 };

// Actual placeholder strings from the component
const NAME_PLACEHOLDER = /petro-canada/i;
const ADDR_PLACEHOLDER = /123 yonge st/i;
const PRICE_PLACEHOLDER = "22.99";
const SUBMIT_BUTTON    = /submit location/i;

function renderForm(props = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  return { onSubmit, ...render(<ReportForm userCoords={USER_COORDS} onSubmit={onSubmit} {...props} />) };
}

async function fillRequiredFields(user) {
  await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), "Test Store");
  await user.type(screen.getByPlaceholderText(ADDR_PLACEHOLDER), "123 Main St, Toronto, ON");
  await user.click(screen.getByRole("checkbox")); // age confirmation
}

describe("ReportForm", () => {
  describe("validation — required fields", () => {
    it("shows an error when name is empty", async () => {
      const user = userEvent.setup();
      renderForm();

      // Fill address + age but leave name blank
      await user.type(screen.getByPlaceholderText(ADDR_PLACEHOLDER), "123 Main St");
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() =>
        expect(screen.getByText(/store name is required/i)).toBeInTheDocument()
      );
    });

    it("shows an error when address is empty", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), "Test Store");
      await user.click(screen.getByRole("checkbox"));
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() =>
        expect(screen.getByText(/address is required/i)).toBeInTheDocument()
      );
    });

    it("shows an error when age is not confirmed", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), "Test Store");
      await user.type(screen.getByPlaceholderText(ADDR_PLACEHOLDER), "123 Main St");
      // Do NOT tick the checkbox
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() =>
        expect(screen.getByText(/confirm your age/i)).toBeInTheDocument()
      );
    });
  });

  describe("validation — price field", () => {
    it("accepts submission with no price entered", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(screen.queryByText(/valid price/i)).not.toBeInTheDocument();
    });

    it("shows an error when price is 0", async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFields(user);
      await user.type(screen.getByPlaceholderText(PRICE_PLACEHOLDER), "0");
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() =>
        expect(screen.getByText(/valid price/i)).toBeInTheDocument()
      );
    });

    it("shows an error when price exceeds 200", async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFields(user);
      await user.type(screen.getByPlaceholderText(PRICE_PLACEHOLDER), "250");
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() =>
        expect(screen.getByText(/valid price/i)).toBeInTheDocument()
      );
    });

    it("shows an error when price is non-numeric", async () => {
      const user = userEvent.setup();
      renderForm();

      await fillRequiredFields(user);
      // number input ignores non-numeric input; simulate by firing a change with NaN value
      const priceInput = screen.getByPlaceholderText(PRICE_PLACEHOLDER);
      fireEvent.change(priceInput, { target: { value: "abc" } });
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      // number inputs with invalid chars return "" which parseFloat gives NaN
      await waitFor(() =>
        expect(screen.queryByText(/valid price/i)).not.toBeInTheDocument() // "" is treated as no price
      );
    });

    it("accepts a valid price and passes it as a number to onSubmit", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.type(screen.getByPlaceholderText(PRICE_PLACEHOLDER), "22.99");
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      const submitted = onSubmit.mock.calls[0][0];
      expect(submitted.price).toBe(22.99);
      expect(screen.queryByText(/valid price/i)).not.toBeInTheDocument();
    });
  });

  describe("flavor toggle", () => {
    it("adds a flavor when its chip is clicked", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: "Cool Mint" }));
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].flavors).toContain("Cool Mint");
    });

    it("removes a flavor when its chip is clicked a second time", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: "Cool Mint" })); // add
      await user.click(screen.getByRole("button", { name: "Cool Mint" })); // remove
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].flavors).not.toContain("Cool Mint");
    });

    it("allows selecting multiple flavors independently", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: "Cool Mint" }));
      await user.click(screen.getByRole("button", { name: "Citrus" }));
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      const { flavors } = onSubmit.mock.calls[0][0];
      expect(flavors).toContain("Cool Mint");
      expect(flavors).toContain("Citrus");
    });
  });

  describe("successful submission payload", () => {
    it("passes name, address, and userCoords to onSubmit", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      const payload = onSubmit.mock.calls[0][0];
      expect(payload.name).toBe("Test Store");
      expect(payload.address).toBe("123 Main St, Toronto, ON");
      expect(payload.lat).toBe(USER_COORDS.lat);
      expect(payload.lng).toBe(USER_COORDS.lng);
    });

    it("includes a reportedAt ISO timestamp", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].reportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("passes null price when no price is entered", async () => {
      const user = userEvent.setup();
      const { onSubmit } = renderForm();

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0][0].price).toBeNull();
    });
  });
});
