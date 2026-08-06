/**
 * PII filtering for MCP server spans
 *
 * Removes network-level sensitive data when dataCollection.userInfo is false.
 * Input/output data (request arguments, tool/prompt results) is controlled
 * separately via recordInputs/recordOutputs options.
 */
import { SpanAttributeValue } from '../../types/span';
/**
 * Removes network PII attributes from span data when dataCollection.userInfo is false
 * @param spanData - Raw span attributes
 * @param userInfo - Whether to include user identity data (IP, port, resource URIs)
 * @returns Filtered span attributes
 */
export declare function filterMcpPiiFromSpanData(spanData: Record<string, unknown>, userInfo: boolean): Record<string, SpanAttributeValue>;
//# sourceMappingURL=piiFiltering.d.ts.map
