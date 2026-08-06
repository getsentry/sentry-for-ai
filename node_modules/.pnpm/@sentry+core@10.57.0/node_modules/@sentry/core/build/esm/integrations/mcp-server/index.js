import { getClient } from '../../currentScopes.js';
import { fill } from '../../utils/object.js';
import { wrapAllMCPHandlers, wrapExistingHandlers } from './handlers.js';
import { wrapTransportOnMessage, wrapTransportSend, wrapTransportOnClose, wrapTransportError } from './transport.js';
import { validateMcpServerInstance } from './validation.js';

const wrappedMcpServerInstances = /* @__PURE__ */ new WeakSet();
function wrapMcpServerWithSentry(mcpServerInstance, options) {
  if (wrappedMcpServerInstances.has(mcpServerInstance)) {
    return mcpServerInstance;
  }
  if (!validateMcpServerInstance(mcpServerInstance)) {
    return mcpServerInstance;
  }
  const serverInstance = mcpServerInstance;
  const client = getClient();
  const genAI = client?.getDataCollectionOptions().genAI;
  const resolvedOptions = {
    recordInputs: options?.recordInputs ?? genAI?.inputs ?? false,
    recordOutputs: options?.recordOutputs ?? genAI?.outputs ?? false
  };
  fill(serverInstance, "connect", (originalConnect) => {
    return async function(transport, ...restArgs) {
      const result = await originalConnect.call(
        this,
        transport,
        ...restArgs
      );
      wrapTransportOnMessage(transport, resolvedOptions);
      wrapTransportSend(transport, resolvedOptions);
      wrapTransportOnClose(transport);
      wrapTransportError(transport);
      return result;
    };
  });
  wrapAllMCPHandlers(serverInstance);
  wrapExistingHandlers(serverInstance);
  wrappedMcpServerInstances.add(mcpServerInstance);
  return mcpServerInstance;
}

export { wrapMcpServerWithSentry };
//# sourceMappingURL=index.js.map
