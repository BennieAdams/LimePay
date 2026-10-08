// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LimePayPaymentRouter is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error ZeroAddress(string field);
    error FeeTooHigh(uint16 provided, uint16 maxBps);
    error InvalidAmount(uint256 provided);
    error RenounceDisabled();

    event PaymentSent(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 fee,
        string ref
    );
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);

    uint16 private constant MAX_FEE_BPS = 500;

    IERC20 private immutable _usdcToken;
    address private _treasury;
    uint16 private _feeBps;

    constructor(address initialOwner, address usdcToken_, address treasury_, uint16 feeBps_)
        Ownable(initialOwner)
    {
        // Note: zero initialOwner is already guarded by OZ's Ownable (OwnableInvalidOwner).
        if (usdcToken_ == address(0)) {
            revert ZeroAddress("usdcToken");
        }
        if (treasury_ == address(0)) {
            revert ZeroAddress("treasury");
        }
        if (feeBps_ > MAX_FEE_BPS) {
            revert FeeTooHigh(feeBps_, MAX_FEE_BPS);
        }

        _usdcToken = IERC20(usdcToken_);
        _treasury = treasury_;
        _feeBps = feeBps_;
    }

    function pay(address recipient, uint256 amount, string calldata ref)
        external
        nonReentrant
        whenNotPaused
    {
        if (recipient == address(0)) {
            revert ZeroAddress("recipient");
        }
        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        uint256 fee = (amount * _feeBps) / 10_000;
        uint256 payout = amount - fee;

        _usdcToken.safeTransferFrom(msg.sender, recipient, payout);

        if (fee > 0) {
            _usdcToken.safeTransferFrom(msg.sender, _treasury, fee);
        }

        emit PaymentSent(msg.sender, recipient, amount, fee, ref);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) {
            revert ZeroAddress("treasury");
        }

        address oldTreasury = _treasury;
        _treasury = newTreasury;

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function setFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) {
            revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        }

        uint16 oldFeeBps = _feeBps;
        _feeBps = newFeeBps;

        emit FeeUpdated(oldFeeBps, newFeeBps);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function renounceOwnership() public virtual override onlyOwner {
        revert RenounceDisabled();
    }

    function feeBps() external view returns (uint16) {
        return _feeBps;
    }

    function treasury() external view returns (address) {
        return _treasury;
    }

    function usdcToken() external view returns (address) {
        return address(_usdcToken);
    }
}
