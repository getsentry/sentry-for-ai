# Metrics — Sentry NestJS SDK

> Minimum SDK: `@sentry/nestjs` 10.25.0+ · Status: ⚠️ Open beta

## Overview

`Sentry.metrics` provides custom counters, gauges, and distributions. Metrics are enabled by default — no extra `init()` flag needed.

## Metric Types

| Type | API | Use for |
|------|-----|---------|
| Counter | `Sentry.metrics.count()` | Event occurrences, request counts |
| Distribution | `Sentry.metrics.distribution()` | Latencies, sizes — supports p50/p90/p95/p99 |
| Gauge | `Sentry.metrics.gauge()` | Current values (min, max, avg, sum, count — no percentiles) |

## Configuration

```typescript
import './instrument';  // Sentry init must run before anything else
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

No extra flags required — metrics are on by default once `Sentry.init()` is called.

Optional `beforeSendMetric` hook:

```typescript
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'https://<key>@<org>.ingest.sentry.io/<project>',
  beforeSendMetric(metric) {
    if (metric.name === 'noisy-metric') {
      return null;  // drop this metric
    }
    metric.attributes['env'] = 'prod';  // add attribute
    return metric;
  },
});
```

## Code Examples

### Counter — event occurrences

```typescript
import * as Sentry from '@sentry/nestjs';

// In a controller
@Controller('orders')
export class OrdersController {
  @Post()
  async createOrder(@Body() dto: CreateOrderDto) {
    Sentry.metrics.count('orders.created', 1, {
      attributes: {
        type: dto.type,
        region: dto.region,
      },
    });
    return this.ordersService.create(dto);
  }
}

// Count per route/method
@Get(':id')
async getOrder(@Param('id') id: string) {
  Sentry.metrics.count('http.requests', 1, {
    attributes: {
      route: '/orders/:id',
      method: 'GET',
    },
  });
  return this.ordersService.findOne(id);
}
```

### Distribution — percentile analysis

Best for latencies, response sizes, durations where p50/p90/p99 matter:

```typescript
import * as Sentry from '@sentry/nestjs';

@Injectable()
export class OrdersService {
  async processOrder(order: Order): Promise<void> {
    const start = Date.now();

    await this.doProcessing(order);

    Sentry.metrics.distribution('orders.processing_time', Date.now() - start, {
      unit: 'millisecond',
      attributes: {
        'order.type': order.type,
        region: order.region,
      },
    });
  }
}
```

Database query timing:

```typescript
@Injectable()
export class UsersRepository {
  async findByEmail(email: string) {
    const start = Date.now();
    const result = await this.db.users.findOne({ email });

    Sentry.metrics.distribution('db.query_time', Date.now() - start, {
      unit: 'millisecond',
      attributes: { table: 'users', operation: 'findOne' },
    });

    return result;
  }
}
```

### Gauge — current state

Use for values that fluctuate over time; no percentile support:

```typescript
import * as Sentry from '@sentry/nestjs';

// Bull/BullMQ queue depth
@Injectable()
export class QueueMonitorService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reportQueueDepth() {
    const waiting = await this.emailQueue.getWaitingCount();
    const active = await this.emailQueue.getActiveCount();

    Sentry.metrics.gauge('queue.depth', waiting, {
      attributes: { queue: 'email', state: 'waiting' },
    });

    Sentry.metrics.gauge('queue.depth', active, {
      attributes: { queue: 'email', state: 'active' },
    });
  }
}
```

### Business event counting

```typescript
@Injectable()
export class PaymentsService {
  async chargeCard(dto: ChargeDto): Promise<Charge> {
    try {
      const charge = await this.stripe.charges.create(dto);

      Sentry.metrics.count('payments.charged', 1, {
        attributes: {
          currency: dto.currency,
          success: true,
        },
      });

      return charge;
    } catch (err) {
      Sentry.metrics.count('payments.charged', 1, {
        attributes: {
          currency: dto.currency,
          success: false,
          'error.type': err.type ?? 'unknown',
        },
      });
      throw err;
    }
  }
}
```

### Attribute value types

```typescript
Sentry.metrics.count('api.request', 1, {
  attributes: {
    endpoint: '/v2/users',   // string
    method: 'POST',
    success: true,           // boolean
    status_code: 201,        // number
    latency: 0.042,          // number (float)
  },
});
```

### Unit strings

| Category | Values |
|----------|--------|
| Time | `"nanosecond"`, `"microsecond"`, `"millisecond"`, `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"` |
| Data | `"bit"`, `"byte"`, `"kilobyte"`, `"megabyte"`, `"gigabyte"`, `"terabyte"` |
| Fractions | `"ratio"`, `"percent"` |
| Dimensionless | `"none"` (default when omitted) |

### `beforeSendMetric` — metric object schema

| Key | Type | Description |
|-----|------|-------------|
| `name` | `string` | Metric identifier |
| `type` | `string` | `"counter"` / `"gauge"` / `"distribution"` |
| `value` | `number` | Numeric measurement |
| `unit` | `string \| undefined` | Unit string |
| `attributes` | `Record<string, string \| number \| boolean>` | Custom key-value pairs |
| `timestamp` | `number` | Epoch seconds |
| `traceId` | `string \| undefined` | Associated trace ID |
| `spanId` | `string \| undefined` | Active span ID |

## Best Practices

- Keep attribute cardinality low — avoid user IDs, UUIDs, or timestamps as attribute values
- Use `distribution` over `gauge` when you need percentile analysis
- Prefix metric names with your service name: `"payments.charge_time"` not `"charge_time"`
- Use standard unit strings — Sentry renders them in the UI with proper labels
- Each metric consumes up to 2 KB — avoid unbounded attribute value sets
- Metrics are buffered and flushed periodically — not suitable for sub-second alerting

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not appearing | Verify `@sentry/nestjs` ≥ 10.25.0; check `debug: true` output |
| Metric dropped silently | Check `beforeSendMetric` hook; verify metric name has no special characters |
| High cardinality warning | Reduce attribute values — avoid per-user or per-request identifiers |
| No percentiles in Sentry UI | Switch from `gauge` to `distribution` — gauges do not support percentiles |
