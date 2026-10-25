/**
 * App-wide configuration constants.
 * Change thresholds and settings here — one place for easy editing.
 */

// Survival status thresholds (percentage)
// These control the colour coding on the map and status badges.
export const STATUS_THRESHOLDS = {
  HEALTHY_MIN: 70,   // >= 70% = green / healthy
  AT_RISK_MIN: 40,   // >= 40% = amber / at risk
  // Below 40% = red / failing
};

// Status label keys (used in i18n and colours)
export const STATUS = {
  HEALTHY: 'healthy',
  AT_RISK: 'at_risk',
  FAILING: 'failing',
  NO_CHECK: 'no_check',
};

// Map marker colours per status
export const STATUS_COLOURS = {
  [STATUS.HEALTHY]: '#4CAF50',   // green
  [STATUS.AT_RISK]: '#FF9800',   // amber
  [STATUS.FAILING]: '#F44336',   // red
  [STATUS.NO_CHECK]: '#9E9E9E',  // grey
};

// Photo compression settings
export const PHOTO_MAX_WIDTH = 1280;
export const PHOTO_QUALITY = 0.7;

// User roles
export const ROLES = {
  VOLUNTEER: 'volunteer',
  COORDINATOR: 'coordinator',
  PARTNER: 'partner',
  ADMIN: 'admin',
};

// Roles that can verify observations
export const CAN_VERIFY = [ROLES.COORDINATOR, ROLES.ADMIN];

// Roles that can manage users and species
export const CAN_ADMIN = [ROLES.ADMIN];

/**
 * Returns the status string for a given survival percentage.
 */
export function getStatus(survivalRate) {
  if (survivalRate === null || survivalRate === undefined) return STATUS.NO_CHECK;
  if (survivalRate >= STATUS_THRESHOLDS.HEALTHY_MIN) return STATUS.HEALTHY;
  if (survivalRate >= STATUS_THRESHOLDS.AT_RISK_MIN) return STATUS.AT_RISK;
  return STATUS.FAILING;
}
