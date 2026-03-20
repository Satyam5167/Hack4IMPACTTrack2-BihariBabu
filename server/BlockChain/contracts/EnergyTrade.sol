// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EnergyTrade {

    struct Trade {
        address seller;
        address buyer;
        uint units;
        uint priceINR;
        uint ethAmount;
        uint timestamp;
    }

    Trade[] public trades;

    event TradeExecuted(
        address indexed seller,
        address indexed buyer,
        uint units,
        uint priceINR,
        uint ethAmount,
        uint timestamp
    );

    // executeTrade accepts ETH (msg.value) and forwards it directly to the seller
    function executeTrade(
        address payable _seller,
        address _buyer,
        uint _units,
        uint _priceINR
    ) public payable {
        
        // Require that some ETH is sent (the frontend will calculate the exact amount)
        require(msg.value > 0, "Amount must be greater than 0");
        require(_seller != _buyer, "Cannot buy your own energy");

        // Forward the ETH securely to the seller
        (bool sent, ) = _seller.call{value: msg.value}("");
        require(sent, "Failed to send ETH to seller");

        // Record the trade on-chain
        trades.push(Trade(
            _seller,
            _buyer, // Use the provided buyer address for records
            _units,
            _priceINR,
            msg.value,
            block.timestamp
        ));

        emit TradeExecuted(
            _seller,
            _buyer,
            _units,
            _priceINR,
            msg.value,
            block.timestamp
        );
    }

    function getTrades() public view returns (Trade[] memory) {
        return trades;
    }
}
