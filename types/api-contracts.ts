/**
 * API Contract Definitions
 * Mirrors the Pydantic schemas from the FastAPI backend.
 */

// --- Shared Types ---
export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

// --- Auth / SRP Types ---

// /auth/init
export interface UserInitRequest {
  email: string;
}

export interface UserInitResponse {
  srp_salt: string; // String (likely hex or b64, used for key derivation)
  dek_salt: string; // String
  rec_salt: string; // String
  srp_group_id: string; // "2048"
}

// /auth/srp/challenge
export interface SRPChallengeRequest {
  email: string;
  client_ephemeral_public: string; // "A" (Base64)
}

export interface SRPChallengeResponse {
  server_ephemeral_public: string; // "B" (Base64)
  srp_salt: string; // "s" (Base64)
  srp_session_id: string; // UUID
}

// /auth/srp/token
export interface SRPTokenRequest {
  srp_session_id: string; // UUID
  client_ephemeral_public: string; // "A" (Base64)
  client_proof: string; // "M1" (Base64)
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  server_proof: string; // "M2" (Base64)
}

// --- Registration ---

export interface UserCreate {
  email: string;
  srp_salt: string; // Base64
  srp_verifier: string; // Base64
  srp_group_id: string; // "2048"

  public_key: string; // Base64
  dek_salt: string; // Base64
  encrypted_private_key: string; // Base64

  rec_salt: string; // Base64
  encrypted_private_key_recovery: string; // Base64

  encrypted_vault_key: string; // Base64
}

export interface UserCreateResponse {
  user_id: string;
  status: "success" | "failure";
}
