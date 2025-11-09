// A base64-encoded string.
type B64String = string;
// A UUID string.
type UUID = string;

// --- Enums (from src/enums.py) ---

export type VaultRole = "VIEWER" | "EDITOR" | "ADMIN";
export type ShareStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "AWAITING_REGISTRATION";
export type ItemType = "LOGIN" | "NOTE" | "CARD" | "IDENTITY";

// --- Auth (from schemas/auth.py) ---

export interface IRegisterRequest {
  email: string;
  master_password_hash: string;
  master_password_salt: string;
  device_name: string;
  device_public_key: B64String;
  device_encrypted_private_key_blob: B64String;
  device_encrypted_wrapping_key: B64String;
  encrypted_vault_key: B64String;
}

export interface IRegisterResponse {
  user_id: UUID;
  device_id: UUID;
  status: "success" | "failure";
}

export interface IChallengeRequest {
  email: string;
  device_id: UUID;
}

export interface IChallengeResponse {
  master_password_salt: string;
  challenge_token: string;
}

export interface ILoginRequest {
  challenge_token: string;
  signature: B64String; // Signature of the nonce
}

export interface ILoginResponse {
  access_token: string;
  token_type: "bearer";
}

export interface IUserMe {
  email: string;
}

// --- Items (from schemas/items.py) ---

export interface IVaultItem {
  id: UUID;
  vault_id: UUID;
  created_at: string; // ISO DateTime
  updated_at: string; // ISO DateTime
  name: string;
  item_type: ItemType;
  data_blob: B64String; // Encrypted item data
  // Add other fields from VaultItemRead if needed
}

export interface IItemCreateRequest {
  name: string;
  item_type: ItemType;
  data_blob: B64String;
  // Add other fields from VaultItemCreate
}

export interface IItemMoveRequest {
  destination_vault_id: UUID;
}

export interface IItemShareCreateRequest {
  recipient_email: string;
  role: VaultRole;
  encrypted_item_key: B64String;
}

export interface IItemShare {
  id: UUID;
  recipient_email: string;
  role: VaultRole;
  status: ShareStatus;
}

// --- Vault (from schemas/vault.py) ---

export interface IVaultShare {
  id: UUID;
  recipient_email: string;
  role: VaultRole;
  status: ShareStatus;
}

export interface ISimpleVault {
  id: UUID;
  owner_id: UUID;
  name: string;
  description: string | null;
  vault_key: B64String; // User's encrypted vault key
}

export interface IDetailedVault extends ISimpleVault {
  vault_items: IVaultItem[];
  shares: IVaultShare[];
}

export interface IVaultCreateRequest {
  name: string;
  description?: string | null;
  vault_key: B64String;
}

export interface IVaultUpdateRequest {
  name?: string | null;
  description?: string | null;
}

export interface IVaultShareCreateRequest {
  recipient_email: string;
  role: VaultRole;
  vault_key?: B64String | null; // Encrypted vault key for the recipient
}

export interface IShareResponseRequest {
  status: "ACCEPTED" | "DECLINED";
}

// --- Links (from schemas/links.py) ---

export interface ILinkCreateRequest {
  vault_item_id: UUID;
  encrypted_blob: B64String;
  expires_in_hours?: number;
  max_views?: number | null;
}

export interface ILinkCreateResponse {
  link_id: UUID;
  expiration_timestamp: number;
}

export interface ILinkReadResponse {
  contents: B64String;
  expiration_timestamp: number;
}

// --- Crypto (from schemas/crypto.py) ---

export interface IPublicKeyRequest {
  email: string;
}

export interface IPublicKeyResponse {
  public_key: B64String;
}
