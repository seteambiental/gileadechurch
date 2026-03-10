/**
 * WebAuthn / Biometric Authentication Utilities
 * 
 * Uses the Web Authentication API to leverage device biometrics (fingerprint, Face ID).
 * Credentials are device-bound; the refresh token is stored locally gated behind biometric.
 */

const STORAGE_KEYS = {
  credentialId: "gileade_bio_cred_id",
  userEmail: "gileade_bio_email",
  refreshToken: "gileade_bio_refresh",
};

// Random bytes helper
function randomBuffer(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  return buf;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if the device supports platform authenticator (biometrics).
 * Must be called asynchronously — returns false on desktop/browsers without biometric.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if biometric credentials are stored locally for this device.
 */
export function hasBiometricCredential(): boolean {
  try {
    return !!(
      localStorage.getItem(STORAGE_KEYS.credentialId) &&
      localStorage.getItem(STORAGE_KEYS.refreshToken)
    );
  } catch {
    return false;
  }
}

/**
 * Get the email associated with the stored biometric credential.
 */
export function getBiometricEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.userEmail);
  } catch {
    return null;
  }
}

/**
 * Register a biometric credential for the current user.
 * Call after a successful email/password login.
 */
export async function registerBiometric(
  userId: string,
  userEmail: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBuffer(32),
        rp: {
          name: "Gileade Church",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: userEmail,
          displayName: userEmail,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },   // ES256
          { alg: -257, type: "public-key" },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    // Store credential ID and session data locally
    const rawId = bufferToBase64(credential.rawId);
    localStorage.setItem(STORAGE_KEYS.credentialId, rawId);
    localStorage.setItem(STORAGE_KEYS.userEmail, userEmail);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);

    return true;
  } catch (err) {
    console.error("Erro ao registrar biometria:", err);
    return false;
  }
}

/**
 * Authenticate using biometrics.
 * Returns the stored refresh token if biometric verification succeeds.
 */
export async function authenticateWithBiometric(): Promise<{
  refreshToken: string;
  email: string;
} | null> {
  try {
    const credentialIdB64 = localStorage.getItem(STORAGE_KEYS.credentialId);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const email = localStorage.getItem(STORAGE_KEYS.userEmail);

    if (!credentialIdB64 || !refreshToken || !email) return null;

    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBuffer(32),
        allowCredentials: [
          {
            id: base64ToBuffer(credentialIdB64),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return null;

    return { refreshToken, email };
  } catch (err) {
    console.error("Erro na autenticação biométrica:", err);
    return null;
  }
}

/**
 * Remove biometric credentials from this device.
 */
export function removeBiometricCredential(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.credentialId);
    localStorage.removeItem(STORAGE_KEYS.userEmail);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  } catch {
    // ignore
  }
}

/**
 * Update the stored refresh token (call after session refresh).
 */
export function updateBiometricRefreshToken(newToken: string): void {
  try {
    if (localStorage.getItem(STORAGE_KEYS.credentialId)) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, newToken);
    }
  } catch {
    // ignore
  }
}
