/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminManualUserCreation from "../adminManualUserCreation.js";
import type * as adminUserManagement from "../adminUserManagement.js";
import type * as aiProviderConfigs from "../aiProviderConfigs.js";
import type * as artifacts from "../artifacts.js";
import type * as auth from "../auth.js";
import type * as billing_constants from "../billing/constants.js";
import type * as billing_credits from "../billing/credits.js";
import type * as billing_index from "../billing/index.js";
import type * as billing_payments from "../billing/payments.js";
import type * as billing_quotas from "../billing/quotas.js";
import type * as billing_subscriptions from "../billing/subscriptions.js";
import type * as billing_usage from "../billing/usage.js";
import type * as blog from "../blog.js";
import type * as chatHelpers from "../chatHelpers.js";
import type * as conversations from "../conversations.js";
import type * as documentationSections from "../documentationSections.js";
import type * as files from "../files.js";
import type * as messages from "../messages.js";
import type * as migrations_addRoleToExistingUsers from "../migrations/addRoleToExistingUsers.js";
import type * as migrations_backfillCreditBalances from "../migrations/backfillCreditBalances.js";
import type * as migrations_backfillProviderKeys from "../migrations/backfillProviderKeys.js";
import type * as migrations_backfillWorkingTitle from "../migrations/backfillWorkingTitle.js";
import type * as migrations_fix13TahapReference from "../migrations/fix13TahapReference.js";
import type * as migrations_fixAgentPersonaAndCapabilities from "../migrations/fixAgentPersonaAndCapabilities.js";
import type * as migrations_reconcileClerkUsers from "../migrations/reconcileClerkUsers.js";
import type * as migrations_removeOldPaperWorkflowSection from "../migrations/removeOldPaperWorkflowSection.js";
import type * as migrations_seedDefaultAIConfig from "../migrations/seedDefaultAIConfig.js";
import type * as migrations_seedDefaultStyleConstitution from "../migrations/seedDefaultStyleConstitution.js";
import type * as migrations_seedDefaultSystemPrompt from "../migrations/seedDefaultSystemPrompt.js";
import type * as migrations_seedDocumentationSections from "../migrations/seedDocumentationSections.js";
import type * as migrations_seedPricingPlans from "../migrations/seedPricingPlans.js";
import type * as migrations_updateAIConfigForToolCalling from "../migrations/updateAIConfigForToolCalling.js";
import type * as migrations_updatePromptWithArtifactGuidelines from "../migrations/updatePromptWithArtifactGuidelines.js";
import type * as migrations_updatePromptWithArtifactSources from "../migrations/updatePromptWithArtifactSources.js";
import type * as migrations_updatePromptWithPaperWorkflow from "../migrations/updatePromptWithPaperWorkflow.js";
import type * as migrations_updateToGPT4oForToolCalling from "../migrations/updateToGPT4oForToolCalling.js";
import type * as paperSessions from "../paperSessions.js";
import type * as paperSessions_constants from "../paperSessions/constants.js";
import type * as paperSessions_types from "../paperSessions/types.js";
import type * as papers from "../papers.js";
import type * as permissions from "../permissions.js";
import type * as pricingPlans from "../pricingPlans.js";
import type * as styleConstitutions from "../styleConstitutions.js";
import type * as systemAlerts from "../systemAlerts.js";
import type * as systemPrompts from "../systemPrompts.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminManualUserCreation: typeof adminManualUserCreation;
  adminUserManagement: typeof adminUserManagement;
  aiProviderConfigs: typeof aiProviderConfigs;
  artifacts: typeof artifacts;
  auth: typeof auth;
  "billing/constants": typeof billing_constants;
  "billing/credits": typeof billing_credits;
  "billing/index": typeof billing_index;
  "billing/payments": typeof billing_payments;
  "billing/quotas": typeof billing_quotas;
  "billing/subscriptions": typeof billing_subscriptions;
  "billing/usage": typeof billing_usage;
  blog: typeof blog;
  chatHelpers: typeof chatHelpers;
  conversations: typeof conversations;
  documentationSections: typeof documentationSections;
  files: typeof files;
  messages: typeof messages;
  "migrations/addRoleToExistingUsers": typeof migrations_addRoleToExistingUsers;
  "migrations/backfillCreditBalances": typeof migrations_backfillCreditBalances;
  "migrations/backfillProviderKeys": typeof migrations_backfillProviderKeys;
  "migrations/backfillWorkingTitle": typeof migrations_backfillWorkingTitle;
  "migrations/fix13TahapReference": typeof migrations_fix13TahapReference;
  "migrations/fixAgentPersonaAndCapabilities": typeof migrations_fixAgentPersonaAndCapabilities;
  "migrations/reconcileClerkUsers": typeof migrations_reconcileClerkUsers;
  "migrations/removeOldPaperWorkflowSection": typeof migrations_removeOldPaperWorkflowSection;
  "migrations/seedDefaultAIConfig": typeof migrations_seedDefaultAIConfig;
  "migrations/seedDefaultStyleConstitution": typeof migrations_seedDefaultStyleConstitution;
  "migrations/seedDefaultSystemPrompt": typeof migrations_seedDefaultSystemPrompt;
  "migrations/seedDocumentationSections": typeof migrations_seedDocumentationSections;
  "migrations/seedPricingPlans": typeof migrations_seedPricingPlans;
  "migrations/updateAIConfigForToolCalling": typeof migrations_updateAIConfigForToolCalling;
  "migrations/updatePromptWithArtifactGuidelines": typeof migrations_updatePromptWithArtifactGuidelines;
  "migrations/updatePromptWithArtifactSources": typeof migrations_updatePromptWithArtifactSources;
  "migrations/updatePromptWithPaperWorkflow": typeof migrations_updatePromptWithPaperWorkflow;
  "migrations/updateToGPT4oForToolCalling": typeof migrations_updateToGPT4oForToolCalling;
  paperSessions: typeof paperSessions;
  "paperSessions/constants": typeof paperSessions_constants;
  "paperSessions/types": typeof paperSessions_types;
  papers: typeof papers;
  permissions: typeof permissions;
  pricingPlans: typeof pricingPlans;
  styleConstitutions: typeof styleConstitutions;
  systemAlerts: typeof systemAlerts;
  systemPrompts: typeof systemPrompts;
  users: typeof users;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
