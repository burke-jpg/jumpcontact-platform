/**
 * RepActivityScraper.gs
 *
 * Google Apps Script that:
 *   1. Watches Gmail for daily rep-activity report emails
 *   2. Extracts the .xlsx attachment
 *   3. Parses both sheets (agent-level + client phone-level)
 *   4. Writes parsed data to a Google Sheet with deduplication
 *   5. Runs on a 15-minute time-driven trigger
 *
 * Setup:
 *   - Paste this entire file into script.google.com
 *   - Enable Advanced Google Services → Drive API v2
 *   - Run setupTrigger() once to start the 15-minute polling
 *   - Run processRepActivityEmails() manually the first time to authorize scopes
 */

// ─── Configuration ───────────────────────────────────────────────────────────

/** Gmail search query — UPDATE THIS before deploying */
var EMAIL_SEARCH_QUERY = 'subject:"Clients Yesterday" newer_than:1d has:attachment';

/** Gmail label applied to emails after successful processing */
var PROCESSED_LABEL = 'Processed/RepActivity';

/** Target Google Sheet for output */
var TARGET_SHEET_ID = '1HNDX16_KjTMr4pX7RH5YdfkP0c9_yc9XPO13emnW-KY';

/** Tab names in the target sheet */
var REP_ACTIVITY_TAB = 'Rep Activity';
var CLIENTS_TAB = 'Clients Yesterday';
var LOGS_TAB = 'Logs';

/** Jump Contact agents to include (case-insensitive match) */
var JUMP_AGENTS = ['omar', 'burke', 'ian', 'danny', 'chris', 'george', 'wendy'];

/** Agent name normalization map */
var AGENT_ALIASES = {
  'daniel': 'Danny'
};

/** Notification email on errors */
var NOTIFY_EMAIL = Session.getActiveUser().getEmail();

// ─── Headers ─────────────────────────────────────────────────────────────────

var REP_HEADERS = [
  'Date', 'Filter', 'Agent', 'Call Conversations', 'Total Talk Time',
  'Talk Time Minutes', 'Verint Speed', 'Avg Speed to Answer', 'Processed At'
];

var CLIENT_HEADERS = [
  'Date', 'External Contact', 'Call Conversations', 'Total Talk Time',
  'Talk Time Minutes', 'Verint Speed', 'Processed At'
];

var LOG_HEADERS = ['Timestamp', 'Status', 'Message', 'Email Subject', 'Rows Written'];

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Main function — search Gmail for unprocessed rep-activity emails,
 * parse .xlsx attachments, and write to Google Sheets.
 */
