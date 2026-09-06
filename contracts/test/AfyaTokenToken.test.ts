import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { AfyaTokenToken } from "../typechain-types";

describe("AfyaTokenToken", function () {
    let afyaTokenToken: AfyaTokenToken;
    let owner: Signer;
    let facility1: Signer;
    let facility2: Signer;
    let attacker: Signer;

    const CBK_REF = "CBK-#TRE-441";
    const MINT_AMOUNT = ethers.parseEther("500000"); // 500k AfyaToken

    beforeEach(async function () {
        [owner, facility1, facility2, attacker] = await ethers.getSigners();

        const AfyaTokenFactory = await ethers.getContractFactory("AfyaTokenToken");
        afyaTokenToken = await AfyaTokenFactory.deploy(await owner.getAddress()) as AfyaTokenToken;
        await afyaTokenToken.waitForDeployment();
    });

    // ── DEPLOYMENT ──────────────────────────────────────────────────────────────
    describe("Deployment", function () {
        it("should set the correct name and symbol", async function () {
            expect(await afyaTokenToken.name()).to.equal("AfyaToken");
            expect(await afyaTokenToken.symbol()).to.equal("AfyaToken");
        });

        it("should whitelist the owner by default", async function () {
            expect(await afyaTokenToken.purposeWhitelist(await owner.getAddress())).to.be.true;
        });

        it("should have zero initial supply", async function () {
            expect(await afyaTokenToken.totalSupply()).to.equal(0n);
        });

        it("should enforce MAX_SUPPLY constant", async function () {
            const max = await afyaTokenToken.MAX_SUPPLY();
            expect(max).to.equal(ethers.parseEther("10000000"));
        });
    });

    // ── WHITELISTING ────────────────────────────────────────────────────────────
    describe("Purpose Whitelist", function () {
        it("should allow owner to whitelist a facility", async function () {
            const addr = await facility1.getAddress();
            await expect(afyaTokenToken.connect(owner).addPurposeAddress(addr, "SHA-FACILITY-001"))
                .to.emit(afyaTokenToken, "PurposeAddressAdded")
                .withArgs(addr, "SHA-FACILITY-001");
            expect(await afyaTokenToken.purposeWhitelist(addr)).to.be.true;
        });

        it("should reject zero-address whitelisting", async function () {
            await expect(
                afyaTokenToken.connect(owner).addPurposeAddress(ethers.ZeroAddress, "SHA-001")
            ).to.be.revertedWith("AfyaToken: zero address");
        });

        it("should reject empty facility code", async function () {
            await expect(
                afyaTokenToken.connect(owner).addPurposeAddress(await facility1.getAddress(), "")
            ).to.be.revertedWith("AfyaToken: empty facility code");
        });

        it("should NOT allow non-owner to whitelist", async function () {
            await expect(
                afyaTokenToken.connect(attacker).addPurposeAddress(await attacker.getAddress(), "BAD")
            ).to.be.reverted;
        });

        it("should allow owner to remove a whitelisted address", async function () {
            const addr = await facility1.getAddress();
            await afyaTokenToken.connect(owner).addPurposeAddress(addr, "SHA-001");
            await expect(afyaTokenToken.connect(owner).removePurposeAddress(addr))
                .to.emit(afyaTokenToken, "PurposeAddressRemoved")
                .withArgs(addr);
            expect(await afyaTokenToken.purposeWhitelist(addr)).to.be.false;
        });

        it("should reject removing a non-whitelisted address", async function () {
            await expect(
                afyaTokenToken.connect(owner).removePurposeAddress(await attacker.getAddress())
            ).to.be.revertedWith("AfyaToken: address not whitelisted");
        });
    });

    // ── MINTING ─────────────────────────────────────────────────────────────────
    describe("Minting", function () {
        it("should mint tokens with valid CBK ref to whitelisted address", async function () {
            await expect(afyaTokenToken.connect(owner).mint(await owner.getAddress(), MINT_AMOUNT, CBK_REF))
                .to.emit(afyaTokenToken, "TreasuryMint")
                .withArgs(await owner.getAddress(), MINT_AMOUNT, CBK_REF);
            expect(await afyaTokenToken.balanceOf(await owner.getAddress())).to.equal(MINT_AMOUNT);
        });

        it("should reject minting with duplicate CBK ref (replay protection)", async function () {
            await afyaTokenToken.connect(owner).mint(await owner.getAddress(), MINT_AMOUNT, CBK_REF);
            await expect(
                afyaTokenToken.connect(owner).mint(await owner.getAddress(), MINT_AMOUNT, CBK_REF)
            ).to.be.revertedWith("AfyaToken: CBK reference already used");
        });

        it("should reject minting beyond MAX_SUPPLY", async function () {
            const tooMuch = ethers.parseEther("10000001");
            await expect(
                afyaTokenToken.connect(owner).mint(await owner.getAddress(), tooMuch, CBK_REF)
            ).to.be.revertedWith("AfyaToken: exceeds max supply");
        });

        it("should reject minting to non-whitelisted address", async function () {
            await expect(
                afyaTokenToken.connect(owner).mint(await attacker.getAddress(), MINT_AMOUNT, CBK_REF)
            ).to.be.revertedWith("AfyaToken: recipient not in healthcare whitelist");
        });

        it("should reject minting zero amount", async function () {
            await expect(
                afyaTokenToken.connect(owner).mint(await owner.getAddress(), 0, CBK_REF)
            ).to.be.revertedWith("AfyaToken: amount must be positive");
        });

        it("should NOT allow non-owner to mint", async function () {
            await expect(
                afyaTokenToken.connect(attacker).mint(await attacker.getAddress(), MINT_AMOUNT, CBK_REF)
            ).to.be.reverted;
        });
    });

    // ── PURPOSE-LOCK TRANSFERS ───────────────────────────────────────────────────
    describe("Purpose-Locked Transfers", function () {
        beforeEach(async function () {
            await afyaTokenToken.connect(owner).mint(await owner.getAddress(), MINT_AMOUNT, CBK_REF);
            await afyaTokenToken.connect(owner).addPurposeAddress(await facility1.getAddress(), "SHA-F-001");
        });

        it("should allow transfer to whitelisted facility", async function () {
            await expect(
                afyaTokenToken.connect(owner).transfer(await facility1.getAddress(), ethers.parseEther("1000"))
            ).to.not.be.reverted;
        });

        it("should block transfer to non-whitelisted address", async function () {
            await expect(
                afyaTokenToken.connect(owner).transfer(await attacker.getAddress(), ethers.parseEther("1000"))
            ).to.be.revertedWith("AfyaToken: recipient not in healthcare whitelist");
        });

        it("should block transferFrom to non-whitelisted address", async function () {
            await afyaTokenToken.connect(owner).approve(await facility1.getAddress(), ethers.parseEther("1000"));
            await expect(
                afyaTokenToken.connect(facility1).transferFrom(
                    await owner.getAddress(), await attacker.getAddress(), ethers.parseEther("1000")
                )
            ).to.be.revertedWith("AfyaToken: recipient not in healthcare whitelist");
        });
    });

    // ── PAUSE ────────────────────────────────────────────────────────────────────
    describe("Pause / Unpause", function () {
        it("should block transfers when paused", async function () {
            await afyaTokenToken.connect(owner).mint(await owner.getAddress(), MINT_AMOUNT, CBK_REF);
            await afyaTokenToken.connect(owner).addPurposeAddress(await facility1.getAddress(), "SHA-F-001");
            await afyaTokenToken.connect(owner).pause();
            await expect(
                afyaTokenToken.connect(owner).transfer(await facility1.getAddress(), ethers.parseEther("100"))
            ).to.be.reverted; // Pausable
        });

        it("should allow transfers after unpause", async function () {
            await afyaTokenToken.connect(owner).mint(await owner.getAddress(), MINT_AMOUNT, CBK_REF);
            await afyaTokenToken.connect(owner).addPurposeAddress(await facility1.getAddress(), "SHA-F-001");
            await afyaTokenToken.connect(owner).pause();
            await afyaTokenToken.connect(owner).unpause();
            await expect(
                afyaTokenToken.connect(owner).transfer(await facility1.getAddress(), ethers.parseEther("100"))
            ).to.not.be.reverted;
        });

        it("should NOT allow non-owner to pause", async function () {
            await expect(afyaTokenToken.connect(attacker).pause()).to.be.reverted;
        });
    });
});
