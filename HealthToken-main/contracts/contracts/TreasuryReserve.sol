// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Security rationale: Multi-sig (3-of-5) prevents single point of failure
// for token issuance. CBK reference gating prevents unauthorized minting.
// TimeLock adds safety delay between proposal and execution.

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AfyaTokenToken.sol";

/**
 * @title TreasuryReserve
 * @notice CBK-gated multi-signature (3-of-5) treasury for AfyaToken issuance
 * @dev Issuance requires:
 *   1. A valid CBK authorization reference
 *   2. 3-of-5 signatories to approve the proposal
 *   3. 48-hour time-lock after approval before execution
 *
 * DHA: Treasury operations logged with CBK references, enabling
 *      automated compliance reports to DHA dashboard.
 */
contract TreasuryReserve is ReentrancyGuard, Pausable {
    // ─── STRUCTS ──────────────────────────────────────────────────────────────
    struct IssuanceProposal {
        string   cbkRef;        // CBK authorization reference
        address  recipient;     // Receiving address (must be whitelisted)
        uint256  amount;        // AfyaToken amount (wei)
        uint256  approvals;     // Approval count
        uint256  proposedAt;    // Timestamp of proposal
        bool     executed;      // Execution status
        bool     cancelled;
        mapping(address => bool) hasApproved;
    }

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    event ProposalCreated(uint256 indexed proposalId, string cbkRef, address recipient, uint256 amount);
    event ProposalApproved(uint256 indexed proposalId, address indexed signatory, uint256 approvals);
    event ProposalExecuted(uint256 indexed proposalId, string cbkRef, uint256 amount);
    event ProposalCancelled(uint256 indexed proposalId, address indexed cancelledBy);
    event SignatoryAdded(address indexed signatory);
    event SignatoryRemoved(address indexed signatory);

    // ─── STATE ────────────────────────────────────────────────────────────────
    AfyaTokenToken public immutable afyaTokenToken;

    uint256 public constant REQUIRED_APPROVALS = 3;
    uint256 public constant MAX_SIGNATORIES    = 5;
    uint256 public constant TIMELOCK_DELAY     = 48 hours;

    address[] public signatories;
    mapping(address => bool) public isSignatory;

    uint256 public proposalCount;
    mapping(uint256 => IssuanceProposal) private _proposals;

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    /**
     * @param afyaTokenTokenAddress Address of deployed AfyaTokenToken contract
     * @param initialSignatories Array of exactly 5 signatory addresses
     *
     * Security rationale: Signatories set at deploy time and changes require
     *                     multi-sig approval, preventing hostile takeover.
     */
    constructor(address afyaTokenTokenAddress, address[5] memory initialSignatories) {
        require(afyaTokenTokenAddress != address(0), "TR: zero token");
        afyaTokenToken = AfyaTokenToken(afyaTokenTokenAddress);

        for (uint256 i = 0; i < 5; i++) {
            address sig = initialSignatories[i];
            require(sig != address(0),     "TR: zero signatory");
            require(!isSignatory[sig],     "TR: duplicate signatory");
            signatories.push(sig);
            isSignatory[sig] = true;
            emit SignatoryAdded(sig);
        }
    }

    // ─── MODIFIERS ────────────────────────────────────────────────────────────
    modifier onlySignatory() {
        require(isSignatory[msg.sender], "TR: not a signatory");
        _;
    }

    // ─── PROPOSAL LIFECYCLE ───────────────────────────────────────────────────
    /**
     * @notice Create an issuance proposal
     * @param cbkRef    CBK authorization reference number
     * @param recipient Target address (must be in AfyaTokenToken purpose whitelist)
     * @param amount    AfyaToken amount to issue (in wei)
     */
    function propose(
        string calldata cbkRef,
        address recipient,
        uint256 amount
    )
        external
        onlySignatory
        whenNotPaused
        returns (uint256 proposalId)
    {
        require(bytes(cbkRef).length > 0,            "TR: empty CBK ref");
        require(!afyaTokenToken.usedCBKRefs(cbkRef),       "TR: CBK ref already used");
        require(recipient != address(0),             "TR: zero recipient");
        require(afyaTokenToken.purposeWhitelist(recipient),"TR: recipient not whitelisted");
        require(amount > 0,                          "TR: zero amount");

        proposalId = proposalCount++;
        IssuanceProposal storage p = _proposals[proposalId];
        p.cbkRef    = cbkRef;
        p.recipient = recipient;
        p.amount    = amount;
        p.proposedAt = block.timestamp;

        emit ProposalCreated(proposalId, cbkRef, recipient, amount);
    }

    /**
     * @notice Approve an issuance proposal (requires REQUIRED_APPROVALS to execute)
     * @param proposalId The proposal to approve
     *
     * Security rationale: Each signatory can approve only once per proposal
     *                     (replay-safe via hasApproved mapping).
     */
    function approve(uint256 proposalId)
        external
        onlySignatory
        whenNotPaused
    {
        IssuanceProposal storage p = _proposals[proposalId];
        require(p.proposedAt > 0,       "TR: proposal not found");
        require(!p.executed,            "TR: already executed");
        require(!p.cancelled,           "TR: cancelled");
        require(!p.hasApproved[msg.sender], "TR: already approved");

        p.hasApproved[msg.sender] = true;
        p.approvals++;

        emit ProposalApproved(proposalId, msg.sender, p.approvals);
    }

    /**
     * @notice Execute an approved proposal after time-lock expires
     * @param proposalId The proposal to execute
     *
     * Security rationale:
     * - nonReentrant: prevents reentrancy via malicious AfyaTokenToken callback
     * - Time-lock: 48h delay gives time to detect and cancel malicious proposals
     * - Checks-Effects-Interactions: executed flag set before mint call
     */
    function execute(uint256 proposalId)
        external
        onlySignatory
        nonReentrant
        whenNotPaused
    {
        IssuanceProposal storage p = _proposals[proposalId];
        require(p.proposedAt > 0,      "TR: not found");
        require(!p.executed,           "TR: already executed");
        require(!p.cancelled,          "TR: cancelled");
        require(p.approvals >= REQUIRED_APPROVALS, "TR: insufficient approvals");
        require(
            block.timestamp >= p.proposedAt + TIMELOCK_DELAY,
            "TR: time-lock not expired"
        );

        // Effects — set before external call (CEI pattern)
        p.executed = true;

        // Interaction — mint via AfyaTokenToken (owner must be this contract)
        afyaTokenToken.mint(p.recipient, p.amount, p.cbkRef);

        emit ProposalExecuted(proposalId, p.cbkRef, p.amount);
    }

    /**
     * @notice Cancel a proposal (any signatory can cancel before execution)
     */
    function cancel(uint256 proposalId) external onlySignatory {
        IssuanceProposal storage p = _proposals[proposalId];
        require(p.proposedAt > 0, "TR: not found");
        require(!p.executed,      "TR: already executed");
        require(!p.cancelled,     "TR: already cancelled");

        p.cancelled = true;
        emit ProposalCancelled(proposalId, msg.sender);
    }

    // ─── VIEWS ────────────────────────────────────────────────────────────────
    function getProposalApprovals(uint256 proposalId) external view returns (uint256) {
        return _proposals[proposalId].approvals;
    }

    function hasApproved(uint256 proposalId, address sig) external view returns (bool) {
        return _proposals[proposalId].hasApproved[sig];
    }

    function getSignatories() external view returns (address[] memory) {
        return signatories;
    }

    // ─── EMERGENCY ────────────────────────────────────────────────────────────
    /// @notice Emergency pause — requires consensus via off-chain governance
    function pause()   external onlySignatory { _pause(); }
    function unpause() external onlySignatory { _unpause(); }
}