function processRepActivityEmails() {
  var threads = GmailApp.search(EMAIL_SEARCH_QUERY, 0, 10);

  if (threads.length === 0) {
    return; // No matching emails — normal, exit silently
  }

  var label = getOrCreateLabel_(PROCESSED_LABEL);

  for (var t = 0; t < threads.length; t++) {
    var thread = threads[t];

    // Skip already-processed threads
    var labels = thread.getLabels();
    var alreadyProcessed = false;
    for (var l = 0; l < labels.length; l++) {
      if (labels[l].getName() === PROCESSED_LABEL) {
        alreadyProcessed = true;
        break;
      }
    }
    if (alreadyProcessed) continue;

    var messages = thread.getMessages();
    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var subject = message.getSubject();
      var attachments = message.getAttachments();

      for (var a = 0; a < attachments.length; a++) {
        var att = attachments[a];
        var name = att.getName();

        // Only process .xlsx files
        if (!name.match(/\.xlsx$/i)) continue;

        try {
          var reportDate = extractDateFromFilename(name);
          if (!reportDate) {
            reportDate = extractDateFromSubject_(subject);
          }
          if (!reportDate) {
            logRun('error', 'Could not extract date from filename or subject: ' + name, subject, 0);
            continue;
          }

          var parsed = parseXlsxAttachment(att);
          if (!parsed) {
            logRun('error', 'Failed to parse XLSX attachment: ' + name, subject, 0);
            continue;
          }

          var now = new Date().toISOString();
          var totalRows = 0;

          // ── Process Sheet 1: Rep Activity (agent-level) ──
          if (parsed.repActivity && parsed.repActivity.rows.length > 0) {
            var repRows = [];
            for (var i = 0; i < parsed.repActivity.rows.length; i++) {
              var r = parsed.repActivity.rows[i];
              repRows.push([
                reportDate,
                parsed.repActivity.filter,
                r.agent,
                r.callConversations,
                r.totalTalkTime,
                r.talkTimeMinutes,
                r.verintSpeed,
                r.avgSpeedToAnswer,
                now
              ]);
            }
            var written = writeToTargetSheet(repRows, REP_ACTIVITY_TAB, REP_HEADERS, reportDate, parsed.repActivity.filter, 2);
            totalRows += written;
          }

          // ── Process Sheet 2: Clients Yesterday (phone-level) ──
          if (parsed.clients && parsed.clients.rows.length > 0) {
            var clientRows = [];
            for (var j = 0; j < parsed.clients.rows.length; j++) {
              var c = parsed.clients.rows[j];
              clientRows.push([
                reportDate,
                c.externalContact,
                c.callConversations,
                c.totalTalkTime,
                c.talkTimeMinutes,
                c.verintSpeed,
                now
              ]);
            }
            var clientWritten = writeToTargetSheet(clientRows, CLIENTS_TAB, CLIENT_HEADERS, reportDate, parsed.clients.filter, 1);
            totalRows += clientWritten;
          }

          logRun('success', 'Processed ' + name, subject, totalRows);

        } catch (err) {
          logRun('error', 'Exception processing ' + name + ': ' + err.message, subject, 0);
          try {
            MailApp.sendEmail(NOTIFY_EMAIL, 'RepActivityScraper Error',
              'Failed to process email: ' + subject + '\nError: ' + err.message + '\n\nCheck the Logs tab in the target sheet.');
          } catch (mailErr) {
            Logger.log('Failed to send error notification: ' + mailErr.message);
          }
          continue; // Do NOT label as processed
        }
      }
    }

    // Mark thread as processed only after all attachments succeeded
    thread.addLabel(label);
  }
}

// ─── XLSX Parsing ────────────────────────────────────────────────────────────

/**
 * Convert an .xlsx blob to a temporary Google Sheet, read both tabs, clean up.
 * Requires Drive Advanced Service to be enabled.
 *
 * @param {GmailAttachment} blob - The .xlsx attachment blob
 * @returns {Object|null} { repActivity: { filter, rows }, clients: { filter, rows } }
 */
