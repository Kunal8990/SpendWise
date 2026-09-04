import crypto from "crypto";

// ============================================================================
// 1. RATE LIMITING ENGINE (In-Memory Sliding Window)
// ============================================================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStores = {
  login: new Map<string, RateLimitRecord>(),
  forgotPassword: new Map<string, RateLimitRecord>(),
  usernameCheck: new Map<string, RateLimitRecord>(),
  apiGeneral: new Map<string, RateLimitRecord>()
};

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function checkRateLimit(
  storeName: keyof typeof rateLimitStores,
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const store = rateLimitStores[storeName];
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || now > record.resetAt) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetAt: now + options.windowMs
    };
    store.set(identifier, newRecord);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: newRecord.resetAt
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: options.maxRequests - record.count,
    resetAt: record.resetAt
  };
}

export function resetRateLimit(storeName: keyof typeof rateLimitStores, identifier: string): void {
  rateLimitStores[storeName].delete(identifier);
}

// ============================================================================
// 2. DISPOSABLE EMAIL & EMAIL VALIDATION
// ============================================================================

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
  "dispostable.com",
  "getnada.com",
  "fakemailgenerator.com"
]);

export function validateEmail(email: string): { valid: boolean; error?: string; normalized: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required.", normalized: "" };
  }

  const trimmed = email.trim();
  const normalized = trimmed.toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, error: "Email address exceeds maximum length of 254 characters.", normalized };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalized)) {
    return { valid: false, error: "Please enter a valid email address.", normalized };
  }

  const domain = normalized.split("@")[1];
  if (domain && DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, error: "Disposable or temporary email addresses are not allowed.", normalized };
  }

  return { valid: true, normalized };
}

// ============================================================================
// 3. USERNAME VALIDATION & SANITIZATION
// ============================================================================

export function validateUsername(username: string): { valid: boolean; error?: string; normalized: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required.", normalized: "" };
  }

  const trimmed = username.trim();
  const normalized = trimmed.toLowerCase();

  if (trimmed.includes(" ")) {
    return { valid: false, error: "Username cannot contain spaces.", normalized };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long.", normalized };
  }

  if (trimmed.length > 25) {
    return { valid: false, error: "Username cannot exceed 25 characters.", normalized };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores.", normalized };
  }

  return { valid: true, normalized };
}

// ============================================================================
// 4. PASSWORD STRENGTH & VERIFICATION
// ============================================================================

export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0 to 4
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  if (!password || typeof password !== "string") {
    return { valid: false, score: 0, feedback: ["Password is required."] };
  }

  if (password.length < 8) {
    feedback.push("Password must be at least 8 characters long.");
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (!/[A-Z]/.test(password)) {
    feedback.push("Password should contain at least one uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    feedback.push("Password should contain at least one number.");
  }

  const valid = password.length >= 8 && score >= 2;
  return { valid, score, feedback };
}

// ============================================================================
// 5. INJECTION DEFENSE & SANITIZATION (SQLi & XSS)
// ============================================================================

export function detectSqlInjection(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const sqliPatterns = [
    /(\b(union(\s+all)?|select|insert|update|delete|drop|alter|truncate|exec|execute)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(';|\bOR\b\s+\d+=\d+|\bAND\b\s+\d+=\d+)/i,
    /(' OR '1'='1|' OR 1=1)/i
  ];
  return sqliPatterns.some(pattern => pattern.test(input));
}

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function detectXssPayload(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /<img\b[^>]*onerror/gi,
    /<svg\b[^>]*onload/gi
  ];
  return xssPatterns.some(pattern => pattern.test(input));
}

// ============================================================================
// 6. CRYPTOGRAPHIC TOKEN & PASSWORD HASH UTILITIES
// ============================================================================

export function generateSecureToken(bytes: number = 32): { token: string; hash: string } {
  const token = crypto.randomBytes(bytes).toString("hex");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 10000, 64, "sha512").toString("hex");
  return { hash, salt: passwordSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "utf-8"), Buffer.from(storedHash, "utf-8"));
}
