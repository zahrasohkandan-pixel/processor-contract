// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

uint256 constant DEFAULT_MAX_RATE_INCREASE = 31709791984; // 2X per year

struct Subscription {
    uint256 amount;
    IERC20 token;
    uint32 interval;
    uint256 lastPaymentTime;
}

/// @title Processor Contract
/// @author ATLOS
/// @notice processes single and subscription payments in ERC20 tokens and native coins
/// @dev this contract is backward compatible with non-ERC20 compliant tokens, such as USDT
contract Processor is Ownable {
    event Payment(address indexed merchant, address indexed buyer, string orderId, uint256 amount, uint256 fee, address token, bool isRecurring);
    event Subscribed(address indexed merchant, address indexed buyer, string orderId, uint256 amount, uint256 fee, address token, uint32 interval);
    event Unsubscribed(address indexed merchant, address indexed buyer);

    uint256 public maxRateIncrease; // per second x 1e18
    address public admin;

    mapping(address => mapping(address => Subscription)) private subscriptions;
    address private newOwner;

    constructor() {
        maxRateIncrease = DEFAULT_MAX_RATE_INCREASE;
        admin = msg.sender;
    }

    /// @notice initiates a single payment in token
    /// @param merchant - merchant's wallet address
    /// @param orderId - order ID
    /// @param amount - payment amount
    /// @param fee - fee amount
    /// @param token - ERC20 token address
    function pay(address merchant, string memory orderId, uint256 amount, uint256 fee, IERC20 token) external {
        _pay(merchant, msg.sender, amount, fee, token);
        emit Payment(address(merchant), msg.sender, orderId, amount, fee, address(token), false);
    }

    /// @notice initiates a payment and creates a subscription
    /// @param merchant - merchant's wallet address
    /// @param orderId - order ID
    /// @param amount - payment amount
    /// @param fee - fee amount
    /// @param token - ERC20 token address
    /// @param interval - subscription interval in seconds
    function payAndSubscribe(address merchant, string memory orderId, uint256 amount, uint256 fee, IERC20 token, uint32 interval) external {
        subscriptions[merchant][msg.sender] = Subscription(amount, token, interval, block.timestamp);
        _pay(merchant, msg.sender, amount, fee, token);
        emit Subscribed(merchant, msg.sender, orderId, amount, fee, address(token), interval);
    }

    /// @notice cancels a subscription
    /// @param merchant - merchant's wallet address
    /// @param buyer - buyer's wallet address
    function unsubscribe(address merchant, address buyer) external {
        require(msg.sender == merchant || msg.sender == buyer, "Can only be called by merchant or buyer");

        Subscription storage subscription = subscriptions[merchant][buyer];
        require(subscription.amount != 0, "The subscription does not exist");

        subscription.amount = 0;
        emit Unsubscribed(merchant, buyer);
    }

    /// @notice looks up a subscription
    /// @param merchant - merchant's wallet address
    /// @param buyer - buyer's wallet address
    function getSubscription(address merchant, address buyer) external view returns (Subscription memory) {
        return subscriptions[merchant][buyer];
    }

    /// @notice initiates a payment for an existing subscription while checking the interval and the rate increase
    /// @param merchant - merchant's wallet address
    /// @param buyer - buyer's wallet address
    /// @param orderId - order ID
    /// @param amount - payment amount
    /// @param fee - fee amount
    function payForSubscription(address merchant, address buyer, string memory orderId, uint256 amount, uint256 fee) external {
        require(msg.sender == admin, "Can only be called by admin");

        Subscription storage subscription = subscriptions[merchant][buyer];
        require(subscription.amount != 0, "The subscription does not exist");

        require(subscription.lastPaymentTime + subscription.interval <= block.timestamp, "Recurring payment is too soon");

        require(amount <= subscription.amount + subscription.amount * (block.timestamp - subscription.lastPaymentTime) * maxRateIncrease / 1e18, "Amount is over the max rate increase");

        _pay(merchant, buyer, amount, fee, subscription.token);
        emit Payment(address(merchant), buyer, orderId, amount, fee, address(subscription.token), true);

        subscription.amount = amount;
        subscription.lastPaymentTime = block.timestamp;
    }

    /// @notice initiates a single payment in native coin
    /// @param merchant - merchant's wallet address
    /// @param orderId - order ID
    /// @param fee - fee amount
    function payNativeCoin(address merchant, string memory orderId, uint256 fee) external payable {
        require(fee < msg.value, "Amount must be greater than fee");

        if (0 < fee) payable(admin).transfer(fee);
        payable(merchant).transfer(msg.value - fee);

        emit Payment(address(merchant), msg.sender, orderId, msg.value, fee, address(0), false);
    }

    /// @notice changes the admin's address
    /// @param address - new admin's wallet address
    function changeAdmin(address newAddress) external onlyOwner {
        admin = newAddress;
    }

    /// @notice changes the maximum rate increase for subscriptions
    /// @param newMaxRateIncrease - new maximum rate increase
    function setMaxRateIncrease(uint256 newMaxRateIncrease) external onlyOwner {
        maxRateIncrease = newMaxRateIncrease;
    }

    /// @notice sends a payment in token
    /// @param merchant - merchant's wallet address
    /// @param buyer - buyer's wallet address
    /// @param amount - payment amount
    /// @param fee - fee amount
    /// @param token - ERC20 token address
    function _pay(address merchant, address buyer, uint256 amount, uint256 fee, IERC20 token) private {
        require(fee < amount, "Amount must be greater than fee");

        if (0 < fee) token.safeTransferFrom(buyer, admin, fee);
        token.safeTransferFrom(buyer, merchant, amount - fee);
    }
}
