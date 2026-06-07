import type { LogEntry } from "./debug-plugin";
import { addLogListener, funnel } from "./funnel";

// ---------------------------------------------------------------------------
// Mock product data
// ---------------------------------------------------------------------------

const PRODUCT = {
  item_id: "SHOE-001",
  item_name: "클래식 러닝화",
  item_brand: "FunnelSports",
  item_category: "스포츠/신발",
  price: 89000,
  quantity: 1,
  currency: "KRW",
};

// ---------------------------------------------------------------------------
// Initial page_view
// ---------------------------------------------------------------------------

funnel.track("page_view", {
  page_title: document.title,
  page_location: window.location.href,
});

// ---------------------------------------------------------------------------
// Log panel
// ---------------------------------------------------------------------------

const logPanel = document.getElementById("log-panel") as HTMLDivElement;
let firstEntry = true;

function appendLog(entry: LogEntry): void {
  if (firstEntry) {
    logPanel.innerHTML = "";
    firstEntry = false;
  }

  const div = document.createElement("div");
  div.className = "log-entry";
  div.innerHTML = [
    `<span class="log-time">${entry.timestamp}</span>`,
    `<br><span class="log-event">${entry.eventName}</span>`,
    entry.eventId !== "-" ? ` <span class="log-id">(${entry.eventId})</span>` : "",
    `<br><span class="log-params">${JSON.stringify(entry.params, null, 2)}</span>`,
  ].join("");

  logPanel.prepend(div);
}

addLogListener(appendLog);

// ---------------------------------------------------------------------------
// Funnel event buttons
// ---------------------------------------------------------------------------

function getById(id: string): HTMLButtonElement {
  return document.getElementById(id) as HTMLButtonElement;
}

getById("btn-view-item").addEventListener("click", () => {
  funnel.track("view_item", {
    currency: PRODUCT.currency,
    value: PRODUCT.price,
    items: [PRODUCT],
  });
});

getById("btn-add-to-cart").addEventListener("click", () => {
  funnel.track("add_to_cart", {
    currency: PRODUCT.currency,
    value: PRODUCT.price,
    items: [PRODUCT],
  });
});

getById("btn-begin-checkout").addEventListener("click", () => {
  funnel.track("begin_checkout", {
    currency: PRODUCT.currency,
    value: PRODUCT.price,
    items: [PRODUCT],
  });
});

getById("btn-purchase").addEventListener("click", () => {
  const transactionId = `txn-${Date.now()}`;
  funnel.track("purchase", {
    transaction_id: transactionId,
    currency: PRODUCT.currency,
    value: PRODUCT.price,
    items: [PRODUCT],
  });
});

// ---------------------------------------------------------------------------
// User (login / logout)
// ---------------------------------------------------------------------------

const userStatus = document.getElementById("user-status") as HTMLSpanElement;
const btnLogin = getById("btn-login");
const btnLogout = getById("btn-logout");

btnLogin.addEventListener("click", () => {
  funnel.setUser({
    user_id: "user-42",
    email: "demo@example.com",
    first_name: "데모",
    last_name: "사용자",
  });
  userStatus.textContent = "로그인 상태 (user-42)";
  btnLogin.style.display = "none";
  btnLogout.style.display = "";
});

btnLogout.addEventListener("click", () => {
  funnel.resetUser();
  userStatus.textContent = "비로그인 상태";
  btnLogin.style.display = "";
  btnLogout.style.display = "none";
});

// ---------------------------------------------------------------------------
// Consent toggle
// ---------------------------------------------------------------------------

const consentStatus = document.getElementById("consent-status") as HTMLSpanElement;
const btnGrant = getById("btn-consent-grant");
const btnDeny = getById("btn-consent-deny");

funnel.setConsent({
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});

btnGrant.addEventListener("click", () => {
  funnel.setConsent({
    ad_storage: "granted",
    analytics_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
  consentStatus.textContent = "동의 상태: granted";
  btnGrant.style.display = "none";
  btnDeny.style.display = "";
});

btnDeny.addEventListener("click", () => {
  funnel.setConsent({
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  consentStatus.textContent = "동의 상태: denied";
  btnDeny.style.display = "none";
  btnGrant.style.display = "";
});
