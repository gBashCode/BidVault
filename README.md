# BidVault Security & Architecture Updates

This document outlines the critical security patches and architectural changes implemented in the latest commit to harden the BidVault platform.

## 1. Cryptographic Security Enhancements
- **PBKDF2 Iteration Upgrade**: Increased key derivation iterations to `600,000` (aligning with OWASP 2026 standards) to ensure robust protection against brute-force attacks.
- **Client-Side Document Encryption**: Implemented true binary-to-Base64 encryption for technical annex files within the encrypted bid blob, ensuring no plaintext data ever touches the network.
- **Zero-Knowledge Key Custody**: Replaced false "Shamir's Secret Sharing" marketing copy with an honest, fully implemented **Bid Receipt** system. Vendors now download a `BidReceipt.json` containing their cryptographic salt upon submission, which they must re-upload during the reveal phase.

## 2. API Backend Hardening (The "Solve All" Patch)
Resolved 5 critical backend vulnerabilities:
- **Multiple Active Bids Bypass**: Enforced strict chronological sorting (`orderBy: { submittedAt: 'desc' }`) on the active bid checker to prevent vendors from spamming the engine with withdrawn/resubmitted bids.
- **Webhook SSRF Protection**: Fortified webhook deliveries against Server-Side Request Forgery by explicitly setting `redirect: "manual"` and strictly blocking AWS internal metadata (`169.254.169.254`) in the IP validator.
- **IDOR / Data Integrity**: Removed arbitrary `encryptedBlob` update logic from the `confirm-upload` route. The system now strictly relies on the locked S3 URL generated during the initial authenticated bid creation.
- **Denial-of-Service (DoS)**: Removed heavy cryptographic database insertions from the JWT verification catch block. Unauthenticated spam now receives a lightweight 401 response without degrading database performance.
- **Pre-Reveal Metadata Exposure**: Patched the tender fetching logic to strictly strip the `bids` array from the response until the exact `REVEALED` status is reached, ensuring 100% blind integrity for all roles.

## 3. Database Architecture Transition
- **Removed the Sandbox Mock DB**: Completely stripped out the in-memory `mockDb` fallback array and the dynamic proxy wrapper from the Prisma client (`packages/db/src/client.ts`).
- **Persistent PostgreSQL**: The system now connects strictly to the persistent PostgreSQL database (`sealedbid-postgres`), ensuring data durability and strict relational integrity moving forward.
