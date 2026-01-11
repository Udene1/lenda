# Project Overview: Lenda Protocol

Lenda is a decentralized lending protocol designed to bridge real-world asset (RWA) financing with DeFi liquidity. It allows institutional borrowers to create tranched lending pools that DeFi lenders (backers) can fund.

## 1. The Lenda Evolution
Lenda was born from a strategic fork of the **Goldfinch Protocol**, modernized and rebranded for a new era of institutional lending.
- **Simplified Core**: We removed complex tokenomics and governance layers (GFI) to focus on the core credit engine.
- **Modernized Stack**: Updated the protocol to use Solidity 0.8.x and latest OpenZeppelin upgradeable patterns.
- **Enhanced Security**: Integrated modern security practices like SafeERC20 and standardized AccessControl.
- **Institutional Focus**: The protocol is optimized for dedicated credit businesses, offering a streamlined onboarding and pool management experience.

## 2. Core Architecture
The protocol is built using a modular, proxy-based architecture, ensuring upgradeability and flexibility.

### Smart Contract Layer
- **`LendaConfig`**: The "Registry" of the protocol. It stores all contract addresses and protocol settings (like interest caps and leverage ratios).
- **`LendaFactory`**: The core factory used to deploy new Lending Pools and Borrower contracts.
- **`TranchedPool`**: The individual lending pool handling deposits, drawdowns, and repayments.
- **`UniqueIdentity` (UID)**: An on-chain KYC/Identity system using non-transferable ERC1155 tokens.
- **`SeniorPool` & `Fidu`**: A liquidity pool that provides passive, diversified yield by automatically allocating capital to senior tranches of individual pools.
- **`LendaToken` (LENDA)**: The core utility token for rewards and protocol participation.

### Security & Compliance
- **KYC Integration**: Lenda enforces strict compliance. Lenders must hold a valid `UniqueIdentity` token to participate.
- **Borrower Onboarding**: Only vetted borrowers are granted the `BORROWER_ROLE` required to launch pools on the factory.

## 3. How it Works (Core Flow)

### Step 1: Borrower Onboarding
A business is vetted and their address is whitelisted with the `BORROWER_ROLE` on the `LendaFactory`.

### Step 2: Launching a Pool
The borrower proposes a new facility via the dashboard, specifying the limit, interest APR, and repayment schedule.

### Step 3: Funding
Backers deposit USDC into the pool, receiving **Pool Tokens** (representing their claim) or provide passive liquidity via the **Senior Pool**.

### Step 4: Drawdown & Repayment
The borrower draws down capital to fund real-world operations and repays it (plus interest) back through the protocol.

## 4. Technical Stack
- **Frontend**: Next.js, TailwindCSS, Wagmi/Viem.
- **Smart Contracts**: Solidity 0.8.x, Hardhat, Ethers.js.
- **Network**: Base Sepolia (Testnet).

## 5. Deployment Records
The protocol is fully deployed on **Base Sepolia**. See [deployments-lenda-final.json](file:///c:/Users/HP/lenda/lenda-contracts/deployments-lenda-final.json) for the complete list of addresses.
