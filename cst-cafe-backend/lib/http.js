// Small helpers shared by all routes.

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Turns "12" into 12, and throws a 400 for anything that is not a positive integer.
function parseId(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return n;
}

function str(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

// Pick the first defined key, so both camelCase and snake_case request bodies work.
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k];
  }
  return undefined;
}

function parseDate(value, label) {
  const ms = Date.parse(String(value));
  if (!value || Number.isNaN(ms)) {
    throw new HttpError(400, `${label} must be a valid date and time`);
  }
  return new Date(ms);
}

module.exports = { HttpError, parseId, str, pick, parseDate };
