import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

export const env = {
  get mongoUri() {
    return required("MONGODB_URI")
  },
  get mongoDb() {
    return process.env.MONGODB_DB || "finance_snapshot"
  },
  /** 32-byte key for AES-256-GCM, base64 or 64-char hex. */
  get signatureKey(): Buffer {
    const raw = required("SIGNATURE_KEY")
    const key = /^[0-9a-f]{64}$/i.test(raw)
      ? Buffer.from(raw, "hex")
      : Buffer.from(raw, "base64")
    if (key.length !== 32) {
      throw new Error("SIGNATURE_KEY must decode to exactly 32 bytes")
    }
    return key
  },
  get signupEnabled() {
    return process.env.SIGNUP_ENABLED !== "false"
  },
  get isProduction() {
    return process.env.NODE_ENV === "production"
  },
}
