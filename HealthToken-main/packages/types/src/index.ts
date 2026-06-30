// ──────────────────────────────────────────────────────────────────────────────
// @afyaToken/types — Shared TypeScript Types for the AfyaToken Platform
// Used by: apps/api, apps/web, ml-service (via generated stubs)
// ──────────────────────────────────────────────────────────────────────────────

// ─── RBAC ROLES ───────────────────────────────────────────────────────────────
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Full system access
  SHA_ADMIN   = 'SHA_ADMIN',   // Social Health Authority admin
  FACILITY    = 'FACILITY',    // Accredited health facility
  PATIENT     = 'PATIENT',     // Individual citizen/member
}

// ─── USER ─────────────────────────────────────────────────────────────────────
export interface User {
  id:           string;
  nationalId:   string; // Encrypted at rest (AES-256-GCM)
  email:        string;
  phoneNumber:  string;
  fullName:     string;
  role:         UserRole;
  shaId?:       string; // SHA member ID e.g. SHA-KE-2024-8821
  countyCode?:  string;
  biometricRef?: string; // Reference to biometric store, NOT the biometric itself
  isActive:     boolean;
  createdAt:    Date;
  updatedAt:    Date;
}

// ─── WALLET ───────────────────────────────────────────────────────────────────
export interface Wallet {
  id:               string;
  userId:           string;
  blockchainAddress: string; // Ethereum-compatible address
  balanceAfyaToken:       number;
  lockedAfyaToken:        number; // Locked pending claim settlement
  earnedMatchAfyaToken:   number; // Gov't match bonus
  coverType:        CoverType[];
  isActive:         boolean;
  createdAt:        Date;
  updatedAt:        Date;
}

export enum CoverType {
  PRIMARY    = 'PRIMARY',
  EMERGENCY  = 'EMERGENCY',
  CHRONIC    = 'CHRONIC',
  DENTAL     = 'DENTAL',
  MATERNAL   = 'MATERNAL',
}

// ─── TRANSACTION ──────────────────────────────────────────────────────────────
export interface Transaction {
  id:          string;
  txHash:      string;  // On-chain TX hash
  fromAddress: string;
  toAddress:   string;
  amountAfyaToken:   number;
  status:      TxStatus;
  claimId?:    string;
  blockNumber?: number;
  gasUsed?:    number;
  createdAt:   Date;
}

export enum TxStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED    = 'FAILED',
  FLAGGED   = 'FLAGGED', // AI fraud flag
}

// ─── CLAIM ────────────────────────────────────────────────────────────────────
export interface Claim {
  id:           string;
  claimNumber:  string; // e.g. CLM-44821
  patientId:    string;
  facilityId:   string;
  service:      ServiceType;
  icd10Code:    string; // International Classification of Diseases code
  amountKES:    number;
  amountAfyaToken:    number;
  aiScore:      number; // 0-100 fraud probability (higher = more legitimate)
  aiFlags:      string[];
  aiRecommendation: AIRecommendation;
  status:       ClaimStatus;
  onChainHash?: string; // ClaimRegistry.sol registered hash
  reviewerId?:  string;
  reviewNotes?: string;
  createdAt:    Date;
  updatedAt:    Date;
}

export enum ServiceType {
  OUTPATIENT  = 'OUTPATIENT',
  INPATIENT   = 'INPATIENT',
  SURGERY     = 'SURGERY',
  EMERGENCY   = 'EMERGENCY',
  MATERNAL    = 'MATERNAL',
  LAB_TESTS   = 'LAB_TESTS',
  PHARMACY    = 'PHARMACY',
  DENTAL      = 'DENTAL',
  RADIOLOGY   = 'RADIOLOGY',
}

export enum ClaimStatus {
  PENDING   = 'PENDING',
  APPROVED  = 'APPROVED',
  FLAGGED   = 'FLAGGED',
  REJECTED  = 'REJECTED',
  PAID      = 'PAID',
}

export enum AIRecommendation {
  APPROVE = 'APPROVE',
  REVIEW  = 'REVIEW',
  BLOCK   = 'BLOCK',
}

// ─── FACILITY ─────────────────────────────────────────────────────────────────
export interface Facility {
  id:               string;
  mflCode:          string; // Ministry of Health Facility Code
  name:             string;
  level:            FacilityLevel;
  county:           string;
  subCounty:        string;
  latitude:         number;
  longitude:        number;
  walletAddress:    string;
  isAccredited:     boolean;
  fhirEnabled:      boolean;
  shaRegistrationNo: string;
  contactPhone:     string;
  createdAt:        Date;
  updatedAt:        Date;
}

