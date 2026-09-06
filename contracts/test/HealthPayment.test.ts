import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { AfyaTokenToken, HealthPayment, ClaimRegistry } from "../typechain-types";

describe("HealthPayment", function () {
    let afyaTokenToken: AfyaTokenToken;
    let payment: HealthPayment;
    let owner: Signer;
    let shaAdmin: Signer;
    let verifier: Signer;
    let patient: Signer;
    let facility: Signer;
    let attacker: Signer;

    const PATIENT_BALANCE = ethers.parseEther("1000");
    const CLAIM_AMOUNT = ethers.parseEther("500");
    const CLAIM_ID = ethers.keccak256(ethers.toUtf8Bytes("CLM-44821"));

    beforeEach(async function () {
        [owner, shaAdmin, verifier, patient, facility, attacker] = await ethers.getSigners();

        // Deploy AfyaTokenToken
        const AfyaToken = await ethers.getContractFactory("AfyaTokenToken");
        afyaTokenToken = await AfyaToken.deploy(await owner.getAddress()) as AfyaTokenToken;
        await afyaTokenToken.waitForDeployment();

        // Deploy HealthPayment
        const HP = await ethers.getContractFactory("HealthPayment");
        payment = await HP.deploy(
            await afyaTokenToken.getAddress(),
            await owner.getAddress()
        ) as HealthPayment;
        await payment.waitForDeployment();

        // Setup: whitelist patient and facility; whitelist payment contract
        await afyaTokenToken.connect(owner).addPurposeAddress(await patient.getAddress(), "PATIENT-1");
        await afyaTokenToken.connect(owner).addPurposeAddress(await facility.getAddress(), "SHA-F-001");
        await afyaTokenToken.connect(owner).addPurposeAddress(await payment.getAddress(), "PAYMENT-CONTRACT");

        // Grant roles
        const SHA_ADMIN = await payment.SHA_ADMIN_ROLE();
        const VERIFIER = await payment.VERIFIER_ROLE();
        await payment.connect(owner).grantRole(SHA_ADMIN, await shaAdmin.getAddress());
        await payment.connect(owner).grantRole(VERIFIER, await verifier.getAddress());

        // Mint tokens to patient
        await afyaTokenToken.connect(owner).mint(await patient.getAddress(), PATIENT_BALANCE, "CBK-TEST-001");

        // Patient approves HealthPayment to spend
        await afyaTokenToken.connect(patient).approve(await payment.getAddress(), PATIENT_BALANCE);
    });

    // ── CLAIM VERIFICATION ─────────────────────────────────────────────────────
    describe("Claim Verification", function () {
        it("should allow verifier to verify a claim", async function () {
            await expect(
                payment.connect(verifier).verifyClaim(CLAIM_ID, await patient.getAddress(), CLAIM_AMOUNT)
            ).to.emit(payment, "ClaimVerified").withArgs(CLAIM_ID, await verifier.getAddress());

            expect(await payment.claimVerified(CLAIM_ID)).to.be.true;
            expect(await payment.claimAmount(CLAIM_ID)).to.equal(CLAIM_AMOUNT);
        });

        it("should reject verification by non-verifier", async function () {
            await expect(
                payment.connect(attacker).verifyClaim(CLAIM_ID, await patient.getAddress(), CLAIM_AMOUNT)
            ).to.be.reverted;
        });

        it("should reject zero claimId", async function () {
            await expect(
                payment.connect(verifier).verifyClaim(ethers.ZeroHash, await patient.getAddress(), CLAIM_AMOUNT)
            ).to.be.revertedWith("HP: invalid claimId");
        });

        it("should reject double verification", async function () {
            await payment.connect(verifier).verifyClaim(CLAIM_ID, await patient.getAddress(), CLAIM_AMOUNT);
            await expect(
                payment.connect(verifier).verifyClaim(CLAIM_ID, await patient.getAddress(), CLAIM_AMOUNT)
            ).to.be.revertedWith("HP: claim already verified");
        });
    });

    // ── PAYMENT EXECUTION ──────────────────────────────────────────────────────
    describe("Payment Execution", function () {
        beforeEach(async function () {
            await payment.connect(verifier).verifyClaim(CLAIM_ID, await patient.getAddress(), CLAIM_AMOUNT);
        });

        it("should execute a valid payment and emit event", async function () {
            await expect(
                payment.connect(shaAdmin).executePayment(
                    await patient.getAddress(),
                    await facility.getAddress(),
                    CLAIM_ID
                )
            )
                .to.emit(payment, "PaymentExecuted")
                .withArgs(
                    await patient.getAddress(),
                    await facility.getAddress(),
                    CLAIM_AMOUNT,
                    CLAIM_ID,
                    await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1)
                );

            expect(await afyaTokenToken.balanceOf(await facility.getAddress())).to.equal(CLAIM_AMOUNT);
            expect(await afyaTokenToken.balanceOf(await patient.getAddress())).to.equal(PATIENT_BALANCE - CLAIM_AMOUNT);
        });

        it("should prevent double-payment (claimPaid flag)", async function () {
            await payment.connect(shaAdmin).executePayment(
                await patient.getAddress(), await facility.getAddress(), CLAIM_ID
            );
            await expect(
                payment.connect(shaAdmin).executePayment(
                    await patient.getAddress(), await facility.getAddress(), CLAIM_ID
                )
            ).to.be.revertedWith("HP: claim already paid");
        });

        it("should reject payment for unverified claim", async function () {
            const badId = ethers.keccak256(ethers.toUtf8Bytes("UNVERIFIED"));
            await expect(
                payment.connect(shaAdmin).executePayment(
                    await patient.getAddress(), await facility.getAddress(), badId
                )
            ).to.be.revertedWith("HP: claim not verified");
        });

        it("should reject payment to non-accredited facility", async function () {
            await expect(
                payment.connect(shaAdmin).executePayment(
                    await patient.getAddress(), await attacker.getAddress(), CLAIM_ID
                )
            ).to.be.revertedWith("HP: facility not accredited");
        });

        it("should reject payment with patient mismatch", async function () {
            await expect(
                payment.connect(shaAdmin).executePayment(
                    await attacker.getAddress(), await facility.getAddress(), CLAIM_ID
                )
            ).to.be.revertedWith("HP: patient mismatch");
        });

        it("should reject payment by non-SHA_ADMIN", async function () {
            await expect(
                payment.connect(attacker).executePayment(
                    await patient.getAddress(), await facility.getAddress(), CLAIM_ID
                )
            ).to.be.reverted;
        });
    });
});

