import { z } from "zod";
import {
  ContractTypeEnum,
  NDAMetadataSchema,
  ContractorMetadataSchema,
  ConsultingMetadataSchema,
  SAFEMetadataSchema,
  FreelanceMetadataSchema,
  LOIMetadataSchema,
  CofounderMetadataSchema,
  SalesContractMetadataSchema,
  CustomMetadataSchema,
  PaymentConfigSchema,
} from "./schemas";

export const GenerateContractRequestSchema = z.object({
  contractType: ContractTypeEnum,
  metadata: z.union([
    NDAMetadataSchema,
    ContractorMetadataSchema,
    ConsultingMetadataSchema,
    SAFEMetadataSchema,
    FreelanceMetadataSchema,
    LOIMetadataSchema,
    CofounderMetadataSchema,
    SalesContractMetadataSchema,
    CustomMetadataSchema,
  ]),
  paymentConfig: PaymentConfigSchema.optional(),
});

export type GenerateContractRequest = z.infer<typeof GenerateContractRequestSchema>;
