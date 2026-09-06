// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Security rationale: Using OpenZeppelin's battle-tested ERC-20 and
// ReentrancyGuard implementations prevents integer overflow, reentrancy
// attacks, and access control vulnerabilities (OWASP SC-07).
//
// UHC Rationale: AfyaToken is a COVERAGE-PROOF token, not a payment currency.
// Patients accumulate tokens through SHIF contributions to prove active membership.
// Tokens CANNOT be transferred from patient wallets to facility wallets.
// Facility reimbursement flows exclusively from Treasury → Facility via CoverageVerifier.

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AfyaToken (formerly AfyaTokenToken)
 * @notice AfyaToken — coverage-proof ERC-20 for Kenya's Universal Health Coverage
 * @dev Tokens prove active SHIF contribution status. They are NOT used as payment.
 *
 *      Transfer restrictions:
 *      - Patient→Facility transfers are BLOCKED (coverage-proof, not currency)
 *      - Treasury→Facility transfers are ALLOWED (SHIF pool reimbursement)
 *      - Minting to patient wallets is ALLOWED (on M-PESA contribution)
 *
 * DHA: Token design enforces the Digital Health Act No. 15 of 2023
 *      requirement that health financing instruments be purpose-bound.
 *      AfyaToken is bound to the single purpose of proving SHIF coverage.
 */
