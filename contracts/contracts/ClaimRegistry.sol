// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Security rationale: Immutable on-chain storage of claim records creates
// a tamper-proof audit trail. Storing AI fraud score on-chain embeds
// the fraud decision into the permanent record — satisfying DHA audit requirements.

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ClaimRegistry
 * @notice Immutable on-chain registry for AfyaToken healthcare claims
 * @dev Once registered, a claim record CANNOT be modified or deleted.
 *      This satisfies Kenya Data Protection Act immutable audit requirements.
 *
 * DHA: Claim record stored with ICD-10 code and AI fraud score, supporting
 *      DHA analytics and compliance reporting requirements.
 */
contract ClaimRegistry is AccessControl, ReentrancyGuard {
    // ─── ROLES ────────────────────────────────────────────────────────────────
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // ─── STRUCTS ──────────────────────────────────────────────────────────────
    struct ClaimRecord {
        bytes32  claimId;          // Keccak256 hash of off-chain claim data
        address  patient;          // Patient wallet address
        address  facility;         // SHA-accredited facility address
        string   icd10Code;        // ICD-10 diagnosis code
        uint256  amountAfyaToken;        // Reimbursement amount in AFYA (wei) — Treasury→Facility
        uint8    aiScorePercent;   // AI fraud score 0-100 (100 = fully legitimate)
        uint8    fraudFlag;        // 0=APPROVE, 1=REVIEW, 2=BLOCK
        uint8    coverageTier;     // Patient coverage tier: 0=BRONZE, 1=SILVER, 2=GOLD, 3=PLATINUM
        uint256  streakDays;       // Patient's contribution streak at time of claim
        uint256  registeredAt;     // Block timestamp
        uint256  blockNumber;      // Block number for finality proof
        bool     exists;           // Slot existence flag
    }

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    event ClaimRegistered(
        bytes32 indexed claimId,
        address indexed patient,
        address indexed facility,
        string  icd10Code,
        uint256 amountAfyaToken,
        uint8   aiScore,
        uint8   coverageTier,
        uint256 streakDays,
        uint256 timestamp
    );

    // ─── STATE ────────────────────────────────────────────────────────────────
    mapping(bytes32 => ClaimRecord) private _claims;
    bytes32[] private _claimIds; // For enumeration by admins

    uint256 public totalClaims;

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    constructor(address admin) {
        require(admin != address(0), "CR: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ─── REGISTRATION ─────────────────────────────────────────────────────────
    /**
     * @notice Register an immutable claim record on-chain
     * @param claimId       Keccak256 hash of the off-chain claim data (deduplication key)
     * @param patient       Patient Ethereum address
     * @param facility      Facility Ethereum address
     * @param icd10Code     ICD-10 diagnosis code (max 16 chars)
     * @param amountAfyaToken     Amount in AfyaToken wei
     * @param aiScore       AI fraud legitimacy score (0-100)
     * @param fraudFlag     AI recommendation: 0=APPROVE, 1=REVIEW, 2=BLOCK
     *
     * Security rationale:
     * - require(!exists) prevents overwrite of existing records (immutability)
     * - Only REGISTRAR_ROLE can register (off-chain API server holds this key)
     * - claimId as keccak256 hash of off-chain data cryptographically binds
     *   the on-chain record to the off-chain claim — tamper evident.
     */
    function registerClaim(
        bytes32 claimId,
        address patient,
        address facility,
        string  calldata icd10Code,
        uint256 amountAfyaToken,
        uint8   aiScore,
        uint8   fraudFlag,
        uint8   coverageTier,
        uint256 streakDays
    )
        external
        nonReentrant
        onlyRole(REGISTRAR_ROLE)
    {
        require(claimId != bytes32(0),           "CR: invalid claimId");
        require(patient != address(0),            "CR: zero patient");
        require(facility != address(0),           "CR: zero facility");
        require(bytes(icd10Code).length > 0,      "CR: empty ICD-10 code");
        require(bytes(icd10Code).length <= 16,    "CR: ICD-10 code too long");
        require(amountAfyaToken > 0,                    "CR: zero amount");
        require(aiScore <= 100,                   "CR: invalid score");
        require(fraudFlag <= 2,                   "CR: invalid flag");
        require(coverageTier <= 3,                "CR: invalid coverage tier");
        require(!_claims[claimId].exists,         "CR: claim already registered");

        _claims[claimId] = ClaimRecord({
            claimId:       claimId,
            patient:       patient,
            facility:      facility,
            icd10Code:     icd10Code,
            amountAfyaToken:     amountAfyaToken,
            aiScorePercent: aiScore,
            fraudFlag:     fraudFlag,
            coverageTier:  coverageTier,
            streakDays:    streakDays,
            registeredAt:  block.timestamp,
            blockNumber:   block.number,
            exists:        true
        });

        _claimIds.push(claimId);
        totalClaims++;

        emit ClaimRegistered(
            claimId, patient, facility, icd10Code,
            amountAfyaToken, aiScore, coverageTier, streakDays, block.timestamp
        );
    }

    // ─── QUERIES ──────────────────────────────────────────────────────────────
    /**
     * @notice Retrieve a claim record (read-only)
     * @param claimId The claim ID to look up
     */
    function getClaim(bytes32 claimId)
        external
        view
        returns (ClaimRecord memory)
    {
        require(_claims[claimId].exists, "CR: claim not found");
        return _claims[claimId];
    }

    /**
     * @notice Verify claim existence for HealthPayment contract
     * @param claimId The claim ID to verify
     */
    function claimExists(bytes32 claimId) external view returns (bool) {
        return _claims[claimId].exists;
    }

    /**
     * @notice Get total registered claims count
     */
    function getTotalClaims() external view returns (uint256) {
        return totalClaims;
    }
}
