-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SHA_ADMIN', 'FACILITY', 'PATIENT');

-- CreateEnum
CREATE TYPE "AfyaTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "CoverageStatus" AS ENUM ('ACTIVE', 'LAPSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CoverType" AS ENUM ('PRIMARY', 'EMERGENCY', 'CHRONIC', 'DENTAL', 'MATERNAL', 'OPTICAL');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ContributionSource" AS ENUM ('MPESA', 'AUTO_DEDUCT', 'MERCHANT', 'CHALLENGE_BONUS', 'GOV_MATCH', 'CHAMA_BOOST', 'SAMBAZA');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'FAILED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('OUTPATIENT', 'INPATIENT', 'SURGERY', 'EMERGENCY', 'MATERNAL', 'LAB_TESTS', 'PHARMACY', 'DENTAL', 'RADIOLOGY', 'OPTICAL');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "AIRecommendation" AS ENUM ('APPROVE', 'REVIEW', 'BLOCK');

-- CreateEnum
CREATE TYPE "FacilityLevel" AS ENUM ('LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'LEVEL_6');

-- CreateEnum
CREATE TYPE "AutoDeductStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'VIEW_PATIENT', 'VIEW_CLAIM', 'CREATE_CLAIM', 'APPROVE_CLAIM', 'REJECT_CLAIM', 'REIMBURSE_CLAIM', 'VERIFY_COVERAGE', 'VIEW_AFYA_SCORE', 'VIEW_AUDIT_LOG', 'EXPORT_DATA', 'DELETE_DATA', 'CONSENT_UPDATE');

-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('SUPER_ADMIN', 'DIRECTOR', 'FINANCE', 'OFFICE_ADMIN', 'TECH', 'HR');

-- CreateEnum
CREATE TYPE "RevenueStatus" AS ENUM ('UNBILLED', 'BILLED', 'PAID');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT_TO_SHA', 'PAID');

-- CreateEnum
CREATE TYPE "BeneficiaryRelation" AS ENUM ('FAMILY', 'FRIEND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "nationalId" TEXT,
    "phoneNumber" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "shaId" TEXT,
    "countyCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phoneHash" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "afya_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tier" "AfyaTier" NOT NULL DEFAULT 'BRONZE',
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastContributionAt" TIMESTAMP(3),
    "totalContributions" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalTokensEarned" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "weeklyTarget" DECIMAL(14,2) NOT NULL DEFAULT 100,
    "challengesCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "afya_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blockchainAddress" TEXT NOT NULL,
    "balanceAfya" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "lockedAfya" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "earnedMatchAfya" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "coverageStatus" "CoverageStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoDeductOptIn" BOOLEAN NOT NULL DEFAULT false,
    "pendingDeductionKES" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "coverTypes" "CoverType"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amountAfya" DECIMAL(18,8) NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDING',
    "source" "ContributionSource" NOT NULL DEFAULT 'MPESA',
    "claimId" TEXT,
    "blockNumber" BIGINT,
    "gasUsed" BIGINT,
    "walletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkoutRequestId" TEXT,
    "merchantRequestId" TEXT,
    "amountKES" INTEGER,
    "mpesaReceipt" TEXT,
    "resultCode" INTEGER,
    "resultDesc" TEXT,
    "merchantPaybill" TEXT,
    "merchantAccount" TEXT,
    "merchantName" TEXT,
    "merchantAmountKES" INTEGER,
    "shifAmountKES" INTEGER,
    "settlementStatus" "SettlementStatus",
    "settlementRef" TEXT,
    "settlementDesc" TEXT,
    "senderUserId" TEXT,
    "recipientUserId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_verifications" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "coverageTier" "AfyaTier" NOT NULL,
    "coverageActive" BOOLEAN NOT NULL,
    "streakDaysAtVisit" INTEGER NOT NULL,
    "qrPayload" TEXT,
    "onChainTxHash" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "service" "ServiceType" NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "reimbursementKES" DECIMAL(14,2) NOT NULL,
    "reimbursementAfya" DECIMAL(18,8) NOT NULL,
    "coverageVerified" BOOLEAN NOT NULL DEFAULT false,
    "coverageTierAtVisit" "AfyaTier",
    "aiScore" INTEGER NOT NULL DEFAULT 0,
    "aiFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiRecommendation" "AIRecommendation" NOT NULL DEFAULT 'REVIEW',
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "onChainHash" TEXT,
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "mflCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "FacilityLevel" NOT NULL,
    "county" TEXT NOT NULL,
    "subCounty" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "isAccredited" BOOLEAN NOT NULL DEFAULT false,
    "fhirEnabled" BOOLEAN NOT NULL DEFAULT false,
    "shaRegistrationNo" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auto_deduction_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalTxId" TEXT NOT NULL,
    "originalAmount" DECIMAL(14,2) NOT NULL,
    "deductedAmount" DECIMAL(14,2) NOT NULL,
    "triggerTxRef" TEXT,
    "shaAccountRef" TEXT,
    "status" "AutoDeductStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auto_deduction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "requestId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "facilityId" TEXT,
    "ipAddress" TEXT NOT NULL,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_staff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "InternalRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_ledger" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "claimAmountKES" DECIMAL(14,2) NOT NULL,
    "seaboardFeeKES" DECIMAL(14,2) NOT NULL,
    "status" "RevenueStatus" NOT NULL DEFAULT 'UNBILLED',
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deduction_revenue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deductionLogId" TEXT,
    "deductedAmount" DECIMAL(14,2) NOT NULL,
    "companyFeeKES" DECIMAL(14,2) NOT NULL,
    "corporateAccount" TEXT NOT NULL,
    "routedToCorporate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deduction_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "partnerType" TEXT NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revenueModel" TEXT NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "totalClaims" INTEGER NOT NULL,
    "totalClaimAmount" DECIMAL(14,2) NOT NULL,
    "totalFeeKES" DECIMAL(14,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "erpSyncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "erpReferenceId" TEXT,
    "erpSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "beneficiaryUserId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "relation" "BeneficiaryRelation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_shaId_key" ON "users"("shaId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneHash_key" ON "users"("phoneHash");

-- CreateIndex
CREATE INDEX "users_phoneHash_idx" ON "users"("phoneHash");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_shaId_idx" ON "users"("shaId");

-- CreateIndex
CREATE UNIQUE INDEX "afya_scores_userId_key" ON "afya_scores"("userId");

-- CreateIndex
CREATE INDEX "afya_scores_userId_idx" ON "afya_scores"("userId");

-- CreateIndex
CREATE INDEX "afya_scores_tier_idx" ON "afya_scores"("tier");

-- CreateIndex
CREATE INDEX "afya_scores_score_idx" ON "afya_scores"("score");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_blockchainAddress_key" ON "wallets"("blockchainAddress");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_blockchainAddress_idx" ON "wallets"("blockchainAddress");

-- CreateIndex
CREATE INDEX "wallets_coverageStatus_idx" ON "wallets"("coverageStatus");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_txHash_key" ON "transactions"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_checkoutRequestId_key" ON "transactions"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "transactions_senderUserId_createdAt_idx" ON "transactions"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_recipientUserId_idx" ON "transactions"("recipientUserId");

-- CreateIndex
CREATE INDEX "transactions_txHash_idx" ON "transactions"("txHash");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_status_createdAt_idx" ON "transactions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_source_idx" ON "transactions"("source");

-- CreateIndex
CREATE INDEX "transactions_mpesaReceipt_idx" ON "transactions"("mpesaReceipt");

-- CreateIndex
CREATE INDEX "transactions_settlementStatus_idx" ON "transactions"("settlementStatus");

-- CreateIndex
CREATE INDEX "coverage_verifications_patientId_idx" ON "coverage_verifications"("patientId");

-- CreateIndex
CREATE INDEX "coverage_verifications_facilityId_idx" ON "coverage_verifications"("facilityId");

-- CreateIndex
CREATE INDEX "coverage_verifications_verifiedAt_idx" ON "coverage_verifications"("verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimNumber_key" ON "claims"("claimNumber");

-- CreateIndex
CREATE INDEX "claims_patientId_idx" ON "claims"("patientId");

-- CreateIndex
CREATE INDEX "claims_facilityId_idx" ON "claims"("facilityId");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_claimNumber_idx" ON "claims"("claimNumber");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_mflCode_key" ON "facilities"("mflCode");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_walletAddress_key" ON "facilities"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_shaRegistrationNo_key" ON "facilities"("shaRegistrationNo");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_userId_key" ON "facilities"("userId");

-- CreateIndex
CREATE INDEX "facilities_county_idx" ON "facilities"("county");

-- CreateIndex
CREATE INDEX "facilities_isAccredited_idx" ON "facilities"("isAccredited");

-- CreateIndex
CREATE INDEX "auto_deduction_logs_userId_idx" ON "auto_deduction_logs"("userId");

-- CreateIndex
CREATE INDEX "auto_deduction_logs_status_idx" ON "auto_deduction_logs"("status");

-- CreateIndex
CREATE INDEX "auto_deduction_logs_createdAt_idx" ON "auto_deduction_logs"("createdAt");

-- CreateIndex
CREATE INDEX "auto_deduction_logs_userId_createdAt_idx" ON "auto_deduction_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_jti_idx" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "consent_records_userId_idx" ON "consent_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_staff_email_key" ON "internal_staff"("email");

-- CreateIndex
CREATE INDEX "internal_staff_email_idx" ON "internal_staff"("email");

-- CreateIndex
CREATE INDEX "internal_staff_role_idx" ON "internal_staff"("role");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_ledger_claimId_key" ON "revenue_ledger"("claimId");

-- CreateIndex
CREATE INDEX "revenue_ledger_invoiceId_idx" ON "revenue_ledger"("invoiceId");

-- CreateIndex
CREATE INDEX "revenue_ledger_status_idx" ON "revenue_ledger"("status");

-- CreateIndex
CREATE INDEX "deduction_revenue_userId_idx" ON "deduction_revenue"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_licenseKey_key" ON "licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "licenses_partnerType_idx" ON "licenses"("partnerType");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_erpSyncStatus_idx" ON "invoices"("erpSyncStatus");

-- CreateIndex
CREATE INDEX "beneficiaries_ownerId_idx" ON "beneficiaries"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_ownerId_beneficiaryUserId_key" ON "beneficiaries"("ownerId", "beneficiaryUserId");

-- AddForeignKey
ALTER TABLE "afya_scores" ADD CONSTRAINT "afya_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_verifications" ADD CONSTRAINT "coverage_verifications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_verifications" ADD CONSTRAINT "coverage_verifications_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_deduction_logs" ADD CONSTRAINT "auto_deduction_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_ledger" ADD CONSTRAINT "revenue_ledger_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_ledger" ADD CONSTRAINT "revenue_ledger_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deduction_revenue" ADD CONSTRAINT "deduction_revenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