contract AfyaTokenToken is ERC20, Ownable, ReentrancyGuard, Pausable {
    // ─── EVENTS ───────────────────────────────────────────────────────────────
    event PurposeAddressAdded(address indexed addr, string facilityCode);
    event PurposeAddressRemoved(address indexed addr);
    event TreasuryMint(address indexed to, uint256 amount, string cbkRef);
    event TreasuryAddressUpdated(address indexed oldTreasury, address indexed newTreasury);
    event CoverageVerifierUpdated(address indexed verifier);

    // ─── STATE ────────────────────────────────────────────────────────────────
    /// @dev Addresses permitted to RECEIVE AfyaToken (SHA-accredited facilities,
    ///      Treasury, and the CoverageVerifier contract).
    mapping(address => bool) public purposeWhitelist;

    /// @dev Facility codes for audit trail
    mapping(address => string) public facilityCode;

    /// @dev Addresses designated as Treasury/system — allowed to transfer to facilities
    mapping(address => bool) public treasuryAddresses;

    /// @dev CBK authorization references for minting batches
    mapping(string => bool) public usedCBKRefs;

    /// @dev CoverageVerifier contract address — permitted to orchestrate reimbursements
    address public coverageVerifier;

    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18; // 10M AFYA

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    constructor(address initialOwner)
        ERC20("AfyaToken", "AFYA")
        Ownable(initialOwner)
    {
        // Owner (Treasury multi-sig) whitelisted by default
        purposeWhitelist[initialOwner] = true;
        treasuryAddresses[initialOwner] = true;
    }

    // ─── MODIFIERS ────────────────────────────────────────────────────────────
    /// @notice Purpose-lock: recipient must be whitelisted healthcare address
    /// Security rationale: Blocks asset misuse, satisfies CBK purpose-bound requirements.
    modifier purposeLocked(address to) {
        require(
            purposeWhitelist[to],
            "AFYA: recipient not in healthcare whitelist"
        );
        _;
    }

    // ─── WHITELISTING ─────────────────────────────────────────────────────────
    /**
     * @notice Add an SHA-accredited facility or contract to the purpose whitelist
     * @param addr The address to whitelist
     * @param code SHA facility registration code for audit trail
     */
    function addPurposeAddress(address addr, string calldata code)
        external
        onlyOwner
    {
        require(addr != address(0), "AFYA: zero address");
        require(bytes(code).length > 0, "AFYA: empty facility code");
        purposeWhitelist[addr] = true;
        facilityCode[addr] = code;
        emit PurposeAddressAdded(addr, code);
    }

    /**
     * @notice Remove an address from the purpose whitelist
     * @param addr The address to remove
     */
    function removePurposeAddress(address addr) external onlyOwner {
        require(purposeWhitelist[addr], "AFYA: address not whitelisted");
        purposeWhitelist[addr] = false;
        emit PurposeAddressRemoved(addr);
    }

    // ─── TREASURY MANAGEMENT ──────────────────────────────────────────────────
    /**
     * @notice Designate an address as a Treasury address (allowed to transfer to facilities)
     * @param addr Treasury address
     */
    function setTreasuryAddress(address addr, bool status) external onlyOwner {
        require(addr != address(0), "AFYA: zero address");
        address old = addr;
        treasuryAddresses[addr] = status;
        emit TreasuryAddressUpdated(old, addr);
    }

    /**
     * @notice Set the CoverageVerifier contract address
     * @param verifier CoverageVerifier contract address
     */
    function setCoverageVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "AFYA: zero verifier");
        coverageVerifier = verifier;
        // CoverageVerifier is also a treasury address (can orchestrate reimbursements)
        treasuryAddresses[verifier] = true;
        purposeWhitelist[verifier] = true;
        emit CoverageVerifierUpdated(verifier);
    }

    // ─── MINTING (CBK-GATED) ──────────────────────────────────────────────────
    /**
     * @notice Mint new AfyaTokens (CBK-authorized only)
     * @param to Recipient (patient wallet or Treasury)
     * @param amount Token amount (18 decimals)
     * @param cbkRef CBK authorization reference number
     *
     * Security rationale: cbkRef prevents replay attacks on mint operations.
     * Max supply cap prevents inflation beyond the CBK-authorized ceiling.
     *
     * Note: Minting to patient wallets is ALLOWED — this is how contributions
     * are recorded. The purposeLocked modifier is relaxed for minting to
     * non-whitelisted addresses (patient wallets) when called by owner.
     */
    function mint(address to, uint256 amount, string calldata cbkRef)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(to != address(0), "AFYA: zero address");
        require(amount > 0, "AFYA: amount must be positive");
        require(!usedCBKRefs[cbkRef], "AFYA: CBK reference already used");
        require(totalSupply() + amount <= MAX_SUPPLY, "AFYA: exceeds max supply");

        usedCBKRefs[cbkRef] = true;
        _mint(to, amount);
        emit TreasuryMint(to, amount, cbkRef);
    }

    // ─── OVERRIDES (UHC COVERAGE-PROOF MODEL) ─────────────────────────────────
    /**
     * @notice Override ERC-20 transfer to enforce coverage-proof model
     *
     * UHC rationale: Patients CANNOT transfer tokens to facilities.
     * Only Treasury/system addresses can transfer tokens (for reimbursement).
     * This ensures AfyaTokens function as coverage proof, not payment.
     *
     * Security rationale: Purpose-lock applied at token-contract level
     *                     cannot be bypassed by any external contract.
     */
    function transfer(address to, uint256 amount)
        public
        override
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        // Only Treasury/system addresses can transfer tokens
        require(
            treasuryAddresses[msg.sender],
            "AFYA: only treasury can transfer (coverage-proof model)"
        );
        // Recipient must be in purpose whitelist (facility or treasury)
        require(
            purposeWhitelist[to],
            "AFYA: recipient not in healthcare whitelist"
        );
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount)
        public
        override
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        // Only transfers FROM treasury addresses are allowed
        require(
            treasuryAddresses[from],
            "AFYA: only treasury can transfer (coverage-proof model)"
        );
        // Recipient must be in purpose whitelist
        require(
            purposeWhitelist[to],
            "AFYA: recipient not in healthcare whitelist"
        );
        return super.transferFrom(from, to, amount);
    }

    // ─── EMERGENCY CONTROLS ───────────────────────────────────────────────────
    /// @notice Pause all transfers (emergency use — DHA/CBK directive)
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
