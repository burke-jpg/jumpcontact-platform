# RepActivityScraper — Setup Guide

## What This Is

A Google Apps Script that runs every 15 minutes, checking Gmail for daily rep activity report emails. It extracts the `.xlsx` attachment, parses both sheets (agent-level + client phone-level), and writes the data to a Google Sheet.

**Output Sheet:** `1HNDX16_KjTMr4pX7RH5YdfkP0c9_yc9XPO13emnW-KY`

---

## Setup Steps

### 1. Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New project**
3. Name it `RepActivityScraper`
4. Delete the default `Code.gs` content
5. Paste the entire contents of `scripts/RepActivityScraper.gs` into the editor

### 2. Enable the Drive Advanced Service

The script converts `.xlsx` → Google Sheets using the Drive API. This must be enabled manually:

1. In the Apps Script editor, click **Services** (+ icon) in the left sidebar
2. Find **Drive API** (v2) in the list
3. Click **Add**
4. Verify it appears as `Drive` in the services list

### 3. Update the Email Search Query

The `EMAIL_SEARCH_QUERY` variable at the top of the script needs to match the actual report emails. Currently set to:

```javascript
var EMAIL_SEARCH_QUERY = 'subject:"Clients Yesterday" newer_than:1d has:attachment';
```

**Update this** to match the actual subject line and/or sender. Examples:
- `'subject:"Clients Yesterday" from:reports@example.com newer_than:1d has:attachment'`
- `'subject:"Burke Daily Rep Activity" newer_than:1d has:attachment'`

### 4. Authorize the Script

1. In the editor, select `processRepActivityEmails` from the function dropdown
2. Click **Run**
3. You'll be prompted to authorize — click through the Google permissions screens
4. The script needs access to: Gmail, Google Sheets, Google Drive

### 5. Set Up the Trigger

1. Select `setupTrigger` from the function dropdown
2. Click **Run**
3. This creates a 15-minute recurring trigger for `processRepActivityEmails`
4. Verify under **Triggers** (clock icon in left sidebar) that it appears

---

## How It Works

```
Gmail inbox
  │
  ├─ Search: EMAIL_SEARCH_QUERY
  ├─ Skip: threads with "Processed/RepActivity" label
  │
  └─ For each .xlsx attachment:
       │
       ├─ Upload to Drive as temp Google Sheet (Drive API convert)
       ├─ Read Sheet 1 → agent-level data (Rep Activity tab)
       ├─ Read Sheet 2 → phone-level data (Clients Yesterday tab)
       ├─ Delete temp Drive file
       │
       ├─ Dedup check against target sheet
       │   ├─ Same date + entity + filter → skip
       │   └─ Same date + entity, different filter → overwrite
       │
       ├─ Write rows to target Google Sheet
       ├─ Log to "Logs" tab
       └─ Label Gmail thread "Processed/RepActivity"
```

### Two-Row Agent Bug

Some agents (notably Danny) span two rows in the xlsx:
- Row N: agent name + talk time, but `null` for call conversations
- Row N+1: blank agent name + the remaining data

The script merges these automatically by carrying forward the last-seen agent name.

### Agent Filtering

Only Jump Contact agents are written: **Omar, Burke, Ian, Danny, Chris, George, Wendy**. "Daniel" is normalized to "Danny". All other agents are silently skipped.

---

## Target Sheet Structure

### Tab: "Rep Activity"

| Col | Header | Source |
|-----|--------|--------|
| A | Date | From attachment filename (MM/DD/YYYY) |
| B | Filter | "Date = THIS" (MTD) or "Date = THIS-1" (yesterday) |
| C | Agent | Normalized name |
| D | Call Conversations | Integer |
| E | Total Talk Time | Raw string (e.g., "20:03") |
| F | Talk Time Minutes | Decimal minutes (e.g., 20.05) |
| G | Verint Speed | Decimal, 1 place (e.g., 6.0) |
| H | Avg Speed to Answer | Raw MM:SS string |
| I | Processed At | ISO timestamp |

### Tab: "Clients Yesterday"

| Col | Header | Source |
|-----|--------|--------|
| A | Date | From attachment filename |
| B | External Contact | Phone number |
| C | Call Conversations | Integer |
| D | Total Talk Time | Raw string |
| E | Talk Time Minutes | Decimal minutes |
| F | Verint Speed | Decimal, 1 place |
| G | Processed At | ISO timestamp |

### Tab: "Logs"

| Col | Header |
|-----|--------|
| A | Timestamp |
| B | Status (success/error/skip) |
| C | Message |
| D | Email Subject |
| E | Rows Written |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Drive is not defined" | Enable Drive API v2 in Services (step 2) |
| No emails found | Check `EMAIL_SEARCH_QUERY` matches actual email subjects |
| Script runs but writes nothing | Check the "Logs" tab for skip/error entries |
| "Processed/RepActivity" label missing | Script creates it automatically on first run |
| Duplicate rows | Dedup uses Date + Agent/Phone as key — check date format matches |
| Auth errors | Re-run `processRepActivityEmails` manually to re-authorize |
| Trigger stopped firing | Check Triggers page — Google disables triggers after repeated failures |

## TODO Before First Run

- [ ] Confirm email search query (`EMAIL_SEARCH_QUERY`)
- [ ] Enable Drive API v2 in Advanced Services
- [ ] Run `processRepActivityEmails` manually to authorize
- [ ] Run `setupTrigger` to start 15-minute polling
- [ ] Verify the target sheet has the correct tabs after first successful run
