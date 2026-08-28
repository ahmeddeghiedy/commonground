/** JSON Schema descriptor accepted by registerTool. */
export interface WebMCPJsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties: false;
  [k: string]: unknown;
}

export interface WebMCPToolAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
}

export interface WebMCPToolDefinition<A = unknown> {
  name: string;
  title?: string;
  description: string;
  inputSchema: WebMCPJsonSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (
    args: A,
    options: { signal: AbortSignal }
  ) => Promise<unknown> | unknown;
}

export interface WebMCPRegistrationOptions {
  signal?: AbortSignal;
}

export interface WebMCPModelContext {
  registerTool<A = unknown>(
    tool: WebMCPToolDefinition<A>,
    options?: WebMCPRegistrationOptions
  ): Promise<void>;
}

declare global {
  interface Document {
    /** W3C WebMCP (experimental). Undefined when the browser/agent does not support it. */
    modelContext?: WebMCPModelContext;
  }

  interface Navigator {
    /**
     * @deprecated Legacy pre-standard alias. Isolated here for deprecated-compatibility only;
     * the hook prefers document.modelContext per the current W3C API name.
     */
    modelContext?: WebMCPModelContext;
  }
}
