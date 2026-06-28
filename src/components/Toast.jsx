export default function Toast({ message }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <i className="ti ti-circle-check" />
      {message}
    </div>
  );
}
