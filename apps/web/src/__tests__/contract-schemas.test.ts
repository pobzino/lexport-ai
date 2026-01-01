import { describe, it, expect } from "vitest";
import {
  JurisdictionEnum,
  ContractTypeEnum,
  ClauseTypeEnum,
  ClauseSchema,
  PartySchema,
  SignerSchema,
} from "@/lib/contracts/schemas";

describe("Contract Schemas", () => {
  describe("JurisdictionEnum", () => {
    it("should accept valid US jurisdictions", () => {
      expect(JurisdictionEnum.safeParse("us_california").success).toBe(true);
      expect(JurisdictionEnum.safeParse("us_texas").success).toBe(true);
      expect(JurisdictionEnum.safeParse("us_new_york").success).toBe(true);
    });

    it("should accept UK jurisdiction", () => {
      expect(JurisdictionEnum.safeParse("uk").success).toBe(true);
    });

    it("should reject invalid jurisdictions", () => {
      expect(JurisdictionEnum.safeParse("us_florida").success).toBe(false);
      expect(JurisdictionEnum.safeParse("canada").success).toBe(false);
      expect(JurisdictionEnum.safeParse("").success).toBe(false);
    });
  });

  describe("ContractTypeEnum", () => {
    it("should accept all valid contract types", () => {
      const validTypes = [
        "nda_mutual",
        "nda_one_way",
        "independent_contractor",
        "consulting_agreement",
        "safe_note",
        "freelance_service",
        "letter_of_intent",
        "cofounder_agreement",
        "sales_contract",
        "custom",
      ];

      validTypes.forEach((type) => {
        expect(ContractTypeEnum.safeParse(type).success).toBe(true);
      });
    });

    it("should reject invalid contract types", () => {
      expect(ContractTypeEnum.safeParse("invalid_type").success).toBe(false);
      expect(ContractTypeEnum.safeParse("").success).toBe(false);
    });
  });

  describe("ClauseTypeEnum", () => {
    it("should accept valid clause types", () => {
      expect(ClauseTypeEnum.safeParse("standard").success).toBe(true);
      expect(ClauseTypeEnum.safeParse("negotiable").success).toBe(true);
      expect(ClauseTypeEnum.safeParse("optional").success).toBe(true);
    });
  });

  describe("ClauseSchema", () => {
    it("should validate a complete clause", () => {
      const validClause = {
        id: "clause-1",
        title: "Confidentiality",
        content: "The parties agree to maintain confidentiality...",
        type: "standard",
        order: 1,
        isEdited: false,
      };

      const result = ClauseSchema.safeParse(validClause);
      expect(result.success).toBe(true);
    });

    it("should require all mandatory fields", () => {
      const incompleteClause = {
        id: "clause-1",
        // missing title, content, type, order
      };

      const result = ClauseSchema.safeParse(incompleteClause);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const clauseWithOptionals = {
        id: "clause-1",
        title: "Confidentiality",
        content: "The parties agree...",
        type: "negotiable",
        order: 1,
        isEdited: true,
        originalContent: "Original content...",
        notes: "Modified by user request",
      };

      const result = ClauseSchema.safeParse(clauseWithOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("PartySchema", () => {
    it("should validate a complete party", () => {
      const validParty = {
        name: "John Doe",
        email: "john@example.com",
        role: "client",
      };

      const result = PartySchema.safeParse(validParty);
      expect(result.success).toBe(true);
    });

    it("should require valid email", () => {
      const invalidParty = {
        name: "John Doe",
        email: "not-an-email",
        role: "client",
      };

      const result = PartySchema.safeParse(invalidParty);
      expect(result.success).toBe(false);
    });

    it("should require name", () => {
      const partyWithoutName = {
        name: "",
        email: "john@example.com",
        role: "client",
      };

      const result = PartySchema.safeParse(partyWithoutName);
      expect(result.success).toBe(false);
    });

    it("should accept all valid party roles", () => {
      const roles = [
        "discloser",
        "recipient",
        "client",
        "contractor",
        "consultant",
        "investor",
        "company",
        "cofounder",
        "seller",
        "buyer",
      ];

      roles.forEach((role) => {
        const party = {
          name: "Test Person",
          email: "test@example.com",
          role,
        };
        expect(PartySchema.safeParse(party).success).toBe(true);
      });
    });
  });

  describe("SignerSchema", () => {
    it("should validate a signer with required fields", () => {
      const validSigner = {
        id: "signer-1",
        name: "Jane Smith",
        email: "jane@example.com",
      };

      const result = SignerSchema.safeParse(validSigner);
      expect(result.success).toBe(true);
    });

    it("should accept optional title", () => {
      const signerWithTitle = {
        id: "signer-1",
        name: "Jane Smith",
        email: "jane@example.com",
        title: "CEO",
      };

      const result = SignerSchema.safeParse(signerWithTitle);
      expect(result.success).toBe(true);
    });
  });
});