export enum FacilityLevel {
  LEVEL_2 = 'Level 2',
  LEVEL_3 = 'Level 3',
  LEVEL_4 = 'Level 4',
  LEVEL_5 = 'Level 5',
  LEVEL_6 = 'Level 6',
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
// DHA: Immutable audit log — every data access event
// Kenya Data Protection Act 2019 — retained 7 years
export interface AuditLog {
  id:         string;
  userId:     string; // Who performed the action
  resourceId: string; // What was accessed
  action:     AuditAction;
  timestamp:  Date;
  ip:         string;
  userAgent?: string;
  requestId:  string; // Correlation ID for tracing
  success:    boolean;
  errorCode?: string;
}

export enum AuditAction {
  LOGIN           = 'LOGIN',
  LOGOUT          = 'LOGOUT',
  VIEW_PATIENT    = 'VIEW_PATIENT',
  VIEW_CLAIM      = 'VIEW_CLAIM',
  CREATE_CLAIM    = 'CREATE_CLAIM',
  APPROVE_CLAIM   = 'APPROVE_CLAIM',
  REJECT_CLAIM    = 'REJECT_CLAIM',
  TRANSFER_AfyaToken    = 'TRANSFER_AfyaToken',
  VIEW_AUDIT_LOG  = 'VIEW_AUDIT_LOG',
  EXPORT_DATA     = 'EXPORT_DATA',
  DELETE_DATA     = 'DELETE_DATA', // KDPA right to erasure
  CONSENT_UPDATE  = 'CONSENT_UPDATE',
}

// ─── FHIR R4 TYPES ────────────────────────────────────────────────────────────
// DHA: All health data endpoints conform to HL7 FHIR R4

export interface FHIRResource {
  resourceType: string;
  id?:          string;
  meta?: {
    lastUpdated: string;
    versionId:   string;
  };
}

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier:   FHIRIdentifier[];
  name:         FHIRHumanName[];
  telecom:      FHIRContactPoint[];
  gender:       'male' | 'female' | 'other' | 'unknown';
  birthDate:    string;
  address:      FHIRAddress[];
}

export interface FHIRIdentifier {
  system: string;
  value:  string;
}

export interface FHIRHumanName {
  use?:    string;
  family:  string;
  given:   string[];
}

export interface FHIRContactPoint {
  system: 'phone' | 'email';
  value:  string;
  use?:   string;
}

export interface FHIRAddress {
  country:  string;
  state:    string;
  district: string;
  text?:    string;
}

export interface FHIRClaim extends FHIRResource {
  resourceType: 'Claim';
  status:       'active' | 'cancelled' | 'draft' | 'entered-in-error';
  type: { coding: Array<{ system: string; code: string }> };
  use:          'claim' | 'preauthorization' | 'predetermination';
  patient:      { reference: string };
  facility:     { reference: string };
  created:      string;
  provider:     { reference: string };
  priority:     { coding: Array<{ code: string }> };
  total:        { value: number; currency: string };
}

// ─── API RESPONSE TYPES ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  {
    code:    string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    page?:     number;
    pageSize?: number;
    total?:    number;
  };
}

// ─── FRAUD SCORE RESPONSE ─────────────────────────────────────────────────────
export interface FraudScoreResponse {
  score:          number;           // 0.0 – 1.0 probability of fraud
  flags:          string[];         // Human-readable flag descriptions
  recommendation: AIRecommendation; // APPROVE | REVIEW | BLOCK
  modelVersion:   string;
  computedAt:     string;
}

// ─── TOKEN ALLOCATION ─────────────────────────────────────────────────────────
export interface TokenAllocation {
  treasuryReserve: number;
  activeWallets:   number;
  claimsLocked:    number;
  emergencyFund:   number;
  totalInCirculation: number;
}

// ─── JWT PAYLOAD ──────────────────────────────────────────────────────────────
export interface JWTAccessPayload {
  sub:     string; // userId
  role:    UserRole;
  shaId?:  string;
  jti:     string; // JWT ID — unique per token
  iat:     number;
  exp:     number;
}

export interface JWTRefreshPayload {
  sub:     string;
  jti:     string; // Used for rotation invalidation
  family:  string; // Token family for refresh rotation
  iat:     number;
  exp:     number;
}
