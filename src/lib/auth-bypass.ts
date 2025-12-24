export const AUTH_BYPASS_STORAGE_KEY = "gileade_auth_bypass";

export const isAuthBypassed = () => {
  try {
    return localStorage.getItem(AUTH_BYPASS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const setAuthBypassed = (value: boolean) => {
  try {
    localStorage.setItem(AUTH_BYPASS_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore
  }
};
