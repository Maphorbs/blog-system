/**
 * Securely encrypts and decrypts keys using a master password.
 * Uses the Web Crypto API for high security without external libraries.
 */

export class Security {
  private static ALGORITHM = "AES-GCM";

  private static async deriveKey(password: string, salt: Uint8Array) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt as any,
        iterations: 100000,
        hash: "SHA-256",
      },
      passwordKey,
      { name: this.ALGORITHM, length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encoder.encode(data)
    );

    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...result));
  }

  static async decrypt(encryptedBase64: string, password: string): Promise<string> {
    try {
      const data = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const encrypted = data.slice(28);

      const key = await this.deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      throw new Error("Invalid password or corrupted data");
    }
  }
}
