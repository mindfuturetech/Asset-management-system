import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export default function Toaster({ toasts, onDismiss }) {
  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <Icon size={18} aria-hidden="true" />
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast__close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
