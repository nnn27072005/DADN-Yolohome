const DEFAULT_DUPLICATE_WINDOW_MS = Number(
  process.env.MQTT_DUPLICATE_WINDOW_MS || 2000
);
const DEFAULT_AUTO_COOLDOWN_MS = Number(
  process.env.DEVICE_AUTO_COOLDOWN_MS || 30000
);
const DEFAULT_MANUAL_COOLDOWN_MS = Number(
  process.env.DEVICE_MANUAL_COOLDOWN_MS || 60000
);

const lastPublishedByFeed = new Map();
const lastAutoCommandByDevice = new Map();
const lastManualCommandByDevice = new Map();

function now() {
  return Date.now();
}

function normalizePayload(payload) {
  return String(payload);
}

function shouldSkipDuplicatePublish(
  feedKey,
  payload,
  duplicateWindowMs = DEFAULT_DUPLICATE_WINDOW_MS
) {
  if (duplicateWindowMs <= 0) {
    return false;
  }

  const payloadString = normalizePayload(payload);
  const previous = lastPublishedByFeed.get(feedKey);
  const currentTime = now();

  if (
    previous &&
    previous.payload === payloadString &&
    currentTime - previous.timestamp < duplicateWindowMs
  ) {
    return true;
  }

  lastPublishedByFeed.set(feedKey, {
    payload: payloadString,
    timestamp: currentTime,
  });
  return false;
}

function recordAutoCommand(deviceName) {
  lastAutoCommandByDevice.set(deviceName, now());
}

function recordManualCommand(deviceName) {
  lastManualCommandByDevice.set(deviceName, now());
}

function isAutoCommandCoolingDown(
  deviceName,
  cooldownMs = DEFAULT_AUTO_COOLDOWN_MS
) {
  if (cooldownMs <= 0) {
    return false;
  }

  const lastCommandAt = lastAutoCommandByDevice.get(deviceName);
  return Boolean(lastCommandAt && now() - lastCommandAt < cooldownMs);
}

function isManualCommandCoolingDown(
  deviceName,
  cooldownMs = DEFAULT_MANUAL_COOLDOWN_MS
) {
  if (cooldownMs <= 0) {
    return false;
  }

  const lastCommandAt = lastManualCommandByDevice.get(deviceName);
  return Boolean(lastCommandAt && now() - lastCommandAt < cooldownMs);
}

module.exports = {
  shouldSkipDuplicatePublish,
  recordAutoCommand,
  recordManualCommand,
  isAutoCommandCoolingDown,
  isManualCommandCoolingDown,
};
