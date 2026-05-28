const SENSITIVE_KEY_RE =
  /(?:password|passwd|token|authorization|cookie|secret|api[._-]?key|private[._-]?key|session[._-]?id)/i;
const DOCS_URL =
  "https://github.com/getsentry/sentry-for-ai/blob/main/skills/sentry-logs-migration-javascript/references/eslint-plugin-sentry-structured-logs.md";
const RESERVED_KEY_RE = /^(?:sentry\.|browser\.|server\.|user\.)/;
const SNAKE_CASE_SEGMENT_RE = /^[a-z][a-z0-9_]*$/;
const LEVEL_METHODS = new Set([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);
const NON_SCALAR_NODE_TYPES = new Set([
  "ObjectExpression",
  "ArrayExpression",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "ClassExpression",
]);
const LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES = {
  allowedLoggerObjects: { type: "array", items: { type: "string" } },
  allowedLoggerIdentifiers: {
    type: "array",
    items: { type: "string" },
  },
  attributesFirstLoggerObjects: { type: "array", items: { type: "string" } },
  attributesFirstLoggerIdentifiers: {
    type: "array",
    items: { type: "string" },
  },
  allowDynamicLevelMethods: { type: "boolean" },
};
const REQUIRE_MESSAGE_AND_FLAT_ATTRS_MESSAGES = {
  messageRequired: "Logger call must include a message argument.",
  messageMustBeText:
    "Logger call message argument must be text, not structured data.",
  nonInlineAttributes:
    "Log attributes must be an inline object literal so lint rules can validate keys and values.",
  noAttributeSpread:
    "Do not spread into log attributes; define each key explicitly.",
  staticAttributeProperties: "Attributes must use static object properties.",
  staticAttributeKeys:
    "Attributes must use non-computed identifier or string literal keys.",
  snakeCaseAttributeKey:
    'Each dotted key segment must be snake_case: "{{key}}".',
  scalarAttributeValue:
    'Attribute "{{key}}" must be scalar (string, number, or boolean).',
};
const RESERVED_ATTR_KEYS_MESSAGES = {
  reservedAttributeKey:
    'Reserved attribute prefix not allowed: "{{key}}". Do not overwrite SDK-managed keys under sentry.*, browser.*, server.*, or user.*.',
};
const SENSITIVE_ATTR_KEYS_MESSAGES = {
  sensitiveAttributeKey:
    'Sensitive key not allowed in log attributes: "{{key}}".',
};

function unwrapChainExpression(node) {
  return node?.type === "ChainExpression" ? node.expression : node;
}

function getStaticPropertyName(node) {
  if (!node || node.type !== "MemberExpression") return null;
  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  if (
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value;
  }
  return null;
}

function hasDynamicPropertyName(node) {
  return node?.type === "MemberExpression" && node.computed;
}

function getMemberPath(node) {
  const segments = [];
  let current = node;

  while (current) {
    if (current.type === "Identifier") {
      segments.unshift(current.name);
      return segments.join(".");
    }

    if (current.type === "MemberExpression" && !current.computed) {
      const prop =
        current.property.type === "Identifier"
          ? current.property.name
          : current.property.type === "Literal"
            ? String(current.property.value)
            : null;
      if (!prop) return null;
      segments.unshift(prop);
      current = current.object;
      continue;
    }

    return null;
  }

  return null;
}

function getLoggerCallConfig(node, options = {}) {
  if (node?.type !== "CallExpression") return false;

  const callee = unwrapChainExpression(node.callee);
  if (!callee || callee.type !== "MemberExpression") return false;

  const allowedLoggerObjects = new Set(
    options.allowedLoggerObjects || ["Sentry.logger"],
  );
  const allowedLoggerIdentifiers = new Set(
    options.allowedLoggerIdentifiers || [],
  );
  const attributesFirstLoggerObjects = new Set(
    options.attributesFirstLoggerObjects || [],
  );
  const attributesFirstLoggerIdentifiers = new Set(
    options.attributesFirstLoggerIdentifiers || [],
  );

  const objectPath = getMemberPath(callee.object);
  const objectIdentifier =
    callee.object?.type === "Identifier" ? callee.object.name : null;
  const isAllowedLoggerObject =
    (objectPath && allowedLoggerObjects.has(objectPath)) ||
    (objectIdentifier && allowedLoggerIdentifiers.has(objectIdentifier));

  if (!isAllowedLoggerObject) return false;

  const method = getStaticPropertyName(callee);
  const isLevelMethod = method
    ? LEVEL_METHODS.has(method)
    : hasDynamicPropertyName(callee)
      ? options.allowDynamicLevelMethods !== false
      : false;

  if (!isLevelMethod) return false;

  const attributesFirst =
    (objectPath && attributesFirstLoggerObjects.has(objectPath)) ||
    (objectIdentifier &&
      attributesFirstLoggerIdentifiers.has(objectIdentifier));

  return {
    attributesArgumentIndex: attributesFirst ? 0 : 1,
    messageArgumentIndex: attributesFirst ? 1 : 0,
  };
}

function isLoggerCall(node, options = {}) {
  return Boolean(getLoggerCallConfig(node, options));
}

function getLoggerArguments(node, options = {}) {
  const config = getLoggerCallConfig(node, options);
  if (!config) {
    return {
      attrsArg: null,
      messageArg: null,
    };
  }

  return {
    attrsArg: node.arguments[config.attributesArgumentIndex],
    messageArg: node.arguments[config.messageArgumentIndex],
  };
}

function getPropertyKey(prop) {
  if (!prop || prop.type !== "Property" || prop.computed) return null;
  if (prop.key.type === "Identifier") return prop.key.name;
  if (prop.key.type === "Literal") return String(prop.key.value);
  return null;
}

function collectAttrsEntries(attrsNode, context, options = {}) {
  if (!attrsNode) return [];
  const reportMalformedProperties = options.reportMalformedProperties === true;

  if (attrsNode.type !== "ObjectExpression") {
    if (options.reportNonLiteral) {
      context.report({
        node: attrsNode,
        messageId: "nonInlineAttributes",
      });
    }
    return null;
  }

  const entries = [];
  for (const prop of attrsNode.properties) {
    if (prop.type === "SpreadElement") {
      if (reportMalformedProperties) {
        context.report({
          node: prop,
          messageId: "noAttributeSpread",
        });
      }
      continue;
    }

    if (prop.type !== "Property") {
      if (reportMalformedProperties) {
        context.report({
          node: prop,
          messageId: "staticAttributeProperties",
        });
      }
      continue;
    }

    const key = getPropertyKey(prop);
    if (!key) {
      if (reportMalformedProperties) {
        context.report({
          node: prop.key,
          messageId: "staticAttributeKeys",
        });
      }
      continue;
    }

    entries.push({ key, keyNode: prop.key, valueNode: prop.value });
  }

  return entries;
}

function isScalarLiteral(node) {
  return (
    node?.type === "Literal" &&
    (typeof node.value === "string" ||
      typeof node.value === "number" ||
      typeof node.value === "boolean")
  );
}

function isKnownScalarExpression(node) {
  if (isScalarLiteral(node)) return true;
  if (node?.type === "TemplateLiteral") return true;
  return false;
}

function isClearlyNonScalar(node) {
  if (!node) return false;
  if (NON_SCALAR_NODE_TYPES.has(node.type)) return true;
  if (node.type === "Literal") return !isScalarLiteral(node);
  if (node.type === "TemplateLiteral") return false;
  return false;
}

function isDisallowedAttributeValue(node, options = {}) {
  if (isClearlyNonScalar(node)) return true;
  return (
    options.allowUnknownAttributeValues === false &&
    !isKnownScalarExpression(node)
  );
}

function isClearlyNotMessage(node) {
  if (!node) return false;
  if (node.type === "Literal") return typeof node.value !== "string";
  if (node.type === "TemplateLiteral") return false;
  if (node.type === "TaggedTemplateExpression") return false;
  if (NON_SCALAR_NODE_TYPES.has(node.type)) return true;
  return false;
}

function requireMessageAndFlatAttrs(context, node, options = {}) {
  const { messageArg, attrsArg } = getLoggerArguments(node, options);
  if (!messageArg) {
    context.report({
      node,
      messageId: "messageRequired",
    });
    return;
  }

  if (isClearlyNotMessage(messageArg)) {
    context.report({
      node: messageArg,
      messageId: "messageMustBeText",
    });
  }

  const entries = collectAttrsEntries(attrsArg, context, {
    reportMalformedProperties: true,
    reportNonLiteral: true,
  });
  if (!entries) return;

  for (const entry of entries) {
    const segments = entry.key.split(".");
    if (
      segments.some(
        (segment) => !segment || !SNAKE_CASE_SEGMENT_RE.test(segment),
      )
    ) {
      context.report({
        node: entry.keyNode,
        messageId: "snakeCaseAttributeKey",
        data: { key: entry.key },
      });
    }

    if (isDisallowedAttributeValue(entry.valueNode, options)) {
      context.report({
        node: entry.valueNode,
        messageId: "scalarAttributeValue",
        data: { key: entry.key },
      });
    }
  }
}

function noReservedAttrKeys(context, node) {
  const { attrsArg } = getLoggerArguments(node, context.options?.[0] || {});
  const entries = collectAttrsEntries(attrsArg, context);
  if (!entries) return;

  for (const entry of entries) {
    if (RESERVED_KEY_RE.test(entry.key)) {
      context.report({
        node: entry.keyNode,
        messageId: "reservedAttributeKey",
        data: { key: entry.key },
      });
    }
  }
}

function noSensitiveAttrKeys(context, node) {
  const { attrsArg } = getLoggerArguments(node, context.options?.[0] || {});
  const entries = collectAttrsEntries(attrsArg, context);
  if (!entries) return;

  for (const entry of entries) {
    if (SENSITIVE_KEY_RE.test(entry.key)) {
      context.report({
        node: entry.keyNode,
        messageId: "sensitiveAttributeKey",
        data: { key: entry.key },
      });
    }
  }
}

function createRule(
  handler,
  { description, messages, optionSchemaProperties = {} },
) {
  return {
    meta: {
      type: "problem",
      docs: {
        description,
        recommended: false,
        url: DOCS_URL,
      },
      messages,
      schema: [
        {
          type: "object",
          properties: {
            ...LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
            ...optionSchemaProperties,
          },
          additionalProperties: false,
        },
      ],
    },
    create(context) {
      const options = context.options?.[0] || {};
      return {
        CallExpression(node) {
          if (!isLoggerCall(node, options)) return;
          handler(context, node, options);
        },
      };
    },
  };
}

export default {
  meta: { name: "eslint-plugin-sentry-structured-logs" },
  rules: {
    "require-message-and-flat-attrs": createRule(requireMessageAndFlatAttrs, {
      description:
        "require Sentry logger calls to use message-first calls with flat scalar attributes",
      messages: REQUIRE_MESSAGE_AND_FLAT_ATTRS_MESSAGES,
      optionSchemaProperties: {
        allowUnknownAttributeValues: { type: "boolean" },
      },
    }),
    "no-reserved-attr-keys": createRule(noReservedAttrKeys, {
      description: "disallow SDK-managed Sentry log attribute prefixes",
      messages: RESERVED_ATTR_KEYS_MESSAGES,
    }),
    "no-sensitive-attr-keys": createRule(noSensitiveAttrKeys, {
      description: "disallow sensitive Sentry log attribute keys",
      messages: SENSITIVE_ATTR_KEYS_MESSAGES,
    }),
  },
};