function parseXlsxAttachment(blob) {
  var tempFileId = null;

  try {
    // Upload and convert to Google Sheets format
    var resource = {
      title: 'TMP_RepActivity_Parse_' + new Date().getTime(),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    var file = Drive.Files.insert(resource, blob, { convert: true });
    tempFileId = file.id;

    var tempSpreadsheet = SpreadsheetApp.openById(tempFileId);
    var sheets = tempSpreadsheet.getSheets();

    var result = { repActivity: null, clients: null };

    for (var s = 0; s < sheets.length; s++) {
      var sheetName = sheets[s].getName();

      if (sheetName.match(/Burke Daily Rep Activity/i) || sheetName.match(/^1\.\s*Burke/i)) {
        result.repActivity = parseRepActivitySheet(sheets[s]);
      } else if (sheetName.match(/Clients Yesterday/i) || sheetName.match(/^1\.\s*Clients/i)) {
        result.clients = parseClientsSheet(sheets[s]);
      }
    }

    // If we only found one sheet and couldn't match names, try by index
    if (!result.repActivity && sheets.length >= 1) {
      result.repActivity = parseRepActivitySheet(sheets[0]);
    }
    if (!result.clients && sheets.length >= 2) {
      result.clients = parseClientsSheet(sheets[1]);
    }

    return result;

  } finally {
    // Always clean up temp file
    if (tempFileId) {
      try {
        Drive.Files.remove(tempFileId);
      } catch (cleanupErr) {
        Logger.log('Warning: failed to delete temp file ' + tempFileId + ': ' + cleanupErr.message);
      }
    }
  }
}

/**
 * Parse the agent-level "Burke Daily Rep Activity" sheet.
 *
 * @param {Sheet} sheet - Google Sheets Sheet object
 * @returns {Object} { filter: string, rows: Array }
 */
function parseRepActivitySheet(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 3) return { filter: '', rows: [] };

  // Row 0: filter row — extract "Date = THIS" or "Date = THIS-1"
  var filterStr = extractFilter_(data[0]);

  // Row 2: header row (row 1 is empty)
  // Row 3+: data rows
  var rows = [];
  var lastAgent = null;
  var lastRecord = null;

  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    var agentRaw = row[0] != null ? String(row[0]).trim() : '';

    if (agentRaw !== '') {
      // New agent row — save any pending record
      if (lastRecord) {
        rows.push(lastRecord);
      }

      var normalized = normalizeAgent_(agentRaw);
      lastAgent = normalized;

      lastRecord = {
        agent: normalized,
        totalTalkTime: safeStr_(row[1]),
        verintSpeed: safeRound_(row[3], 1),
        callConversations: safeInt_(row[4]),
        avgSpeedToAnswer: safeStr_(row[6]),
        talkTimeMinutes: 0
      };
    } else if (lastRecord) {
      // Blank agent name — merge non-null values into previous record (two-row bug)
      if (row[1] != null && String(row[1]).trim() !== '') lastRecord.totalTalkTime = safeStr_(row[1]);
      if (row[3] != null) lastRecord.verintSpeed = safeRound_(row[3], 1);
      if (row[4] != null) lastRecord.callConversations = safeInt_(row[4]);
      if (row[6] != null && String(row[6]).trim() !== '') lastRecord.avgSpeedToAnswer = safeStr_(row[6]);
    }
  }

  // Push final pending record
  if (lastRecord) {
    rows.push(lastRecord);
  }

  // Filter to Jump agents only and compute talk time minutes
  var filtered = [];
  for (var j = 0; j < rows.length; j++) {
    var r = rows[j];
    if (isJumpAgent_(r.agent)) {
      r.talkTimeMinutes = parseTalkTime(r.totalTalkTime);
      filtered.push(r);
    }
  }

  return { filter: filterStr, rows: filtered };
}

/**
 * Parse the client phone-level "Clients Yesterday" sheet.
 *
 * @param {Sheet} sheet - Google Sheets Sheet object
 * @returns {Object} { filter: string, rows: Array }
 */
function parseClientsSheet(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 3) return { filter: '', rows: [] };

  var filterStr = extractFilter_(data[0]);

  var rows = [];
  var lastContact = null;
  var lastRecord = null;

  for (var i = 3; i < data.length; i++) {
    var row = data[i];
    var contactRaw = row[0] != null ? String(row[0]).trim() : '';

    if (contactRaw !== '') {
      if (lastRecord) {
        rows.push(lastRecord);
      }

      lastContact = contactRaw;
      lastRecord = {
        externalContact: contactRaw,
        callConversations: safeInt_(row[4]),
        totalTalkTime: safeStr_(row[1]),
        talkTimeMinutes: 0,
        verintSpeed: safeRound_(row[3], 1)
      };
    } else if (lastRecord) {
      // Two-row merge for phone numbers too
      if (row[1] != null && String(row[1]).trim() !== '') lastRecord.totalTalkTime = safeStr_(row[1]);
      if (row[3] != null) lastRecord.verintSpeed = safeRound_(row[3], 1);
      if (row[4] != null) lastRecord.callConversations = safeInt_(row[4]);
    }
  }

  if (lastRecord) {
    rows.push(lastRecord);
  }

  // Compute talk time minutes
  for (var j = 0; j < rows.length; j++) {
    rows[j].talkTimeMinutes = parseTalkTime(rows[j].totalTalkTime);
  }

  return { filter: filterStr, rows: rows };
}

// ─── Sheet Writing with Dedup ────────────────────────────────────────────────

/**
 * Write rows to a target tab with deduplication.
 *
 * @param {Array[]} rows - 2D array of row data
 * @param {string} tabName - Tab name in target sheet
 * @param {string[]} headers - Column headers
 * @param {string} reportDate - Date string for this report (MM/DD/YYYY)
 * @param {string} filterType - Filter string (e.g., "Date = THIS")
 * @param {number} filterColIndex - Column index (0-based) where filter/dedup-key lives (2 for rep, 1 for clients)
 * @returns {number} Number of rows written
 */
