import { 
  validateEmail, 
  validateUsername, 
  checkPasswordStrength, 
  hashPassword, 
  verifyPassword, 
  generateSecureToken,
  hashToken,
  sanitizeHtml,
  detectSqlInjection,
  detectXssPayload
} from "./security";

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  name: string;
  status: "active" | "inactive" | "suspended" | "locked";
  email_verified: boolean;
  password_hash: string;
  password_salt: string;
  password_changed_at: string;
  failed_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface StoredSession {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

export interface StoredResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface StoredEmailVerification {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface StoredLoginAttempt {
  id: string;
  user_id: string | null;
  ip_address: string;
  attempted_at: string;
  success: boolean;
}

class AuthStore {
  private users = new Map<string, StoredUser>(); // id -> StoredUser
  private sessions = new Map<string, StoredSession>(); // token_hash -> StoredSession
  private resetTokens = new Map<string, StoredResetToken>(); // token_hash -> StoredResetToken
  private emailVerifications = new Map<string, StoredEmailVerification>(); // token_hash -> StoredEmailVerification
  private loginAttempts: StoredLoginAttempt[] = [];

  constructor() {
    this.seedDefaultUsers();
  }

  public seedDefaultUsers() {
    // Seed default demo user for test compatibility
    const demoSalt = "demo-salt-123456";
    const { hash } = hashPassword("Password123!", demoSalt);
    const demoUser: StoredUser = {
      id: "usr_demo_123456789",
      username: "demouser",
      email: "demo@spendwise.app",
      name: "Demo User",
      status: "active",
      email_verified: true,
      password_hash: hash,
      password_salt: demoSalt,
      password_changed_at: new Date().toISOString(),
      failed_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(demoUser.id, demoUser);

    // Seed a disabled user for TC-013
    const disabledSalt = "disabled-salt-123";
    const { hash: disabledHash } = hashPassword("DisabledPass123!", disabledSalt);
    const disabledUser: StoredUser = {
      id: "usr_disabled_123456",
      username: "disableduser",
      email: "disabled@spendwise.app",
      name: "Disabled User",
      status: "inactive",
      email_verified: true,
      password_hash: disabledHash,
      password_salt: disabledSalt,
      password_changed_at: new Date().toISOString(),
      failed_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(disabledUser.id, disabledUser);

    // Seed an unverified user for TC-014
    const unverifiedSalt = "unverified-salt-123";
    const { hash: unverifiedHash } = hashPassword("UnverifiedPass123!", unverifiedSalt);
    const unverifiedUser: StoredUser = {
      id: "usr_unverified_123456",
      username: "unverifieduser",
      email: "unverified@spendwise.app",
      name: "Unverified User",
      status: "active",
      email_verified: false,
      password_hash: unverifiedHash,
      password_salt: unverifiedSalt,
      password_changed_at: new Date().toISOString(),
      failed_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(unverifiedUser.id, unverifiedUser);
  }

  public resetAll() {
    this.users.clear();
    this.sessions.clear();
    this.resetTokens.clear();
    this.emailVerifications.clear();
    this.loginAttempts = [];
    this.seedDefaultUsers();
  }

  // --- Users ---
  public findUserByIdentifier(identifier: string): StoredUser | undefined {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === clean || user.username.toLowerCase() === clean) {
        return user;
      }
    }
    return undefined;
  }

  public findUserByEmail(email: string): StoredUser | undefined {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === clean) return user;
    }
    return undefined;
  }

  public findUserByUsername(username: string): StoredUser | undefined {
    if (!username) return undefined;
    const clean = username.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === clean) return user;
    }
    return undefined;
  }

  public createUser(data: {
    username: string;
    email: string;
    password: string;
    name?: string;
  }): { success: boolean; user?: StoredUser; error?: string } {
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error };
    }

    const usernameValidation = validateUsername(data.username);
    if (!usernameValidation.valid) {
      return { success: false, error: usernameValidation.error };
    }

    if (this.findUserByUsername(usernameValidation.normalized)) {
      return { success: false, error: "Username already taken." };
    }

    if (this.findUserByEmail(emailValidation.normalized)) {
      return { success: false, error: "An account with this email already exists." };
    }

    const strength = checkPasswordStrength(data.password);
    if (!strength.valid) {
      return { success: false, error: strength.feedback[0] || "Password does not meet strength requirements." };
    }

    const { hash, salt } = hashPassword(data.password);
    const userId = `usr_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2)}`;

    const newUser: StoredUser = {
      id: userId,
      username: usernameValidation.normalized,
      email: emailValidation.normalized,
      name: sanitizeHtml(data.name || data.username),
      status: "active",
      email_verified: false,
      password_hash: hash,
      password_salt: salt,
      password_changed_at: new Date().toISOString(),
      failed_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.users.set(newUser.id, newUser);
    return { success: true, user: newUser };
  }

  public updateUserPassword(userId: string, newPassword: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const { hash, salt } = hashPassword(newPassword);
    user.password_hash = hash;
    user.password_salt = salt;
    user.password_changed_at = new Date().toISOString();
    user.updated_at = new Date().toISOString();
    user.failed_attempts = 0;

    // Revoke all existing sessions for this user (TC-089)
    for (const [hashKey, session] of this.sessions.entries()) {
      if (session.user_id === userId) {
        this.sessions.delete(hashKey);
      }
    }

    return true;
  }

  public recordLoginAttempt(identifier: string, ip: string, success: boolean): void {
    const user = this.findUserByIdentifier(identifier);
    this.loginAttempts.push({
      id: `att_${Math.random().toString(36).slice(2)}`,
      user_id: user ? user.id : null,
      ip_address: ip,
      attempted_at: new Date().toISOString(),
      success
    });

    if (user) {
      if (success) {
        user.failed_attempts = 0;
      } else {
        user.failed_attempts += 1;
        if (user.failed_attempts >= 5) {
          user.status = "locked"; // TC-019 Account Lockout
        }
      }
    }
  }

  // --- Sessions ---
  public createSession(userId: string, expiresInHours: number = 24): { token: string; session: StoredSession } {
    const { token, hash } = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
    const session: StoredSession = {
      id: `ses_${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      token_hash: hash,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };
    this.sessions.set(hash, session);
    return { token, session };
  }

  public getSession(rawToken: string): { valid: boolean; session?: StoredSession; user?: StoredUser } {
    const hash = hashToken(rawToken);
    const session = this.sessions.get(hash);
    if (!session) return { valid: false };

    if (new Date() > new Date(session.expires_at)) {
      this.sessions.delete(hash);
      return { valid: false };
    }

    const user = this.users.get(session.user_id);
    if (!user || user.status !== "active") {
      return { valid: false };
    }

    return { valid: true, session, user };
  }

  public revokeSession(rawToken: string): boolean {
    const hash = hashToken(rawToken);
    return this.sessions.delete(hash);
  }

  // --- Password Reset Tokens ---
  public createPasswordResetToken(userId: string): { token: string; resetToken: StoredResetToken } {
    const { token, hash } = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 1 * 3600 * 1000).toISOString(); // 1 hour expiration
    const resetToken: StoredResetToken = {
      id: `rst_${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      token_hash: hash,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString()
    };
    this.resetTokens.set(hash, resetToken);
    return { token, resetToken };
  }

  public verifyAndConsumeResetToken(rawToken: string): { valid: boolean; userId?: string; error?: string } {
    const hash = hashToken(rawToken);
    const record = this.resetTokens.get(hash);

    if (!record) {
      return { valid: false, error: "Invalid or expired password reset token." };
    }

    if (record.used_at !== null) {
      return { valid: false, error: "This password reset token has already been used." };
    }

    if (new Date() > new Date(record.expires_at)) {
      return { valid: false, error: "Password reset token has expired." };
    }

    record.used_at = new Date().toISOString();
    return { valid: true, userId: record.user_id };
  }

  // --- Email Verification Tokens ---
  public createEmailVerificationToken(userId: string): { token: string; verification: StoredEmailVerification } {
    const { token, hash } = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours
    const verification: StoredEmailVerification = {
      id: `vfy_${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      token_hash: hash,
      expires_at: expiresAt,
      verified_at: null,
      created_at: new Date().toISOString()
    };
    this.emailVerifications.set(hash, verification);
    return { token, verification };
  }

  public verifyEmailToken(rawToken: string): { valid: boolean; user?: StoredUser; error?: string } {
    const hash = hashToken(rawToken);
    const record = this.emailVerifications.get(hash);

    if (!record) {
      return { valid: false, error: "Invalid verification link." };
    }

    if (record.verified_at !== null) {
      return { valid: false, error: "This verification link has already been used." };
    }

    if (new Date() > new Date(record.expires_at)) {
      return { valid: false, error: "Verification link has expired." };
    }

    const user = this.users.get(record.user_id);
    if (!user) {
      return { valid: false, error: "User not found." };
    }

    record.verified_at = new Date().toISOString();
    user.email_verified = true;
    user.updated_at = new Date().toISOString();
    return { valid: true, user };
  }

  // --- Auditing / Database tests ---
  public getAllUsers(): StoredUser[] {
    return Array.from(this.users.values());
  }

  public deleteUser(userId: string): boolean {
    const existed = this.users.delete(userId);
    if (existed) {
      // Cascade delete sessions, reset tokens, verifications
      for (const [hashKey, s] of this.sessions.entries()) {
        if (s.user_id === userId) this.sessions.delete(hashKey);
      }
      for (const [hashKey, r] of this.resetTokens.entries()) {
        if (r.user_id === userId) this.resetTokens.delete(hashKey);
      }
      for (const [hashKey, v] of this.emailVerifications.entries()) {
        if (v.user_id === userId) this.emailVerifications.delete(hashKey);
      }
    }
    return existed;
  }
}

// Global singleton instance
export const authStore = new AuthStore();
