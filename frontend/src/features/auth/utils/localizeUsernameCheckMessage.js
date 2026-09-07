import i18n from "@/i18n/i18n.js";

const MESSAGE_TO_KEY = {
  "Vibely ID is available": "auth.vibelyIdAvailable",
  "Vibely ID is available (re-verified against the database)":
    "auth.vibelyIdAvailableRecheck",
  "Vibely ID already exists": "errors.USERNAME_TAKEN",
  "Vibely ID already exists (re-verified against the database)":
    "auth.vibelyIdTakenRecheck",
  "Vibely ID may already exist. Tap Check again to verify.":
    "auth.vibelyIdMaybeTaken",
  "This Vibely ID cannot be used": "errors.USERNAME_TAKEN",
  "This Vibely ID cannot be used (re-verified against the database)":
    "auth.vibelyIdTakenRecheck",
  "This Vibely ID cannot be used. Tap Check again to verify.":
    "auth.vibelyIdMaybeTaken",
  "Please enter a Vibely ID": "auth.vibelyIdEnter",
  "Vibely ID may only contain lowercase letters, numbers, dots, and underscores (4-24 characters)":
    "errors.USERNAME_FORMAT",
};

/** Map username availability API copy to the active UI locale. */
export function localizeUsernameCheckMessage(message) {
  const msg = String(message ?? "").trim();
  if (!msg) return "";

  const key = MESSAGE_TO_KEY[msg];
  if (key) return i18n.t(key);

  if (
    msg.startsWith("Vibely ID already exists") ||
    msg.startsWith("This Vibely ID cannot be used")
  ) {
    return i18n.t("errors.USERNAME_TAKEN");
  }

  return msg;
}