function writeToTargetSheet(rows, tabName, headers, reportDate, filterType, filterColIndex) {
  var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
  var tab = ss.getSheetByName(tabName);

  if (!tab) {
    tab = ss.insertSheet(tabName);
    tab.appendRow(headers);
    tab.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }

  // Ensure headers exist
  var existingData = tab.getDataRange().getValues();
  if (existingData.length === 0) {
    tab.appendRow(headers);
    existingData = [headers];
  }

  // Build map of existing rows for this date: key → { rowIndex, filter }
  // For Rep Activity: key = date + agent (col A + col C)
  // For Clients: key = date + external contact (col A + col B)
  var keyColIndex = (tabName === REP_ACTIVITY_TAB) ? 2 : 1; // 0-based col of the dedup entity
  var filterCol = 1; // Filter is always col B for rep activity
  var existingKeys = {};
  var rowsToDelete = []; // 1-based row indices to delete for overwrite

  for (var i = 1; i < existingData.length; i++) {
    var existDate = formatDateForCompare_(existingData[i][0]);
    var existKey = existDate + '|' + String(existingData[i][keyColIndex]).trim().toLowerCase();
    var existFilter = String(existingData[i][filterCol] || '').trim();

    existingKeys[existKey] = { rowIndex: i + 1, filter: existFilter }; // 1-based
  }

  // Check each new row against existing data
  var rowsToWrite = [];
  var rowIndicesToRemove = [];

  for (var j = 0; j < rows.length; j++) {
    var newDate = formatDateForCompare_(rows[j][0]);
    var newEntity = String(rows[j][keyColIndex]).trim().toLowerCase();
    var newKey = newDate + '|' + newEntity;
    var newFilter = (tabName === REP_ACTIVITY_TAB) ? String(rows[j][1]).trim() : filterType;

    if (existingKeys[newKey]) {
      var existing = existingKeys[newKey];
      if (existing.filter === newFilter) {
        // Same filter type — skip (already processed)
        continue;
      } else {
        // Different filter — mark old row for removal, write new
        rowIndicesToRemove.push(existing.rowIndex);
        rowsToWrite.push(rows[j]);
      }
    } else {
      rowsToWrite.push(rows[j]);
    }
  }

  // Delete old rows (in reverse order to preserve indices)
  if (rowIndicesToRemove.length > 0) {
    rowIndicesToRemove.sort(function(a, b) { return b - a; });
    for (var d = 0; d < rowIndicesToRemove.length; d++) {
      tab.deleteRow(rowIndicesToRemove[d]);
    }
  }

  // Append new rows
  if (rowsToWrite.length > 0) {
    tab.getRange(tab.getLastRow() + 1, 1, rowsToWrite.length, rowsToWrite[0].length)
       .setValues(rowsToWrite);
  }

  return rowsToWrite.length;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Parse talk time string to decimal minutes.
 * Handles: "20:03", "1h 13:40", "00:00", None, ""
 *
 * @param {*} raw - Raw talk time value
 * @returns {number} Decimal minutes (rounded to 2 places)
 */
function parseTalkTime(raw) {
  if (!raw || raw === '—' || raw === '-') return 0;
  var str = String(raw).trim();
  if (str === '' || str === '0' || str === 'None') return 0;

  // Handle "Xh MM:SS" format
  var hMatch = str.match(/(\d+)h\s+(\d+):(\d+)/);
  if (hMatch) {
    var mins = parseInt(hMatch[1], 10) * 60 + parseInt(hMatch[2], 10) + parseInt(hMatch[3], 10) / 60;
    return Math.round(mins * 100) / 100;
  }

  // Handle "H:MM:SS" format (e.g., "1:13:40")
  var hmsParts = str.split(':');
  if (hmsParts.length === 3) {
    var mins2 = parseInt(hmsParts[0], 10) * 60 + parseInt(hmsParts[1], 10) + parseInt(hmsParts[2], 10) / 60;
    return Math.round(mins2 * 100) / 100;
  }

  // Handle "MM:SS" format
  if (hmsParts.length === 2) {
    var mins3 = parseInt(hmsParts[0], 10) + parseInt(hmsParts[1], 10) / 60;
    return Math.round(mins3 * 100) / 100;
  }

  return 0;
}

/**
 * Extract date from attachment filename.
 * Patterns: "Clients_Yesterday_03-27-2026.xlsx", "Burke_Daily_Rep_Activity_03-27-2026.xlsx"
 *
 * @param {string} filename
 * @returns {string|null} Date in MM/DD/YYYY format, or null
 */
function extractDateFromFilename(filename) {
  var match = filename.match(/(\d{2})-(\d{2})-(\d{4})\.xlsx$/i);
  if (match) {
    return match[1] + '/' + match[2] + '/' + match[3]; // MM/DD/YYYY
  }
  return null;
}

/**
 * Try to extract a date from the email subject line.
 *
 * @param {string} subject
 * @returns {string|null} Date in MM/DD/YYYY format, or null
 */
function extractDateFromSubject_(subject) {
  // Try MM-DD-YYYY
  var match = subject.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match) return match[1] + '/' + match[2] + '/' + match[3];

  // Try MM/DD/YYYY
  match = subject.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) return match[1] + '/' + match[2] + '/' + match[3];

  return null;
}

