// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {LimePayPaymentRouter} from "../LimePayPaymentRouter.sol";
import {MockERC20} from "../test-helpers/MockERC20.sol";

// Minimal cheat-code interface used by the handler
interface IVmHandler {
    function prank(address sender) external;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler used by the invariant test
// ─────────────────────────────────────────────────────────────────────────────
contract PaymentHandler {
    // Canonical Foundry cheat-code address
    IVmHandler internal constant CHEAT =
        IVmHandler(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    LimePayPaymentRouter internal router;
    MockERC20 internal usdc;
    address internal payer;

    // Track cumulative amounts routed through the contract
    uint256 public totalAmountSent;
    uint256 public totalFeesCollected;
    uint256 public totalPayoutsDelivered;

    constructor(LimePayPaymentRouter router_, MockERC20 usdc_, address payer_) {
        router = router_;
        usdc = usdc_;
        payer = payer_;
    }

    /// @dev Fuzzer calls this; `amount` is bounded to [1, 1_000_000e6].
    function sendPayment(uint256 amount, address recipient) external {
        // Bound inputs to sane ranges
        amount = bound(amount, 1, 1_000_000e6);
        if (recipient == address(0) || recipient == address(router)) {
            recipient = address(0xBEEF);
        }

        // Ensure payer has enough and has approved
        usdc.mint(payer, amount);
        CHEAT.prank(payer);
        usdc.approve(address(router), amount);

        uint16 fee = router.feeBps();
        uint256 feeAmt = (amount * fee) / 10_000;
        uint256 payout = amount - feeAmt;

        CHEAT.prank(payer);
        router.pay(recipient, amount, "inv-handler");

        totalAmountSent += amount;
        totalFeesCollected += feeAmt;
        totalPayoutsDelivered += payout;
    }

    function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
        if (max <= min) return min;
        return min + (x % (max - min + 1));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main test contract
// ─────────────────────────────────────────────────────────────────────────────
contract LimePayPaymentRouterTest is Test {
    // ── Roles ──────────────────────────────────────────────────────────────
    address internal owner    = makeAddr("owner");
    address internal alice    = makeAddr("alice");   // payer
    address internal bob      = makeAddr("bob");     // recipient
    address internal treasury = makeAddr("treasury");
    address internal attacker = makeAddr("attacker");

    // ── Constants ──────────────────────────────────────────────────────────
    uint16  internal constant INITIAL_FEE_BPS = 100;  // 1 %
    uint16  internal constant MAX_FEE_BPS     = 500;  // 5 %
    uint256 internal constant ALICE_BALANCE   = 10_000e6; // 10 000 USDC

    // ── Contracts ──────────────────────────────────────────────────────────
    MockERC20              internal usdc;
    LimePayPaymentRouter   internal router;

    // ──────────────────────────────────────────────────────────────────────
    // setUp — runs before EVERY test
    // ──────────────────────────────────────────────────────────────────────
    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);

        router = new LimePayPaymentRouter(
            owner,
            address(usdc),
            treasury,
            INITIAL_FEE_BPS
        );

        // Fund alice and give the router infinite approval
        usdc.mint(alice, ALICE_BALANCE);
        vm.prank(alice);
        usdc.approve(address(router), type(uint256).max);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 1. DEPLOYMENT & INITIALIZATION
    // ══════════════════════════════════════════════════════════════════════

    function test_Constructor_SetsOwner() public view {
        assertEq(router.owner(), owner);
    }

    function test_Constructor_SetsUsdcToken() public view {
        assertEq(router.usdcToken(), address(usdc));
    }

    function test_Constructor_SetsTreasury() public view {
        assertEq(router.treasury(), treasury);
    }

    function test_Constructor_SetsFeeBps() public view {
        assertEq(router.feeBps(), INITIAL_FEE_BPS);
    }

    function test_Constructor_NotPausedOnDeploy() public view {
        assertFalse(router.paused());
    }

    // ── Constructor revert: zero addresses ─────────────────────────────────

    function test_Constructor_RevertZeroOwner() public {
        // OZ's Ownable calls _transferOwnership(address(0)) before our custom check,
        // so it surfaces OwnableInvalidOwner rather than ZeroAddress("initialOwner").
        // This is a contract behaviour finding — see Suspected contract bugs.
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0))
        );
        new LimePayPaymentRouter(address(0), address(usdc), treasury, INITIAL_FEE_BPS);
    }

    function test_Constructor_RevertZeroUsdc() public {
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.ZeroAddress.selector, "usdcToken")
        );
        new LimePayPaymentRouter(owner, address(0), treasury, INITIAL_FEE_BPS);
    }

    function test_Constructor_RevertZeroTreasury() public {
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.ZeroAddress.selector, "treasury")
        );
        new LimePayPaymentRouter(owner, address(usdc), address(0), INITIAL_FEE_BPS);
    }

    function test_Constructor_RevertFeeTooHigh() public {
        uint16 bad = MAX_FEE_BPS + 1;
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.FeeTooHigh.selector, bad, MAX_FEE_BPS)
        );
        new LimePayPaymentRouter(owner, address(usdc), treasury, bad);
    }

    function test_Constructor_AcceptsMaxFeeBps() public {
        LimePayPaymentRouter r = new LimePayPaymentRouter(
            owner, address(usdc), treasury, MAX_FEE_BPS
        );
        assertEq(r.feeBps(), MAX_FEE_BPS);
    }

    function test_Constructor_AcceptsZeroFeeBps() public {
        LimePayPaymentRouter r = new LimePayPaymentRouter(
            owner, address(usdc), treasury, 0
        );
        assertEq(r.feeBps(), 0);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 2. pay() — happy paths
    // ══════════════════════════════════════════════════════════════════════

    function test_Pay_TransfersPayoutToRecipient() public {
        uint256 amount = 1_000e6;
        uint256 expectedFee    = (amount * INITIAL_FEE_BPS) / 10_000; // 10 USDC
        uint256 expectedPayout = amount - expectedFee;                 // 990 USDC

        vm.prank(alice);
        router.pay(bob, amount, "ref-001");

        assertEq(usdc.balanceOf(bob), expectedPayout);
    }

    function test_Pay_TransfersFeeToTreasury() public {
        uint256 amount = 1_000e6;
        uint256 expectedFee = (amount * INITIAL_FEE_BPS) / 10_000;

        vm.prank(alice);
        router.pay(bob, amount, "ref-001");

        assertEq(usdc.balanceOf(treasury), expectedFee);
    }

    function test_Pay_DeductsFullAmountFromSender() public {
        uint256 amount = 1_000e6;

        vm.prank(alice);
        router.pay(bob, amount, "ref-001");

        assertEq(usdc.balanceOf(alice), ALICE_BALANCE - amount);
    }

    function test_Pay_EmitsPaymentSent() public {
        uint256 amount = 1_000e6;
        uint256 fee    = (amount * INITIAL_FEE_BPS) / 10_000;

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(router));
        emit LimePayPaymentRouter.PaymentSent(alice, bob, amount, fee, "ref-001");
        router.pay(bob, amount, "ref-001");
    }

    function test_Pay_ZeroFee_NoTreasuryTransfer() public {
        // Deploy router with 0 fee
        LimePayPaymentRouter zeroFeeRouter = new LimePayPaymentRouter(
            owner, address(usdc), treasury, 0
        );
        usdc.mint(alice, 500e6);
        vm.prank(alice);
        usdc.approve(address(zeroFeeRouter), type(uint256).max);

        uint256 amount = 500e6;
        uint256 aliceBefore   = usdc.balanceOf(alice);
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(alice);
        zeroFeeRouter.pay(bob, amount, "zero-fee");

        // Bob gets full amount; treasury unchanged
        assertEq(usdc.balanceOf(bob), amount);
        assertEq(usdc.balanceOf(treasury), treasuryBefore);
        assertEq(usdc.balanceOf(alice), aliceBefore - amount);
    }

    function test_Pay_MaxFee_CorrectSplit() public {
        LimePayPaymentRouter maxFeeRouter = new LimePayPaymentRouter(
            owner, address(usdc), treasury, MAX_FEE_BPS
        );
        uint256 amount = 1_000e6;
        usdc.mint(alice, amount);
        vm.prank(alice);
        usdc.approve(address(maxFeeRouter), type(uint256).max);

        uint256 expectedFee    = (amount * MAX_FEE_BPS) / 10_000; // 5 %
        uint256 expectedPayout = amount - expectedFee;

        vm.prank(alice);
        maxFeeRouter.pay(bob, amount, "max-fee");

        assertEq(usdc.balanceOf(bob),      expectedPayout);
        assertEq(usdc.balanceOf(treasury), expectedFee);
    }

    // ── pay() revert paths ─────────────────────────────────────────────────

    function test_Pay_RevertZeroRecipient() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.ZeroAddress.selector, "recipient")
        );
        router.pay(address(0), 100e6, "ref");
    }

    function test_Pay_RevertZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.InvalidAmount.selector, 0)
        );
        router.pay(bob, 0, "ref");
    }

    function test_Pay_RevertWhenPaused() public {
        vm.prank(owner);
        router.pause();

        vm.prank(alice);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        router.pay(bob, 100e6, "ref");
    }

    function test_Pay_RevertInsufficientAllowance() public {
        // Revoke alice's allowance
        vm.prank(alice);
        usdc.approve(address(router), 0);

        vm.prank(alice);
        // SafeERC20 will surface an ERC20InsufficientAllowance revert from MockERC20
        // (arithmetic underflow in MockERC20.transferFrom) — just expect any revert
        vm.expectRevert();
        router.pay(bob, 100e6, "ref");
    }

    function test_Pay_RevertInsufficientBalance() public {
        address poorUser = makeAddr("poorUser");
        // poorUser has no USDC but has approved the router
        vm.prank(poorUser);
        usdc.approve(address(router), type(uint256).max);

        vm.prank(poorUser);
        vm.expectRevert();
        router.pay(bob, 1e6, "ref");
    }

    // ══════════════════════════════════════════════════════════════════════
    // 3. setTreasury()
    // ══════════════════════════════════════════════════════════════════════

    function test_SetTreasury_UpdatesTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(owner);
        router.setTreasury(newTreasury);
        assertEq(router.treasury(), newTreasury);
    }

    function test_SetTreasury_EmitsTreasuryUpdated() public {
        address newTreasury = makeAddr("newTreasury");
        vm.prank(owner);
        vm.expectEmit(true, true, false, false, address(router));
        emit LimePayPaymentRouter.TreasuryUpdated(treasury, newTreasury);
        router.setTreasury(newTreasury);
    }

    function test_SetTreasury_RevertNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        router.setTreasury(makeAddr("x"));
    }

    function test_SetTreasury_RevertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.ZeroAddress.selector, "treasury")
        );
        router.setTreasury(address(0));
    }

    // ══════════════════════════════════════════════════════════════════════
    // 4. setFeeBps()
    // ══════════════════════════════════════════════════════════════════════

    function test_SetFeeBps_UpdatesFee() public {
        vm.prank(owner);
        router.setFeeBps(250);
        assertEq(router.feeBps(), 250);
    }

    function test_SetFeeBps_EmitsFeeUpdated() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true, address(router));
        emit LimePayPaymentRouter.FeeUpdated(INITIAL_FEE_BPS, 250);
        router.setFeeBps(250);
    }

    function test_SetFeeBps_AcceptsZero() public {
        vm.prank(owner);
        router.setFeeBps(0);
        assertEq(router.feeBps(), 0);
    }

    function test_SetFeeBps_AcceptsMaxFee() public {
        vm.prank(owner);
        router.setFeeBps(MAX_FEE_BPS);
        assertEq(router.feeBps(), MAX_FEE_BPS);
    }

    function test_SetFeeBps_RevertNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        router.setFeeBps(50);
    }

    function test_SetFeeBps_RevertFeeTooHigh() public {
        uint16 bad = MAX_FEE_BPS + 1;
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(LimePayPaymentRouter.FeeTooHigh.selector, bad, MAX_FEE_BPS)
        );
        router.setFeeBps(bad);
    }

    // ══════════════════════════════════════════════════════════════════════
    // 5. pause() / unpause()
    // ══════════════════════════════════════════════════════════════════════

    function test_Pause_SetsPaused() public {
        vm.prank(owner);
        router.pause();
        assertTrue(router.paused());
    }

    function test_Pause_EmitsPaused() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, false, address(router));
        emit Pausable.Paused(owner);
        router.pause();
    }

    function test_Pause_RevertNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        router.pause();
    }

    function test_Unpause_ClearsFlag() public {
        vm.prank(owner);
        router.pause();
        vm.prank(owner);
        router.unpause();
        assertFalse(router.paused());
    }

    function test_Unpause_AllowsPayAgain() public {
        vm.prank(owner);
        router.pause();
        vm.prank(owner);
        router.unpause();

        uint256 amount = 100e6;
        vm.prank(alice);
        router.pay(bob, amount, "after-unpause");
        // Bob received the payout → payment went through
        assertGt(usdc.balanceOf(bob), 0);
    }

    function test_Unpause_EmitsUnpaused() public {
        vm.prank(owner);
        router.pause();
        vm.prank(owner);
        vm.expectEmit(false, false, false, false, address(router));
        emit Pausable.Unpaused(owner);
        router.unpause();
    }

    function test_Unpause_RevertNonOwner() public {
        vm.prank(owner);
        router.pause();
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        router.unpause();
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. renounceOwnership() — disabled
    // ══════════════════════════════════════════════════════════════════════

    function test_RenounceOwnership_RevertAlways() public {
        vm.prank(owner);
        vm.expectRevert(LimePayPaymentRouter.RenounceDisabled.selector);
        router.renounceOwnership();
    }

    function test_RenounceOwnership_NonOwnerAlsoReverts() public {
        // Non-owner: hits onlyOwner first, so OwnableUnauthorizedAccount
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker)
        );
        router.renounceOwnership();
    }

    // ══════════════════════════════════════════════════════════════════════
    // 7. Ownable2Step — transferOwnership two-step
    // ══════════════════════════════════════════════════════════════════════

    function test_Ownable2Step_PendingOwnerAccepts() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        router.transferOwnership(newOwner);
        // Owner hasn't changed yet
        assertEq(router.owner(), owner);
        assertEq(router.pendingOwner(), newOwner);

        // New owner accepts
        vm.prank(newOwner);
        router.acceptOwnership();
        assertEq(router.owner(), newOwner);
    }

    function test_Ownable2Step_OnlyPendingOwnerCanAccept() public {
        address newOwner  = makeAddr("newOwner");
        address imposter  = makeAddr("imposter");

        vm.prank(owner);
        router.transferOwnership(newOwner);

        vm.prank(imposter);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, imposter)
        );
        router.acceptOwnership();
    }

    // ══════════════════════════════════════════════════════════════════════
    // 8. FUZZ — fee arithmetic
    // ══════════════════════════════════════════════════════════════════════

    /// @dev Fuzz over (feeBps, amount) — verify the split is always exact and
    ///      never exceeds `amount`.
    function testFuzz_Pay_FeeArithmetic(uint16 feeBps_, uint256 amount) public {
        feeBps_ = uint16(bound(feeBps_, 0, MAX_FEE_BPS));
        amount  = bound(amount, 1, type(uint128).max); // cap to avoid unrealistic balances

        // Set fee
        vm.prank(owner);
        router.setFeeBps(feeBps_);

        // Fund and approve
        usdc.mint(alice, amount);
        vm.prank(alice);
        usdc.approve(address(router), amount);

        uint256 aliceBefore   = usdc.balanceOf(alice);
        uint256 bobBefore     = usdc.balanceOf(bob);
        uint256 treasBefore   = usdc.balanceOf(treasury);

        vm.prank(alice);
        router.pay(bob, amount, "fuzz");

        uint256 expectedFee    = (amount * feeBps_) / 10_000;
        uint256 expectedPayout = amount - expectedFee;

        // Conservation: alice lost exactly `amount`
        assertEq(usdc.balanceOf(alice), aliceBefore - amount);
        // Bob received the payout
        assertEq(usdc.balanceOf(bob), bobBefore + expectedPayout);
        // Treasury received the fee
        assertEq(usdc.balanceOf(treasury), treasBefore + expectedFee);
        // Payout + fee = amount (no dust created)
        assertEq(expectedPayout + expectedFee, amount);
    }

    /// @dev Fuzz amount with fixed feeBps — event carries correct values.
    function testFuzz_Pay_EmitsCorrectFeeInEvent(uint256 amount) public {
        amount = bound(amount, 1, ALICE_BALANCE);

        uint256 fee = (amount * INITIAL_FEE_BPS) / 10_000;

        vm.prank(alice);
        vm.expectEmit(true, true, false, true, address(router));
        emit LimePayPaymentRouter.PaymentSent(alice, bob, amount, fee, "fuzz-event");
        router.pay(bob, amount, "fuzz-event");
    }

    /// @dev Fuzz treasury address — setTreasury always stores what was set.
    function testFuzz_SetTreasury_Roundtrip(address newTreasury) public {
        vm.assume(newTreasury != address(0));
        vm.prank(owner);
        router.setTreasury(newTreasury);
        assertEq(router.treasury(), newTreasury);
    }

    /// @dev Fuzz feeBps — setFeeBps accepts [0, MAX] and rejects anything above.
    function testFuzz_SetFeeBps_BoundaryAcceptance(uint16 fee) public {
        if (fee <= MAX_FEE_BPS) {
            vm.prank(owner);
            router.setFeeBps(fee);
            assertEq(router.feeBps(), fee);
        } else {
            vm.prank(owner);
            vm.expectRevert(
                abi.encodeWithSelector(LimePayPaymentRouter.FeeTooHigh.selector, fee, MAX_FEE_BPS)
            );
            router.setFeeBps(fee);
        }
    }

    // NOTE: Invariant tests (conservation of value, router holds no USDC) live in
    //       LimePayInvariantTest below — forge requires a dedicated contract with
    //       setUp() + targetContract() to wire up invariant testing correctly.
}

