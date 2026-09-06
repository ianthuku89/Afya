// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// DEPRECATED: The patient→facility payment model has been replaced by the
// coverage-proof model. See CoverageVerifier.sol for the active implementation.
//
// This contract is retained for:
// 1. Historical audit trail compliance (DHA requires 7-year retention)
// 2. Backward compatibility with any existing on-chain claim references
// 3. The reimburseFromPool() function (Treasury → Facility reimbursement)
//
// UHC Rationale: Under Kenya's Universal Health Coverage model, patients
// do NOT pay for healthcare from their personal token wallets. Instead,
// the SHIF Treasury pool reimburses facilities after claim verification.

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AfyaTokenToken.sol";

/**
 * @title HealthPayment (DEPRECATED — Coverage-Proof Model Active)
 * @notice Legacy contract — executePayment() is disabled.
 *         reimburseFromPool() provides Treasury→Facility reimbursement.
 * @dev The CoverageVerifier contract is the active replacement.
 *
 * DHA: All historical payment events remain on-chain for audit trail
 *      compliance with Digital Health Act No. 15 of 2023.
 */
contract HealthPayment is AccessControl, ReentrancyGuard, Pausable {
    // ─── ROLES ────────────────────────────────────────────────────────────────
    bytes32 public constant SHA_ADMIN_ROLE   = keccak256("SHA_ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE    = keccak256("VERIFIER_ROLE");
    bytes32 public constant TREASURY_ROLE    = keccak256("TREASURY_ROLE");

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    // Legacy events (retained for historical reference)
    event PaymentExecuted(
        address indexed patient,
        address indexed facility,
        uint256 amount,
        bytes32 indexed claimId,
        uint256 timestamp
    );
    event ClaimVerified(bytes32 indexed claimId, address indexed verifier);
    event ClaimInvalidated(bytes32 indexed claimId, string reason);
    event PaymentReverted(bytes32 indexed claimId, string reason);

    // New UHC events
    event PoolReimbursement(
        address indexed facility,
        uint256 amount,
        bytes32 indexed claimId,
        uint256 timestamp
    );

    // ─── STATE ────────────────────────────────────────────────────────────────
    AfyaTokenToken public immutable afyaTokenToken;

    /// @dev claimId => verified status; once true, cannot be reverted (immutable)
    mapping(bytes32 => bool)    public claimVerified;

    /// @dev claimId => paid status; prevents double payment
    mapping(bytes32 => bool)    public claimPaid;

    /// @dev claimId => patient address for audit
    mapping(bytes32 => address) public claimPatient;

    /// @dev claimId => amount for audit
    mapping(bytes32 => uint256) public claimAmount;

    /// @dev claimId => reimbursed from pool status
    mapping(bytes32 => bool)    public claimReimbursed;

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    constructor(address afyaTokenTokenAddress, address admin) {
        require(afyaTokenTokenAddress != address(0), "HP: zero token address");
        require(admin != address(0), "HP: zero admin address");
        afyaTokenToken = AfyaTokenToken(afyaTokenTokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SHA_ADMIN_ROLE, admin);
        _grantRole(TREASURY_ROLE, admin);
    }

    // ─── CLAIM VERIFICATION ───────────────────────────────────────────────────
    /**
     * @notice Mark a claim as verified by SHA admin
     * @param claimId    Keccak256 hash of the claim data
     * @param patient    Patient wallet address (for audit only — NOT debited)
     * @param amount     Approved reimbursement amount in AFYA (wei)
     *
     * Security rationale: Only VERIFIER_ROLE can verify, preventing
     *                     self-approval attacks.
     */
    function verifyClaim(
        bytes32 claimId,
        address patient,
        uint256 amount
    )
        external
        onlyRole(VERIFIER_ROLE)
        whenNotPaused
    {
        require(claimId != bytes32(0), "HP: invalid claimId");
        require(patient != address(0), "HP: zero patient address");
        require(amount > 0, "HP: amount must be positive");
        require(!claimVerified[claimId], "HP: claim already verified");
        require(!claimPaid[claimId], "HP: claim already paid");

        claimVerified[claimId] = true;
        claimPatient[claimId]  = patient;
        claimAmount[claimId]   = amount;

        emit ClaimVerified(claimId, msg.sender);
    }

    // ─── DEPRECATED: PATIENT PAYMENT ──────────────────────────────────────────
    /**
     * @notice DEPRECATED — Patient→Facility payments are disabled under UHC model.
     *         Use reimburseFromPool() for Treasury→Facility reimbursement.
     *
     * UHC Rationale: Under Universal Health Coverage, patients prove coverage
     * status via AfyaToken balance. They do NOT pay from their personal wallet.
     * Facilities are reimbursed from the SHIF Treasury pool.
     */
    function executePayment(
        address /* patient */,
        address /* facility */,
        bytes32 /* claimId */
    )
        external
        view
        onlyRole(SHA_ADMIN_ROLE)
    {
        revert("HP: DEPRECATED — Use reimburseFromPool() or CoverageVerifier.reimburseFromPool()");
    }

    // ─── NEW: TREASURY → FACILITY REIMBURSEMENT ──────────────────────────────
    /**
     * @notice Reimburse a facility from the SHIF Treasury pool
     * @param facility  SHA-accredited facility address
     * @param claimId   Verified claim ID
     *
     * Security rationale:
     * - nonReentrant: prevents reentrancy via malicious facility contract
     * - Only TREASURY_ROLE can execute (SHA admin / automated system)
     * - Claim must be verified before reimbursement
     * - Double-spend protection via claimReimbursed flag
     * - Checks-Effects-Interactions pattern strictly followed
     *
     * UHC: Tokens flow from Treasury → Facility. Patient wallet is NEVER debited.
     */
    function reimburseFromPool(
        address facility,
        bytes32 claimId
    )
        external
        nonReentrant
        whenNotPaused
        onlyRole(TREASURY_ROLE)
    {
        // ── CHECKS ────────────────────────────────────────────────────────────
        require(claimVerified[claimId],  "HP: claim not verified");
        require(!claimReimbursed[claimId], "HP: claim already reimbursed");
        require(afyaTokenToken.purposeWhitelist(facility), "HP: facility not accredited");

        uint256 amount = claimAmount[claimId];
        require(amount > 0, "HP: zero claim amount");

        // ── EFFECTS ───────────────────────────────────────────────────────────
        claimReimbursed[claimId] = true;

        // ── INTERACTIONS ──────────────────────────────────────────────────────
        // Transfer from Treasury (msg.sender) to Facility
        bool success = afyaTokenToken.transferFrom(msg.sender, facility, amount);
        require(success, "HP: reimbursement transfer failed");

        emit PoolReimbursement(facility, amount, claimId, block.timestamp);
    }

    // ─── EMERGENCY ────────────────────────────────────────────────────────────
    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
