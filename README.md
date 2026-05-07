# Lenda Protocol 🚀

**Institutional-Grade DeFi Lending on Base.**

Lenda is a decentralized lending protocol designed to bridge real-world asset (RWA) financing with DeFi liquidity. It enables institutional borrowers to create tranched lending pools that DeFi lenders (backers) can fund with transparency and security.

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployment-black?style=flat&logo=vercel)](https://lenda-protocol.vercel.app/)
[![Network: Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-blue?style=flat)](https://sepolia.basescan.org/)

---

## 🏗 Project Structure

The Lenda Protocol consists of three primary components:

### 1. [Lenda Contracts](./lenda-contracts)
The core smart contract engine, modernized and rebranded for institutional credit.
- **Language:** Solidity 0.8.x
- **Framework:** Hardhat
- **Network:** Base Sepolia
- **Key Features:** Tranched lending pools, Senior Pool liquidity, Upgradeable Proxies, and SafeERC20 integration.

### 2. [Lenda Frontend](./lenda-frontend)
A premium institutional dashboard for borrowers, lenders, and protocol management.
- **Framework:** Next.js 15 (React 18)
- **Styling:** Tailwind CSS + Framer Motion (Glassmorphism UI)
- **Web3:** Wagmi + ConnectKit + Viem
- **Deployment:** [Vercel](https://lenda-protocol.vercel.app/)

### 3. [Lenda KYC Service](./lenda-kyc)
A standalone signing service for on-chain KYC/KYB attestations.
- **Language:** Python
- **Framework:** Flask (Vercel Serverless)
- **Role:** Digitally signs attestations for the `UniqueIdentity` (UID) contract.

---

## 🌟 Key Features

- **Tranched Lending:** Flexible capital structures with Junior and Senior tranches.
- **Passive Yield:** Rebranded **Senior Pool** (Fidu) for automated, diversified lending.
- **RWA Transparency:** Integrated borrower profiles with public document (IPFS) uploads.
- **Non-Transferable Identity:** Privacy-preserving KYC using non-transferable ERC1155 tokens.
- **Premium UX:** High-fidelity, liquid-designed dashboard for professional financial operations.

---

## 🚀 Getting Started

To get started with development, follow the instructions in each respective directory:

1. **Smart Contracts:**
   ```bash
   cd lenda-contracts
   npm install
   npx hardhat test
   ```

2. **Frontend:**
   ```bash
   cd lenda-frontend
   npm install
   npm run dev
   ```

3. **KYC Service:**
   ```bash
   cd lenda-kyc
   pip install -r requirements.txt
   python api/index.py
   ```

---

## 📡 Deployment Information

- **Frontend URL:** [https://lenda-protocol.vercel.app/](https://lenda-protocol.vercel.app/)
- **Network:** Base Sepolia (Chain ID: `84532`)
- **Core Contracts:** See [lenda-contracts/deployments-lenda-final.json](./lenda-contracts/deployments-lenda-final.json) for the full registry of deployed addresses.

---

## 📄 License
This project is for demonstration and development purposes as part of the Lenda Protocol modernization initiative.