// ─── CLAIM REGISTRY TESTS ─────────────────────────────────────────────────────
describe("ClaimRegistry", function () {
    let registry: ClaimRegistry;
    let owner: Signer;
    let registrar: Signer;
    let patient: Signer;
    let facility: Signer;
    let attacker: Signer;

    const CLAIM_ID = ethers.keccak256(ethers.toUtf8Bytes("CLM-TEST-001"));
    const ICD10 = "Z00.00";
    const AMOUNT_AfyaToken = ethers.parseEther("120");

    beforeEach(async function () {
        [owner, registrar, patient, facility, attacker] = await ethers.getSigners();

        const CR = await ethers.getContractFactory("ClaimRegistry");
        registry = await CR.deploy(await owner.getAddress()) as ClaimRegistry;
        await registry.waitForDeployment();

        await registry.connect(owner).grantRole(
            await registry.REGISTRAR_ROLE(),
            await registrar.getAddress()
        );
    });

    it("should register a claim and emit event", async function () {
        await expect(
            registry.connect(registrar).registerClaim(
                CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
                ICD10, AMOUNT_AfyaToken, 98, 0
            )
        ).to.emit(registry, "ClaimRegistered").withArgs(
            CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
            ICD10, AMOUNT_AfyaToken, 98, await ethers.provider.getBlock("latest").then(b => b!.timestamp + 1)
        );
        expect(await registry.claimExists(CLAIM_ID)).to.be.true;
    });

    it("should reject registering duplicate claim (immutability)", async function () {
        await registry.connect(registrar).registerClaim(
            CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
            ICD10, AMOUNT_AfyaToken, 98, 0
        );
        await expect(
            registry.connect(registrar).registerClaim(
                CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
                ICD10, AMOUNT_AfyaToken, 98, 0
            )
        ).to.be.revertedWith("CR: claim already registered");
    });

    it("should reject invalid AI score", async function () {
        await expect(
            registry.connect(registrar).registerClaim(
                CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
                ICD10, AMOUNT_AfyaToken, 101, 0
            )
        ).to.be.revertedWith("CR: invalid score");
    });

    it("should reject ICD-10 code longer than 16 chars", async function () {
        await expect(
            registry.connect(registrar).registerClaim(
                CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
                "TOOLONGCODE12345X", AMOUNT_AfyaToken, 90, 0
            )
        ).to.be.revertedWith("CR: ICD-10 code too long");
    });

    it("should reject registration by non-registrar", async function () {
        await expect(
            registry.connect(attacker).registerClaim(
                CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
                ICD10, AMOUNT_AfyaToken, 90, 0
            )
        ).to.be.reverted;
    });

    it("should return correct claim record", async function () {
        await registry.connect(registrar).registerClaim(
            CLAIM_ID, await patient.getAddress(), await facility.getAddress(),
            ICD10, AMOUNT_AfyaToken, 95, 1
        );
        const record = await registry.getClaim(CLAIM_ID);
        expect(record.icd10Code).to.equal(ICD10);
        expect(record.aiScorePercent).to.equal(95);
        expect(record.fraudFlag).to.equal(1);
        expect(record.amountAfyaToken).to.equal(AMOUNT_AfyaToken);
    });

    it("should revert getClaim for non-existent claim", async function () {
        const fakeId = ethers.keccak256(ethers.toUtf8Bytes("NONEXISTENT"));
        await expect(registry.getClaim(fakeId)).to.be.revertedWith("CR: claim not found");
    });
});
