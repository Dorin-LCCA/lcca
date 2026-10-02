import api from "./api";

function getSessionId() {
  let id = localStorage.getItem("voyara_session");
  if (!id) {
    id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("voyara_session", id);
  }
  return id;
}

// Fire-and-forget analytics event. Structured so GA/CRM could be added later.
export function track(event, props = {}) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, props);
    }
  } catch (e) {
    /* noop */
  }
  api
    .post("/analytics/track", { event, props, session_id: getSessionId() })
    .catch(() => {});
}
