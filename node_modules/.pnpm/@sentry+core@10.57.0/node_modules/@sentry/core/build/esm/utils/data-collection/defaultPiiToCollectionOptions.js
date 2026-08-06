import { PII_HEADER_SNIPPETS } from './filtering-snippets.js';

function defaultPiiToCollectionOptions(sendDefaultPii) {
  return sendDefaultPii === true ? {
    userInfo: true,
    cookies: true,
    httpHeaders: { request: true, response: true },
    httpBodies: ["incomingRequest", "outgoingRequest", "incomingResponse", "outgoingResponse"],
    queryParams: true,
    genAI: { inputs: true, outputs: true },
    stackFrameVariables: true,
    frameContextLines: 7
    // default should be 5, but ContextLines integration uses 7
  } : {
    userInfo: false,
    cookies: { deny: PII_HEADER_SNIPPETS },
    httpHeaders: { request: { deny: PII_HEADER_SNIPPETS }, response: { deny: PII_HEADER_SNIPPETS } },
    httpBodies: [],
    queryParams: { deny: PII_HEADER_SNIPPETS },
    genAI: { inputs: false, outputs: false },
    stackFrameVariables: true,
    frameContextLines: 7
    // default should be 5, but ContextLines integration uses 7
  };
}

export { defaultPiiToCollectionOptions };
//# sourceMappingURL=defaultPiiToCollectionOptions.js.map
