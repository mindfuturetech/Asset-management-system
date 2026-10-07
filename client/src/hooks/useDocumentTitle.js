import { useEffect } from "react";

export const APP_NAME = import.meta.env.VITE_APP_NAME || "Asset Manager";

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
