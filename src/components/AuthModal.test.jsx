import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import AuthModal from "./AuthModal";

function renderModal(props = {}) {
  const defaults = {
    onClose: vi.fn(),
    onSignIn: vi.fn().mockResolvedValue({ success: true }),
    onSignUp: vi.fn().mockResolvedValue({ success: true }),
    authLoading: false,
    initialMode: "login",
  };
  return render(<AuthModal {...defaults} {...props} />);
}

// The modal has two buttons named "Sign in" (the tab + the form submit) and
// two named "Create account" for the same reason. Use the form submit directly.
function getSubmitButton() {
  return document.querySelector(".modal-submit");
}

describe("AuthModal", () => {
  describe("initial render", () => {
    it("shows email and password fields in login mode", () => {
      renderModal();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it("does not show username field in login mode", () => {
      renderModal();
      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    });

    it("shows username field when initialMode is signup", () => {
      renderModal({ initialMode: "signup" });
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    it("renders a form submit button in login mode", () => {
      renderModal();
      const btn = getSubmitButton();
      expect(btn).toBeTruthy();
      expect(btn.textContent).toMatch(/sign in/i);
    });
  });

  describe("mode switching", () => {
    it("switches to signup mode when the Create account tab is clicked", async () => {
      const user = userEvent.setup();
      renderModal();

      // Two "Create account" buttons: tab + footer switch link — click the tab
      const tabs = screen.getAllByRole("button", { name: /create account/i });
      await user.click(tabs[0]);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });

    it("switches back to login mode from signup", async () => {
      const user = userEvent.setup();
      renderModal({ initialMode: "signup" });

      // Two "Sign in" buttons: tab + footer switch link — click the tab (index 0)
      const signInBtns = screen.getAllByRole("button", { name: /sign in/i });
      await user.click(signInBtns[0]);

      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    });

    it("clears any error when switching modes", async () => {
      const user = userEvent.setup();
      const onSignIn = vi.fn().mockResolvedValue({ success: false, error: "Bad credentials" });
      renderModal({ onSignIn });

      await user.type(screen.getByLabelText(/email/i), "a@b.com");
      await user.type(screen.getByLabelText(/password/i), "pass123");
      await user.click(getSubmitButton());

      await waitFor(() => expect(screen.getByText("Bad credentials")).toBeInTheDocument());

      // Switch modes — error should disappear
      const createBtns = screen.getAllByRole("button", { name: /create account/i });
      await user.click(createBtns[0]);
      expect(screen.queryByText("Bad credentials")).not.toBeInTheDocument();
    });
  });

  describe("form submission — login", () => {
    it("calls onSignIn with email and password on submit", async () => {
      const user = userEvent.setup();
      const onSignIn = vi.fn().mockResolvedValue({ success: true });
      renderModal({ onSignIn });

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(getSubmitButton());

      await waitFor(() =>
        expect(onSignIn).toHaveBeenCalledWith("test@example.com", "password123")
      );
    });

    it("displays error message returned from onSignIn", async () => {
      const user = userEvent.setup();
      const onSignIn = vi.fn().mockResolvedValue({ success: false, error: "Invalid credentials" });
      renderModal({ onSignIn });

      await user.type(screen.getByLabelText(/email/i), "a@b.com");
      await user.type(screen.getByLabelText(/password/i), "wrong");
      await user.click(getSubmitButton());

      await waitFor(() =>
        expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
      );
    });

    it("shows a fallback error when callback returns no error message", async () => {
      const user = userEvent.setup();
      const onSignIn = vi.fn().mockResolvedValue({ success: false });
      renderModal({ onSignIn });

      await user.type(screen.getByLabelText(/email/i), "a@b.com");
      await user.type(screen.getByLabelText(/password/i), "pass");
      await user.click(getSubmitButton());

      await waitFor(() =>
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      );
    });
  });

  describe("form submission — signup", () => {
    it("calls onSignUp with email, password, and username", async () => {
      const user = userEvent.setup();
      const onSignUp = vi.fn().mockResolvedValue({ success: true });
      renderModal({ initialMode: "signup", onSignUp });

      await user.type(screen.getByLabelText(/username/i), "cooluser");
      await user.type(screen.getByLabelText(/email/i), "cool@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(getSubmitButton());

      await waitFor(() =>
        expect(onSignUp).toHaveBeenCalledWith("cool@example.com", "password123", "cooluser")
      );
    });
  });

  describe("loading state", () => {
    it("disables the submit button while authLoading is true", () => {
      renderModal({ authLoading: true });
      const btn = getSubmitButton();
      expect(btn.disabled).toBe(true);
    });

    it("shows 'Working…' text while busy", () => {
      renderModal({ authLoading: true });
      expect(screen.getByText(/working/i)).toBeInTheDocument();
    });
  });

  describe("closing", () => {
    it("calls onClose when the close (×) button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      await user.click(screen.getByRole("button", { name: /close/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when 'Continue as guest' button is clicked", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ onClose });

      await user.click(screen.getByRole("button", { name: /continue as guest/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });
});
