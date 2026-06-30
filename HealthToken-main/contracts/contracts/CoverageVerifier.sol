// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Security rationale: CoverageVerifier replaces the patient-payment model.
// Patients NEVER transfer tokens to facilities. Instead, this contract:
// 1. Verifies a patient's coverage status on-chain (read-only)
// 2. Logs facility visits without debiting patient wallets
// 3. Reimburses facilities from the SHIF Treasury pool

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AfyaTokenToken.sol";

/**
 * @title CoverageVerifier
 * @notice Verifies AfyaToken coverage status and processes Treasury→Facility reimbursements
 * @dev This contract enforces the UHC principle: patients prove coverage,
 *      facilities are reimbursed from pooled SHIF funds — NOT from patient wallets.
 *
 * Privacy: verifyCoverage() returns ONLY coverage status and tier.
 *          It does NOT expose contribution amounts, history, or wallet balance.
 *          This preserves digital and financial privacy at the facility point of care.
 *
 * DHA: All facility visits and reimbursements are logged on-chain for audit trail
 *      compliance with Digital Health Act No. 15 of 2023.
 */
contract CoverageVerifier is AccessControl, ReentrancyGuard, Pausable {
    // ─── ROLES ────────────────────────────────────────────────────────────────
    bytes32 public constant SHA_ADMIN_ROLE   = keccak256("SHA_ADMIN_ROLE");
    bytes32 public constant FACILITY_ROLE    = keccak256("FACILITY_ROLE");
    bytes32 public constant TREASURY_ROLE    = keccak256("TREASURY_ROLE");

    // ─── ENUMS ────────────────────────────────────────────────────────────────
    /// @dev Coverage tiers — unlocked by sustained AfyaToken contributions
    enum CoverageTier { BRONZE, SILVER, GOLD, PLATINUM }

    // ─── STRUCTS ──────────────────────────────────────────────────────────────
    struct CoverageStatus {
        bool     isActive;       // Whether patient has active SHIF coverage
        CoverageTier tier;       // Current coverage tier
        uint256  streakDays;     // Consecutive contribution days
        uint256  verifiedAt;     // Timestamp of verification
    }

    struct FacilityVisit {
        bytes32  visitId;        // Unique visit identifier
        address  patient;        // Patient wallet address
        address  facility;       // Facility wallet address
        CoverageTier tierAtVisit; // Patient's tier at time of visit
        uint256  visitedAt;      // Block timestamp
        bool     reimbursed;     // Whether facility has been reimbursed
        uint256  blockNumber;    // Block number for finality proof
        bool     exists;
    }

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    event CoverageVerified(
        address indexed patient,
        address indexed facility,
        bool    isCovered,
        CoverageTier tier,
        uint256 timestamp
    );

    event FacilityVisitRecorded(
        bytes32 indexed visitId,
        address indexed patient,
        address indexed facility,
        CoverageTier tier,
        uint256 timestamp
    );

    event FacilityReimbursed(
        bytes32 indexed visitId,
        address indexed facility,
        uint256 amount,
        bytes32 indexed claimId,
        uint256 timestamp
    );

    // ─── STATE ────────────────────────────────────────────────────────────────
    AfyaTokenToken public immutable afyaToken;

    /// @dev Coverage tier thresholds (minimum token balance for each tier)
    /// These are set by SHA admin and can be adjusted for policy changes
    uint256 public bronzeThreshold  = 0;
    uint256 public silverThreshold  = 100  * 10**18;  // 100 AFYA
    uint256 public goldThreshold    = 500  * 10**18;  // 500 AFYA
    uint256 public platinumThreshold = 1000 * 10**18; // 1000 AFYA

    /// @dev Minimum token balance required for active coverage
    uint256 public minimumCoverageBalance = 10 * 10**18; // 10 AFYA

    /// @dev Streak data stored on-chain per patient
    mapping(address => uint256) public patientStreakDays;
    mapping(address => uint256) public patientLastContribution;

    /// @dev Visit records
    mapping(bytes32 => FacilityVisit) private _visits;
    bytes32[] private _visitIds;
    uint256 public totalVisits;

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    constructor(address afyaTokenAddress, address admin) {
        require(afyaTokenAddress != address(0), "CV: zero token address");
        require(admin != address(0), "CV: zero admin address");
        afyaToken = AfyaTokenToken(afyaTokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SHA_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
    }

    // ─── COVERAGE VERIFICATION (READ-ONLY — PRIVACY PRESERVING) ──────────────
    /**
     * @notice Verify a patient's coverage status
     * @param patient Patient wallet address
     * @return status CoverageStatus struct with ONLY: isActive, tier, streakDays, verifiedAt
     *
     * Privacy rationale: This function intentionally does NOT return:
     * - Token balance (financial privacy)
     * - Contribution history (digital privacy)
     * - Transaction records
     * Facilities see ONLY: "Is this person covered?" and "What tier?"
     */
    function verifyCoverage(address patient)
        external
        view
        returns (CoverageStatus memory status)
    {
        require(patient != address(0), "CV: zero patient address");

        uint256 balance = afyaToken.balanceOf(patient);
        bool isActive = balance >= minimumCoverageBalance;
        CoverageTier tier = _calculateTier(balance);

        status = CoverageStatus({
            isActive: isActive,
            tier: tier,
            streakDays: patientStreakDays[patient],
            verifiedAt: block.timestamp
        });
    }

    // ─── FACILITY VISIT RECORDING ─────────────────────────────────────────────
    /**
     * @notice Record a facility visit — NO token transfer occurs
     * @param visitId   Unique visit ID (keccak256 hash)
     * @param patient   Patient wallet address
     * @param facility  SHA-accredited facility address
     *
     * Security rationale:
     * - Only FACILITY_ROLE can record visits (prevents fake visit injection)
     * - Patient tokens are NEVER debited (UHC coverage-proof model)
     * - Visit record is immutable once created
     */
    function recordFacilityVisit(
        bytes32 visitId,
        address patient,
        address facility
    )
        external
        onlyRole(FACILITY_ROLE)
        whenNotPaused
    {
        require(visitId != bytes32(0), "CV: invalid visitId");
        require(patient != address(0), "CV: zero patient");
        require(facility != address(0), "CV: zero facility");
        require(!_visits[visitId].exists, "CV: visit already recorded");

        // Verify patient has active coverage
        uint256 balance = afyaToken.balanceOf(patient);
        require(balance >= minimumCoverageBalance, "CV: patient coverage inactive");

        CoverageTier tier = _calculateTier(balance);

        _visits[visitId] = FacilityVisit({
            visitId: visitId,
            patient: patient,
            facility: facility,
            tierAtVisit: tier,
            visitedAt: block.timestamp,
            reimbursed: false,
            blockNumber: block.number,
            exists: true
        });

        _visitIds.push(visitId);
        totalVisits++;

        emit FacilityVisitRecorded(visitId, patient, facility, tier, block.timestamp);
        emit CoverageVerified(patient, facility, true, tier, block.timestamp);
    }

    // ─── TREASURY → FACILITY REIMBURSEMENT ────────────────────────────────────
    /**
     * @notice Reimburse a facility from the SHIF Treasury pool
     * @param facility  Facility address to reimburse
     * @param amount    Reimbursement amount in AFYA tokens (wei)
     * @param claimId   Associated claim ID for audit linkage
     * @param visitId   Associated visit ID
     *
     * Security rationale:
     * - Only TREASURY_ROLE can execute reimbursements
     * - Tokens flow from Treasury → Facility (never from patient)
     * - Visit must exist and not already be reimbursed (double-spend protection)
     * - Checks-Effects-Interactions pattern strictly followed
     */
    function reimburseFromPool(
        address facility,
        uint256 amount,
        bytes32 claimId,
        bytes32 visitId
    )
        external
        nonReentrant
        whenNotPaused
        onlyRole(TREASURY_ROLE)
    {
        require(facility != address(0), "CV: zero facility");
        require(amount > 0, "CV: zero amount");
        require(claimId != bytes32(0), "CV: invalid claimId");
        require(afyaToken.purposeWhitelist(facility), "CV: facility not accredited");

        // If visitId is provided, validate and mark as reimbursed
        if (visitId != bytes32(0)) {
            FacilityVisit storage visit = _visits[visitId];
            require(visit.exists, "CV: visit not found");
            require(!visit.reimbursed, "CV: already reimbursed");
            require(visit.facility == facility, "CV: facility mismatch");

            // Effects before interactions
            visit.reimbursed = true;
        }

        // Interaction: Transfer from Treasury (msg.sender must have approved this contract)
        bool success = afyaToken.transferFrom(msg.sender, facility, amount);
        require(success, "CV: reimbursement transfer failed");

        emit FacilityReimbursed(visitId, facility, amount, claimId, block.timestamp);
    }

    // ─── STREAK MANAGEMENT (called by API oracle) ─────────────────────────────
    /**
     * @notice Update a patient's contribution streak (called by backend oracle after M-PESA contribution)
     * @param patient    Patient address
     * @param streakDays Updated streak count
     */
    function updateStreak(address patient, uint256 streakDays)
        external
        onlyRole(SHA_ADMIN_ROLE)
    {
        require(patient != address(0), "CV: zero patient");
        patientStreakDays[patient] = streakDays;
        patientLastContribution[patient] = block.timestamp;
    }

    // ─── ADMIN: THRESHOLD MANAGEMENT ──────────────────────────────────────────
    /**
     * @notice Update tier thresholds (SHA policy adjustment)
     */
    function updateThresholds(
        uint256 _bronze,
        uint256 _silver,
        uint256 _gold,
        uint256 _platinum,
        uint256 _minCoverage
    )
        external
        onlyRole(SHA_ADMIN_ROLE)
    {
        require(_bronze < _silver && _silver < _gold && _gold < _platinum, "CV: invalid thresholds");
        bronzeThreshold = _bronze;
        silverThreshold = _silver;
        goldThreshold = _gold;
        platinumThreshold = _platinum;
        minimumCoverageBalance = _minCoverage;
    }

    // ─── QUERIES ──────────────────────────────────────────────────────────────
    function getVisit(bytes32 visitId) external view returns (FacilityVisit memory) {
        require(_visits[visitId].exists, "CV: visit not found");
        return _visits[visitId];
    }

    function getTotalVisits() external view returns (uint256) {
        return totalVisits;
    }

    // ─── INTERNAL ─────────────────────────────────────────────────────────────
    function _calculateTier(uint256 balance) internal view returns (CoverageTier) {
        if (balance >= platinumThreshold) return CoverageTier.PLATINUM;
        if (balance >= goldThreshold) return CoverageTier.GOLD;
        if (balance >= silverThreshold) return CoverageTier.SILVER;
        return CoverageTier.BRONZE;
    }

    // ─── EMERGENCY ────────────────────────────────────────────────────────────
    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
