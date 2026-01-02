// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-v5/access/Ownable.sol";

/**
 * @title BorrowerProfile
 * @author Lenda Protocol
 * @notice Allows borrowers to optionally share public documents for lender transparency.
 * @dev Documents are stored as IPFS CIDs. All uploaded documents are publicly viewable.
 */
contract BorrowerProfile is Ownable {
    /// @notice Document types that borrowers can upload
    enum DocumentType {
        INCOME_STATEMENT,
        BANK_STATEMENT,
        BUSINESS_REGISTRATION,
        CREDIT_REPORT,
        COLLATERAL_PROOF,
        OTHER
    }

    /// @notice Structure for a single document
    struct Document {
        string ipfsCid;           // IPFS content identifier
        DocumentType docType;     // Type of document
        string description;       // Brief description
        uint256 uploadedAt;       // Timestamp
    }

    /// @notice Structure for a borrower's profile
    struct Profile {
        string name;              // Business/individual name
        string description;       // About the borrower
        string website;           // Optional website
        string contactEmail;      // Contact email (optional)
        uint256 createdAt;        // Profile creation time
        uint256 updatedAt;        // Last update time
        bool isVerified;          // Protocol verification status
    }

    /// @notice Mapping of borrower address to their profile
    mapping(address => Profile) public profiles;

    /// @notice Mapping of borrower address to their documents
    mapping(address => Document[]) public borrowerDocuments;

    /// @notice Tracks if an address has created a profile
    mapping(address => bool) public hasProfile;

    /// @notice Emitted when a profile is created
    event ProfileCreated(address indexed borrower, string name);

    /// @notice Emitted when a profile is updated
    event ProfileUpdated(address indexed borrower);

    /// @notice Emitted when a document is uploaded
    event DocumentUploaded(
        address indexed borrower,
        uint256 indexed documentIndex,
        DocumentType docType,
        string ipfsCid
    );

    /// @notice Emitted when a document is removed
    event DocumentRemoved(address indexed borrower, uint256 indexed documentIndex);

    /// @notice Emitted when verification status changes
    event VerificationStatusChanged(address indexed borrower, bool isVerified);

    error ProfileAlreadyExists();
    error ProfileDoesNotExist();
    error InvalidDocumentIndex();
    error EmptyName();

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ============ BORROWER FUNCTIONS ============

    /**
     * @notice Creates a new borrower profile
     * @param name Business or individual name
     * @param description About the borrower
     * @param website Optional website URL
     * @param contactEmail Optional contact email
     */
    function createProfile(
        string calldata name,
        string calldata description,
        string calldata website,
        string calldata contactEmail
    ) external {
        if (hasProfile[msg.sender]) revert ProfileAlreadyExists();
        if (bytes(name).length == 0) revert EmptyName();

        profiles[msg.sender] = Profile({
            name: name,
            description: description,
            website: website,
            contactEmail: contactEmail,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            isVerified: false
        });

        hasProfile[msg.sender] = true;
        emit ProfileCreated(msg.sender, name);
    }

    /**
     * @notice Updates an existing profile
     */
    function updateProfile(
        string calldata name,
        string calldata description,
        string calldata website,
        string calldata contactEmail
    ) external {
        if (!hasProfile[msg.sender]) revert ProfileDoesNotExist();
        if (bytes(name).length == 0) revert EmptyName();

        Profile storage profile = profiles[msg.sender];
        profile.name = name;
        profile.description = description;
        profile.website = website;
        profile.contactEmail = contactEmail;
        profile.updatedAt = block.timestamp;

        emit ProfileUpdated(msg.sender);
    }

    /**
     * @notice Uploads a document to the borrower's profile
     * @param ipfsCid IPFS content identifier for the document
     * @param docType Type of document
     * @param description Brief description of the document
     */
    function uploadDocument(
        string calldata ipfsCid,
        DocumentType docType,
        string calldata description
    ) external {
        if (!hasProfile[msg.sender]) revert ProfileDoesNotExist();

        borrowerDocuments[msg.sender].push(Document({
            ipfsCid: ipfsCid,
            docType: docType,
            description: description,
            uploadedAt: block.timestamp
        }));

        uint256 docIndex = borrowerDocuments[msg.sender].length - 1;
        emit DocumentUploaded(msg.sender, docIndex, docType, ipfsCid);
    }

    /**
     * @notice Removes a document from the borrower's profile
     * @param documentIndex Index of the document to remove
     */
    function removeDocument(uint256 documentIndex) external {
        Document[] storage docs = borrowerDocuments[msg.sender];
        if (documentIndex >= docs.length) revert InvalidDocumentIndex();

        // Move last element to deleted position and pop
        docs[documentIndex] = docs[docs.length - 1];
        docs.pop();

        emit DocumentRemoved(msg.sender, documentIndex);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Sets the verification status of a borrower (admin only)
     * @param borrower Address of the borrower
     * @param verified Verification status
     */
    function setVerificationStatus(address borrower, bool verified) external onlyOwner {
        if (!hasProfile[borrower]) revert ProfileDoesNotExist();
        profiles[borrower].isVerified = verified;
        emit VerificationStatusChanged(borrower, verified);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Gets a borrower's profile
     * @param borrower Address of the borrower
     * @return Profile struct
     */
    function getProfile(address borrower) external view returns (Profile memory) {
        return profiles[borrower];
    }

    /**
     * @notice Gets all documents for a borrower
     * @param borrower Address of the borrower
     * @return Array of Document structs
     */
    function getDocuments(address borrower) external view returns (Document[] memory) {
        return borrowerDocuments[borrower];
    }

    /**
     * @notice Gets the number of documents a borrower has uploaded
     * @param borrower Address of the borrower
     * @return Number of documents
     */
    function getDocumentCount(address borrower) external view returns (uint256) {
        return borrowerDocuments[borrower].length;
    }

    /**
     * @notice Gets a specific document
     * @param borrower Address of the borrower
     * @param index Document index
     * @return Document struct
     */
    function getDocument(address borrower, uint256 index) external view returns (Document memory) {
        if (index >= borrowerDocuments[borrower].length) revert InvalidDocumentIndex();
        return borrowerDocuments[borrower][index];
    }
}
