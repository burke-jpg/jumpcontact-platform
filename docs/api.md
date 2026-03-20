# API Reference

All API routes are under `/api/` and are server-side Next.js route handlers.

---

## GET `/api/data`

Returns the complete dashboard dataset including today's metrics, yesterday's comparison, and weekend data (on Mondays).

### Response

```json
{
  "today": {
    "conversions": {
      "total": 42,
      "byAgent": { "omar": 12, "burke": 10, ... },
      "byAccount": { "Account A": 8, ... },
      "hourly": [0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 8, ...]
    },
    "missed": {
      "jcTotal": 5,
      "ibrahimTotal": 2,
      "byAccount": { "Account A": 3, ... }
    },
    "reps": [
      {
        "name": "omar",
        "calls": 45,
        "talkTimeMin": 120.5,
        "avgSpeedSec": 8.2,
        "conversions": 12,
        "scheduledHours": 8,
        "ringTimeSec": 6.1,
        "wrapUpSec": 15.3
      }
    ],
    "recentCalls": [
      {
        "time": "2:35 PM",
        "agent": "omar",
        "phone": "(403) 555-1234",
        "direction": "inbound",
        "durationSec": 245
      }
    ],
    "yticaSpeed": {
      "byAgent": { "omar": 7.5, "burke": 9.2 },
      "teamAvg": 8.8
    },
    "pulledAt": "2026-03-20T14:35:00-07:00"
  },
  "yesterday": { ... },
  "weekend": { ... },
  "mtd": {
    "total": 580,
    "byAgent": { "omar": 150, ... },
    "byAccount": { "Account A": 95, ... },
    "daily": {
      "2026-03-01": { "omar": 8, "burke": 6, ... },
      "2026-03-02": { ... }
    }
  }
}
```

---

## GET `/api/calls`

Returns call records for a specific date.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | `YYYY-MM-DD` | Today | The date to fetch calls for |

### Response

```json
{
  "calls": [
    {
      "sid": "CAxxxxxxxx",
      "time": "2:35 PM",
      "agent": "omar",
      "phone": "(403) 555-1234",
      "client": "Account A",
      "direction": "inbound",
      "durationSec": 245,
      "durationFormatted": "4:05",
      "recordingSid": "RExxxxxxxx"
    }
  ],
  "summary": {
    "total": 156,
    "inbound": 120,
    "outbound": 36,
    "byAgent": { "omar": 45, "burke": 38, ... }
  },
  "pulledAt": "2026-03-20T14:35:00-07:00"
}
```

---

## GET `/api/calls/recording`

Proxies a Twilio call recording as an MP3 audio stream.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sid` | string | Yes | The Twilio Call SID (`CAxxxxxxxx`) |
| `download` | string | No | If `"1"`, sets `Content-Disposition: attachment` |

### Response

- **Content-Type**: `audio/mpeg`
- **Body**: MP3 audio stream

### Example

```
GET /api/calls/recording?sid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GET /api/calls/recording?sid=CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&download=1
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (missing/invalid parameters) |
| 404 | Recording not found |
| 500 | Server error (API connection failure) |
