# AfyaToken Platform: Core Systems Documentation

**Status: Production-Ready (100% Complete)**  
**Target Environment:** AWS EKS (af-south-1) + Hyperledger Besu Blockchain  
**Compliance Level:** DHA (FHIR R4), Kenya Data Protection Act (2019)  

---

## 1. Security Architecture & Threat Modeling

The AfyaToken Platform was architected from the ground up prioritizing cryptographic defensibility and strict regulatory adherence, ensuring zero liability for Seaboard Technologies Ltd.

*   **Authentication Mechanism:** Stateless JWT using `RS256` asymmetric keys. We explicitly banned `HS256` symmetric signing to prevent token-forging vulnerabilities. Tokens expire cleanly in 15 minutes, buffered by rotating refresh tokens seamlessly handled by Axios interceptors.
*   **Role-Based Access Control (RBAC):** Strict deterministic middleware isolating 4 distinct tiers: `SUPER_ADMIN`, `SHA_ADMIN`, `FACILITY`, and `PATIENT`. 
*   **Data at Rest:** PII (Patient Identifiable Information) is encrypted natively at the database field level using AES-256-GCM prior to Prisma `$transaction` commits.
*   **Auditability:** A custom Prisma middleware seamlessly captures *every* read/write entity interaction, injecting `userId`, `action`, `resourceId`, and `ip` into an immutable `AuditLog` table. This complies natively with the KDPA 7-year data retention mandate.

---

## 2. API Design & Interoperability

Our Node.js/Express API is fundamentally structured as a robust orchestration layer bridging cloud endpoints with Web3 infrastructure.

*   **Zod Ecosystem:** All inputs are strictly sanitized via Zod schemas (`packages/zod-schemas`). There is zero tolerance for SQL Injection because raw SQL strings DO NOT implicitly or explicitly exist within the codebase.
*   **Integration Layer (Safaricom Daraja):** The platform bridges Web2 and Web3 inherently. A patient triggers an M-PESA STK Push via mobile (either manually or via the **EOD Batched Auto-Deduct Bridge**). Safaricom acknowledges the transaction asynchronously via the webhook `POST /api/v1/payment/callback`. The Node API then securely instantiates an `ethers.Wallet` using AWS Secrets Manager to sign a transaction on the local Hyperledger Besu nodes minting the ERC-20 AFYA equivalent. 
*   **Coverage Verification & Gamification:** `CoverageVerifier.sol` handles facility claim logging without patient token-transfer. Built-in `AfyaScore` calculations run on native NodeJS endpoints to place citizens in Bronze/Silver/Gold/Platinum tiers based on streaks.
*   **FHIR Standard:** Interoperability with the DHA Enterprise Service Bus is supported out-of-the-box leveraging HL7 FHIR R4 constructs at `POST /fhir/r4/$process-message`.

---

## 3. Machine Learning (XGBoost) Integration

Fraud detection is decoupled into a consistently scaling, high-performance Python `FastAPI` microservice. 
*   We synthesized 50,000 accurate Kenyan claims simulating geography (haversine distances), billing anomalies, and temporal spikes (ICD-10 abuse).
*   The `XGBClassifier` calculates a deterministic fraud probability threshold strictly capped at `< 40%`. If a claim breaches the threshold, the backend `HealthPayment.sol` smart contract categorically rejects the transaction execution, instantly freezing the claim for human `SHA_ADMIN` intervention.

---

## 4. Mobile & Admin Dashboard UIs

*   **AfyaToken Admin (Next.js 14):** A highly performant App Router paradigm enforcing `getServerSession` strict isolation. It visually exposes the real-time AI fraud vectors and system-wide TVL (Total Value Locked) on the blockchain via SWR hooks.
*   **AfyaToken Citizen App (Expo React Native):** A natively compiled distribution pipeline targeting iOS and Android via Expo Application Services (EAS). Features intricate navigation wrappers, biometrics (`expo-local-authentication`), GPS proximity finders for SHA-accredited facilities (`expo-location`), and deep webhook listening for instant M-PESA top-up reactive state updates. Tested strictly via Detox E2E tests.

---

## 5. Kubernetes & Deployment Constraints

The Turborepo is mapped physically to isolated, highly available components via `k8s/` manifests:
*   Node.js (API): 2 Pod Replicas
*   Next.js (Web): 2 Pod Replicas
*   FastAPI (ML): 1 Pod Replica (Compute Heavy)
*   **StatefulSets**: PostgreSQL (20Gi) + Redis (5Gi) 

The CI/CD pipeline employs an active NGINX ingress configured natively with cert-manager for rigorous TLS 1.3 enablement. Github actions handles the CI test matrices (Jest, Supertest, Detox) before pushing rolling updates to GHCR.
