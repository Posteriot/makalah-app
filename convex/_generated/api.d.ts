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
import type * as migrations_seedDefaultAIConfig from "../migrations/seedDefaultAIConfig.js";
import type * as migrations_seedDefaultSystemPrompt from "../migrations/seedDefaultSystemPrompt.js";
import type * as migrations_updateAIConfigForToolCalling from "../migrations/updateAIConfigForToolCalling.js";
import type * as migrations_updatePromptWithArtifactGuidelines from "../migrations/updatePromptWithArtifactGuidelines.js";
import type * as migrations_updateToGPT4oForToolCalling from "../migrations/updateToGPT4oForToolCalling.js";
import type * as papers from "../papers.js";
import type * as permissions from "../permissions.js";
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
  "migrations/seedDefaultAIConfig": typeof migrations_seedDefaultAIConfig;
  "migrations/seedDefaultSystemPrompt": typeof migrations_seedDefaultSystemPrompt;
  "migrations/updateAIConfigForToolCalling": typeof migrations_updateAIConfigForToolCalling;
  "migrations/updatePromptWithArtifactGuidelines": typeof migrations_updatePromptWithArtifactGuidelines;
  "migrations/updateToGPT4oForToolCalling": typeof migrations_updateToGPT4oForToolCalling;
  papers: typeof papers;
  permissions: typeof permissions;
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
