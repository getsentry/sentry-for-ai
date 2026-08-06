Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const redisDcSubscriber = require('./redis/redis-dc-subscriber.js');



exports.IOREDIS_DC_CHANNEL_COMMAND = redisDcSubscriber.IOREDIS_DC_CHANNEL_COMMAND;
exports.IOREDIS_DC_CHANNEL_CONNECT = redisDcSubscriber.IOREDIS_DC_CHANNEL_CONNECT;
exports.REDIS_DC_CHANNEL_BATCH = redisDcSubscriber.REDIS_DC_CHANNEL_BATCH;
exports.REDIS_DC_CHANNEL_COMMAND = redisDcSubscriber.REDIS_DC_CHANNEL_COMMAND;
exports.REDIS_DC_CHANNEL_CONNECT = redisDcSubscriber.REDIS_DC_CHANNEL_CONNECT;
exports.subscribeRedisDiagnosticChannels = redisDcSubscriber.subscribeRedisDiagnosticChannels;
//# sourceMappingURL=index.js.map
