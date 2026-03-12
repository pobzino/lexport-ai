/**
 * Swagger/OpenAPI Configuration
 *
 * Centralized OpenAPI specification for all Lexport API endpoints.
 */

import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Lexport API",
        version: "1.0.0",
        description: `
# Lexport API Documentation

Lexport is an AI-powered legal platform for creating, managing, and signing contracts.

## Authentication

Most endpoints require authentication via Supabase Auth. Include the session cookie or Bearer token in your requests.

## Rate Limiting

API requests are rate limited. See individual endpoint documentation for specific limits.

## Error Responses

All endpoints return consistent error responses:
- \`400\` - Bad Request (invalid input)
- \`401\` - Unauthorized (missing or invalid auth)
- \`403\` - Forbidden (insufficient permissions)
- \`404\` - Not Found
- \`500\` - Internal Server Error
        `,
        contact: {
          name: "Lexport Support",
          email: "support@lexportai.com",
        },
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          description: "Current environment",
        },
      ],
      tags: [
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Account", description: "User account management" },
        { name: "Profile", description: "User profile operations" },
        { name: "Contracts", description: "Contract CRUD and management" },
        { name: "Contract AI", description: "AI-powered contract operations" },
        { name: "Contract Versions", description: "Version history and rollback" },
        { name: "Contract Comments", description: "Inline comments and collaboration" },
        { name: "Contract Fields", description: "Signature fields management" },
        { name: "Signatures", description: "E-signature operations" },
        { name: "Payments", description: "Payment processing" },
        { name: "Invoices", description: "Invoice management" },
        { name: "Templates", description: "Contract templates" },
        { name: "Field Templates", description: "Reusable field configurations" },
        { name: "Contacts", description: "Contact management" },
        { name: "Folders", description: "Folder organization" },
        { name: "Tags", description: "Tag management" },
        { name: "Organizations", description: "Team and organization management" },
        { name: "Notifications", description: "User notifications" },
        { name: "Activity", description: "Activity feed" },
        { name: "Portal", description: "Client portal endpoints" },
        { name: "Webhooks", description: "Webhook handlers" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Supabase JWT token",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "sb-access-token",
            description: "Supabase session cookie",
          },
        },
        schemas: {
          // Common schemas
          Error: {
            type: "object",
            properties: {
              error: { type: "string", description: "Error message" },
            },
            required: ["error"],
          },
          Success: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          Pagination: {
            type: "object",
            properties: {
              page: { type: "integer", minimum: 1 },
              limit: { type: "integer", minimum: 1, maximum: 100 },
              total: { type: "integer" },
              hasMore: { type: "boolean" },
            },
          },

          // User schemas
          User: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              full_name: { type: "string" },
              avatar_url: { type: "string", format: "uri" },
              created_at: { type: "string", format: "date-time" },
            },
          },
          Profile: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              full_name: { type: "string" },
              company_name: { type: "string" },
              phone: { type: "string" },
              address: { type: "string" },
              timezone: { type: "string" },
              stripe_customer_id: { type: "string" },
              stripe_connect_account_id: { type: "string" },
            },
          },

          // Contract schemas
          Contract: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              title: { type: "string" },
              contract_type: {
                type: "string",
                enum: ["nda_mutual", "nda_one_way", "contractor", "consulting", "safe_note", "freelance", "custom"],
              },
              status: {
                type: "string",
                enum: ["draft", "pending", "signed", "expired", "cancelled"],
              },
              jurisdiction: { type: "string" },
              content: { type: "object", description: "Structured contract content" },
              version: { type: "integer" },
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" },
              expires_at: { type: "string", format: "date-time" },
              folder_id: { type: "string", format: "uuid" },
            },
          },
          ContractInput: {
            type: "object",
            properties: {
              title: { type: "string" },
              contract_type: { type: "string" },
              jurisdiction: { type: "string" },
              content: { type: "object" },
              folder_id: { type: "string", format: "uuid" },
            },
            required: ["title"],
          },
          ContractClause: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              type: { type: "string", enum: ["standard", "custom", "optional"] },
            },
          },

          // Signature schemas
          Signature: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              contract_id: { type: "string", format: "uuid" },
              signer_email: { type: "string", format: "email" },
              signer_name: { type: "string" },
              status: {
                type: "string",
                enum: ["pending", "viewed", "signed", "declined"],
              },
              signed_at: { type: "string", format: "date-time" },
              ip_address: { type: "string" },
              user_agent: { type: "string" },
            },
          },
          SignatureField: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              type: {
                type: "string",
                enum: ["signature", "initials", "date", "text", "checkbox", "dropdown", "attachment", "payment"],
              },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              page: { type: "integer" },
              required: { type: "boolean" },
              signer_id: { type: "string", format: "uuid" },
            },
          },

          // Invoice schemas
          Invoice: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              contract_id: { type: "string", format: "uuid" },
              invoice_number: { type: "string" },
              status: {
                type: "string",
                enum: ["draft", "sent", "paid", "overdue", "cancelled"],
              },
              amount: { type: "number" },
              currency: { type: "string" },
              due_date: { type: "string", format: "date" },
              line_items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    description: { type: "string" },
                    quantity: { type: "number" },
                    unit_price: { type: "number" },
                    amount: { type: "number" },
                  },
                },
              },
            },
          },

          // Comment schemas
          Comment: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              contract_id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              content: { type: "string" },
              clause_id: { type: "string" },
              selection_start: { type: "integer" },
              selection_end: { type: "integer" },
              selected_text: { type: "string" },
              resolved: { type: "boolean" },
              created_at: { type: "string", format: "date-time" },
            },
          },

          // Template schemas
          Template: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              name: { type: "string" },
              description: { type: "string" },
              contract_type: { type: "string" },
              content: { type: "object" },
              is_public: { type: "boolean" },
              usage_count: { type: "integer" },
              created_at: { type: "string", format: "date-time" },
            },
          },

          // Folder schemas
          Folder: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              name: { type: "string" },
              parent_id: { type: "string", format: "uuid" },
              color: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },

          // Contact schemas
          Contact: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              name: { type: "string" },
              company: { type: "string" },
              phone: { type: "string" },
              notes: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },

          // Tag schemas
          Tag: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              name: { type: "string" },
              color: { type: "string" },
            },
          },

          // Organization schemas
          Organization: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              slug: { type: "string" },
              owner_id: { type: "string", format: "uuid" },
              created_at: { type: "string", format: "date-time" },
            },
          },
          OrganizationMember: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              organization_id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              role: {
                type: "string",
                enum: ["owner", "admin", "member"],
              },
              joined_at: { type: "string", format: "date-time" },
            },
          },

          // Notification schemas
          Notification: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              type: { type: "string" },
              title: { type: "string" },
              message: { type: "string" },
              read: { type: "boolean" },
              data: { type: "object" },
              created_at: { type: "string", format: "date-time" },
            },
          },

          // Activity schemas
          Activity: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              user_id: { type: "string", format: "uuid" },
              action: { type: "string" },
              entity_type: { type: "string" },
              entity_id: { type: "string", format: "uuid" },
              metadata: { type: "object" },
              created_at: { type: "string", format: "date-time" },
            },
          },

          // Risk Analysis schemas
          RiskAnalysis: {
            type: "object",
            properties: {
              overallRiskLevel: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
              overallSummary: { type: "string" },
              clauseRisks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    clauseId: { type: "string" },
                    clauseTitle: { type: "string" },
                    severity: { type: "string", enum: ["info", "warning", "critical"] },
                    category: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    suggestion: { type: "string" },
                  },
                },
              },
              missingProtections: { type: "array", items: { type: "object" } },
              jurisdictionAlerts: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      paths: {},
    },
  });

  return spec;
};