/**
 * Write a log entry to the Logs tab.
 */
function logRun(status, message, subject, rowCount) {
  try {
    var ss = SpreadsheetApp.openById(TARGET_SHEET_ID);
    var tab = ss.getSheetByName(LOGS_TAB);

    if (!tab) {
      tab = ss.insertSheet(LOGS_TAB);
      tab.appendRow(LOG_HEADERS);
      tab.getRange(1, 1, 1, LOG_HEADERS.length).setFontWeight('bold');
    }

    tab.appendRow([
      new Date().toISOString(),
      status,
      message,
      subject || '',
      rowCount || 0
    ]);
  } catch (err) {
    Logger.log('Failed to write log: ' + err.message);
  }
}

/**
 * Create a 15-minute time-driven trigger. Run once to set up.
 */
function setupTrigger() {
  // Delete existing triggers for this function
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processRepActivityEmails') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create new 15-minute trigger
  ScriptApp.newTrigger('processRepActivityEmails')
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log('Trigger created: processRepActivityEmails every 15 minutes');
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Get or create a Gmail label (supports nested labels like "Processed/RepActivity").
 */
function getOrCreateLabel_(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}

/**
 * Extract filter string from row 0 of a sheet.
 * Looks for "Date = THIS" or "Date = THIS-1" etc.
 */
function extractFilter_(row) {
  for (var i = 0; i < row.length; i++) {
    var val = String(row[i] || '');
    var match = val.match(/Date\s*=\s*\S+/i);
    if (match) return match[0];
  }
  return '';
}

/**
 * Normalize agent name: apply aliases, title-case.
 */
function normalizeAgent_(name) {
  var lower = name.toLowerCase().trim();
  if (AGENT_ALIASES[lower]) return AGENT_ALIASES[lower];
  // Title case
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Check if an agent name (already normalized) is a Jump Contact agent.
 */
function isJumpAgent_(name) {
  return JUMP_AGENTS.indexOf(name.toLowerCase().trim()) !== -1;
}

/** Safely convert to string, handling null/undefined/None */
function safeStr_(val) {
  if (val == null || String(val).trim().toLowerCase() === 'none') return '';
  return String(val).trim();
}

/** Safely convert to integer, handling null/undefined/None */
function safeInt_(val) {
  if (val == null || String(val).trim().toLowerCase() === 'none') return 0;
  var n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

/** Safely round a numeric value to N decimal places */
function safeRound_(val, decimals) {
  if (val == null || String(val).trim().toLowerCase() === 'none') return 0;
  var n = parseFloat(val);
  if (isNaN(n)) return 0;
  var factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/**
 * Normalize a date value for comparison. Handles Date objects and strings.
 * Returns MM/DD/YYYY string.
 */
function formatDateForCompare_(val) {
  if (val instanceof Date) {
    var mm = String(val.getMonth() + 1).padStart(2, '0');
    var dd = String(val.getDate()).padStart(2, '0');
    var yyyy = val.getFullYear();
    return mm + '/' + dd + '/' + yyyy;
  }
  return String(val).trim();
}
