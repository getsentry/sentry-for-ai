Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');

const REDIS_DC_CHANNEL_COMMAND = "node-redis:command";
const REDIS_DC_CHANNEL_BATCH = "node-redis:batch";
const REDIS_DC_CHANNEL_CONNECT = "node-redis:connect";
const IOREDIS_DC_CHANNEL_COMMAND = "ioredis:command";
const IOREDIS_DC_CHANNEL_CONNECT = "ioredis:connect";
const ORIGIN = "auto.db.redis.diagnostic_channel";
const ATTR_DB_STATEMENT = "db.statement";
const ATTR_DB_SYSTEM = "db.system";
const ATTR_NET_PEER_NAME = "net.peer.name";
const ATTR_NET_PEER_PORT = "net.peer.port";
const DB_SYSTEM_VALUE_REDIS = "redis";
const NOOP = () => {
};
let subscribed = false;
let currentResponseHook;
function subscribeRedisDiagnosticChannels(tracingChannel, responseHook) {
  currentResponseHook = responseHook;
  if (subscribed) return;
  subscribed = true;
  try {
    setupCommandChannel(tracingChannel, REDIS_DC_CHANNEL_COMMAND, (data) => data.args.slice(1));
    setupBatchChannel(
      tracingChannel,
      REDIS_DC_CHANNEL_BATCH,
      (data) => data.batchMode === "PIPELINE" ? "PIPELINE" : "MULTI"
    );
    setupConnectChannel(tracingChannel, REDIS_DC_CHANNEL_CONNECT);
    setupCommandChannel(tracingChannel, IOREDIS_DC_CHANNEL_COMMAND, (data) => data.args);
    setupConnectChannel(tracingChannel, IOREDIS_DC_CHANNEL_CONNECT);
  } catch {
    debugBuild.DEBUG_BUILD && core.debug.log("Redis node:diagnostics_channel subscription failed.");
  }
}
function setupCommandChannel(tracingChannel, channelName, getCommandArgs) {
  const channel = tracingChannel(channelName, (data) => {
    const args = getCommandArgs(data);
    const statement = args.length ? `${data.command} ${args.join(" ")}` : data.command;
    return core.startSpanManual(
      {
        name: `redis-${data.command}`,
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: ORIGIN,
          [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "db.redis",
          [ATTR_DB_SYSTEM]: DB_SYSTEM_VALUE_REDIS,
          [ATTR_DB_STATEMENT]: statement,
          ...data.serverAddress != null ? { [ATTR_NET_PEER_NAME]: data.serverAddress } : {},
          ...data.serverPort != null ? { [ATTR_NET_PEER_PORT]: data.serverPort } : {}
        }
      },
      (span) => span
    );
  });
  channel.subscribe({
    start: NOOP,
    asyncStart: NOOP,
    end: NOOP,
    asyncEnd: (data) => {
      const span = data._sentrySpan;
      if (!span || data.error) return;
      runResponseHook(span, data.command, getCommandArgs(data), data.result);
      span.end();
    },
    error: (data) => {
      const span = data._sentrySpan;
      if (!span) return;
      if (data.error) {
        span.setStatus({ code: core.SPAN_STATUS_ERROR, message: data.error.message });
      }
      span.end();
    }
  });
}
function setupBatchChannel(tracingChannel, channelName, getOperationName) {
  const channel = tracingChannel(channelName, (data) => {
    return core.startSpanManual(
      {
        name: getOperationName(data),
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: ORIGIN,
          [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "db.redis",
          [ATTR_DB_SYSTEM]: DB_SYSTEM_VALUE_REDIS,
          ...data.batchSize != null ? { "db.redis.batch_size": data.batchSize } : {},
          ...data.serverAddress != null ? { [ATTR_NET_PEER_NAME]: data.serverAddress } : {},
          ...data.serverPort != null ? { [ATTR_NET_PEER_PORT]: data.serverPort } : {}
        }
      },
      (span) => span
    );
  });
  channel.subscribe({
    start: NOOP,
    asyncStart: NOOP,
    end: NOOP,
    asyncEnd: (data) => {
      if (!data.error) data._sentrySpan?.end();
    },
    error: (data) => {
      const span = data._sentrySpan;
      if (!span) return;
      if (data.error) {
        span.setStatus({ code: core.SPAN_STATUS_ERROR, message: data.error.message });
      }
      span.end();
    }
  });
}
function setupConnectChannel(tracingChannel, channelName) {
  const channel = tracingChannel(channelName, (data) => {
    return core.startSpanManual(
      {
        name: "redis-connect",
        attributes: {
          [core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: ORIGIN,
          [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: "db.redis.connect",
          [ATTR_DB_SYSTEM]: DB_SYSTEM_VALUE_REDIS,
          ...data.serverAddress != null ? { [ATTR_NET_PEER_NAME]: data.serverAddress } : {},
          ...data.serverPort != null ? { [ATTR_NET_PEER_PORT]: data.serverPort } : {}
        }
      },
      (span) => span
    );
  });
  channel.subscribe({
    start: NOOP,
    asyncStart: NOOP,
    end: NOOP,
    asyncEnd: (data) => {
      if (!data.error) data._sentrySpan?.end();
    },
    error: (data) => {
      const span = data._sentrySpan;
      if (!span) return;
      if (data.error) {
        span.setStatus({ code: core.SPAN_STATUS_ERROR, message: data.error.message });
      }
      span.end();
    }
  });
}
function runResponseHook(span, command, args, result) {
  const hook = currentResponseHook;
  if (!hook) return;
  try {
    hook(span, command, args, result);
  } catch {
  }
}

exports.IOREDIS_DC_CHANNEL_COMMAND = IOREDIS_DC_CHANNEL_COMMAND;
exports.IOREDIS_DC_CHANNEL_CONNECT = IOREDIS_DC_CHANNEL_CONNECT;
exports.REDIS_DC_CHANNEL_BATCH = REDIS_DC_CHANNEL_BATCH;
exports.REDIS_DC_CHANNEL_COMMAND = REDIS_DC_CHANNEL_COMMAND;
exports.REDIS_DC_CHANNEL_CONNECT = REDIS_DC_CHANNEL_CONNECT;
exports.subscribeRedisDiagnosticChannels = subscribeRedisDiagnosticChannels;
//# sourceMappingURL=redis-dc-subscriber.js.map
