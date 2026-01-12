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
import type * as chatHelpers from "../chatHelpers.js";
import type * as conversations from "../conversations.js";
import type * as files from "../files.js";
import type * as messages from "../messages.js";
import type * as migrations_addRoleToExistingUsers from "../migrations/addRoleToExistingUsers.js";
import type * as migrations_fix13TahapReference from "../migrations/fix13TahapReference.js";
import type * as migrations_fixAgentPersonaAndCapabilities from "../migrations/fixAgentPersonaAndCapabilities.js";
import type * as migrations_removeOldPaperWorkflowSection from "../migrations/removeOldPaperWorkflowSection.js";
import type * as migrations_seedDefaultAIConfig from "../migrations/seedDefaultAIConfig.js";
import type * as migrations_seedDefaultStyleConstitution from "../migrations/seedDefaultStyleConstitution.js";
import type * as migrations_seedDefaultSystemPrompt from "../migrations/seedDefaultSystemPrompt.js";
import type * as migrations_updateAIConfigForToolCalling from "../migrations/updateAIConfigForToolCalling.js";
import type * as migrations_updatePromptWithArtifactGuidelines from "../migrations/updatePromptWithArtifactGuidelines.js";
import type * as migrations_updatePromptWithPaperWorkflow from "../migrations/updatePromptWithPaperWorkflow.js";
import type * as migrations_updateToGPT4oForToolCalling from "../migrations/updateToGPT4oForToolCalling.js";
import type * as paperSessions from "../paperSessions.js";
import type * as paperSessions_constants from "../paperSessions/constants.js";
import type * as paperSessions_types from "../paperSessions/types.js";
import type * as papers from "../papers.js";
import type * as permissions from "../permissions.js";
import type * as styleConstitutions from "../styleConstitutions.js";
import type * as systemAlerts from "../systemAlerts.js";
import type * as systemPrompts from "../systemPrompts.js";
import type * as users from "../users.js";

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
  chatHelpers: typeof chatHelpers;
  conversations: typeof conversations;
  files: typeof files;
  messages: typeof messages;
  "migrations/addRoleToExistingUsers": typeof migrations_addRoleToExistingUsers;
  "migrations/fix13TahapReference": typeof migrations_fix13TahapReference;
  "migrations/fixAgentPersonaAndCapabilities": typeof migrations_fixAgentPersonaAndCapabilities;
  "migrations/removeOldPaperWorkflowSection": typeof migrations_removeOldPaperWorkflowSection;
  "migrations/seedDefaultAIConfig": typeof migrations_seedDefaultAIConfig;
  "migrations/seedDefaultStyleConstitution": typeof migrations_seedDefaultStyleConstitution;
  "migrations/seedDefaultSystemPrompt": typeof migrations_seedDefaultSystemPrompt;
  "migrations/updateAIConfigForToolCalling": typeof migrations_updateAIConfigForToolCalling;
  "migrations/updatePromptWithArtifactGuidelines": typeof migrations_updatePromptWithArtifactGuidelines;
  "migrations/updatePromptWithPaperWorkflow": typeof migrations_updatePromptWithPaperWorkflow;
  "migrations/updateToGPT4oForToolCalling": typeof migrations_updateToGPT4oForToolCalling;
  paperSessions: typeof paperSessions;
  "paperSessions/constants": typeof paperSessions_constants;
  "paperSessions/types": typeof paperSessions_types;
  papers: typeof papers;
  permissions: typeof permissions;
  styleConstitutions: typeof styleConstitutions;
  systemAlerts: typeof systemAlerts;
  systemPrompts: typeof systemPrompts;
  users: typeof users;
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
