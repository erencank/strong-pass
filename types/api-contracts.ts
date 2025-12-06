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

export interface SRPInitRequest {
  email: string;
}

export interface SRPInitResponse {
  salt: string; // Hex encoded
  B: string; // Hex encoded server public value
}

export interface SRPLoginRequest {
  email: string;
  A: string; // Hex encoded client public value
  M1: string; // Hex encoded client evidence
}

export interface SRPLoginResponse {
  M2: string; // Hex encoded server evidence
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  salt: string; // Hex encoded
  verifier: string; // Hex encoded

  // Encrypted master key (encrypted with the derived key from password)
  enc_private_key: string;
  public_key: string; // User's public key for sharing/verification
}

export interface RegisterResponse {
  id: string;
  email: string;
}

// --- Token Types ---

export interface Token {
  access_token: string;
  token_type: string;
}

export interface TokenPayload {
  sub: string; // User ID
  exp: number;
}