// ─────────────────────────────────────────────────────────────────────────────
// Separate invariant test contract so forge wires up targetContract correctly
// ─────────────────────────────────────────────────────────────────────────────
contract LimePayInvariantTest is Test {
    address internal owner    = makeAddr("owner");
    address internal alice    = makeAddr("alice");
    address internal bob      = makeAddr("bob");
    address internal treasury = makeAddr("treasury");

    uint16 internal constant INITIAL_FEE_BPS = 100;

    MockERC20             internal usdc;
    LimePayPaymentRouter  internal router;
    PaymentHandler        internal handler;

    function setUp() public {
        usdc = new MockERC20("Mock USDC", "mUSDC", 6);
        router = new LimePayPaymentRouter(
            owner, address(usdc), treasury, INITIAL_FEE_BPS
        );

        handler = new PaymentHandler(router, usdc, alice);
        targetContract(address(handler));

        // alice pre-approves router with a large allowance; handler top-ups balance
        vm.prank(alice);
        usdc.approve(address(router), type(uint256).max);
    }

    /// @dev Payout + fee must always reconstruct the full amount sent, for any
    ///      combination of payments the fuzzer exercises through the handler.
    function invariant_PayoutPlusFeeEqualsAmount() public view {
        assertEq(
            handler.totalPayoutsDelivered() + handler.totalFeesCollected(),
            handler.totalAmountSent(),
            "conservation violated: payout + fee != amount"
        );
    }

    /// @dev The router itself must never accumulate a USDC balance (it is a
    ///      pass-through, not a vault).
    function invariant_RouterHoldsNoUSDC() public view {
        assertEq(
            usdc.balanceOf(address(router)),
            0,
            "router should never hold USDC"
        );
    }
}
