import { httpApi } from "./http";
import { mockApi } from "./mock/client";
import type { OliveApi } from "./types";

export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== "false";

export const api: OliveApi = USE_MOCKS ? mockApi : httpApi;

export { ApiError } from "./types";
export type { OliveApi } from "./types";
