/**
 * Enterprise RBAC Configuration & Permission Matrix
 *
 * Roles:
 * - super_admin (Super Admin)
 * - company_admin (Company Admin)
 * - dispatcher (Dispatcher)
 * - finance (Finance)
 * - fleet (Fleet Manager)
 * - warehouse (Warehouse Operator)
 * - driver (Driver)
 * - vendor (Vendor)
 * - viewer (Viewer)
 *
 * Actions:
 * - create, read, update, delete, approve, export, import, manage_users, manage_settings
 */

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Super Admin: Full access to everything
  super_admin: ['*'],
  admin: ['*'], // Alias for backward compatibility

  // Company Admin: Manage tenant business, users, settings
  company_admin: [
    'orders.read', 'orders.create', 'orders.update', 'orders.delete', 'orders.approve', 'orders.export', 'orders.import',
    'invoices.read', 'invoices.create', 'invoices.update', 'invoices.delete', 'invoices.approve', 'invoices.export',
    'assignments.read', 'assignments.create', 'assignments.update', 'assignments.delete',
    'travel_funds.read', 'travel_funds.create', 'travel_funds.update', 'travel_funds.delete', 'travel_funds.approve',
    'clients.read', 'clients.create', 'clients.update', 'clients.delete',
    'vendors.read', 'vendors.create', 'vendors.update', 'vendors.delete',
    'fleet.read', 'fleet.create', 'fleet.update', 'fleet.delete',
    'drivers.read', 'drivers.create', 'drivers.update', 'drivers.delete',
    'locations.read', 'locations.create', 'locations.update', 'locations.delete',
    'users.read', 'users.create', 'users.update', 'users.delete', 'users.manage_users',
    'settings.manage_settings',
  ],

  // Dispatcher: Manage transport orders, assignments, drop points, vendors, & fleet
  dispatcher: [
    'orders.read', 'orders.create', 'orders.update', 'orders.export',
    'assignments.read', 'assignments.create', 'assignments.update',
    'fleet.read', 'fleet.create', 'fleet.update',
    'drivers.read', 'drivers.create', 'drivers.update',
    'vendors.read', 'vendors.create', 'vendors.update',
    'clients.read', 'clients.create', 'clients.update',
    'locations.read', 'locations.create', 'locations.update',
    'travel_funds.read', 'travel_funds.create', 'travel_funds.update',
  ],

  // Finance: Manage invoices, travel funds, approvals, & financial reports
  finance: [
    'invoices.read', 'invoices.create', 'invoices.update', 'invoices.approve', 'invoices.export',
    'travel_funds.read', 'travel_funds.create', 'travel_funds.update', 'travel_funds.approve', 'travel_funds.export',
    'orders.read', 'orders.create', 'orders.update', 'orders.approve', 'orders.export',
    'clients.read', 'clients.create', 'clients.update',
    'vendors.read', 'vendors.create', 'vendors.update',
  ],

  // Fleet Manager: Manage fleet units, drivers, maintenance, & assignments
  fleet: [
    'fleet.read', 'fleet.create', 'fleet.update', 'fleet.delete', 'fleet.export',
    'drivers.read', 'drivers.create', 'drivers.update', 'drivers.delete',
    'vendors.read', 'vendors.create', 'vendors.update', 'vendors.delete',
    'assignments.read', 'assignments.create', 'assignments.update',
    'orders.read', 'orders.create', 'orders.update',
    'locations.read', 'locations.create', 'locations.update',
  ],

  // Warehouse Operator: View delivery orders, update POD drop status
  warehouse: [
    'orders.read', 'orders.update',
    'locations.read',
    'clients.read',
  ],

  // Driver: View assigned trips, update trip status, view travel funds
  driver: [
    'assignments.read',
    'orders.read',
    'travel_funds.read',
  ],

  // Vendor: View assigned fleet units and vendor details
  vendor: [
    'fleet.read',
    'vendors.read',
    'orders.read',
  ],

  // Viewer: Read-only access across all business modules
  viewer: [
    'orders.read',
    'invoices.read',
    'assignments.read',
    'travel_funds.read',
    'clients.read',
    'vendors.read',
    'fleet.read',
    'drivers.read',
    'locations.read',
  ],
};

/**
 * Checks whether a role possesses a required permission string.
 * Supports wildcards (e.g. '*' or 'orders.*').
 */
export function hasPermission(role: string, requiredPermission: string): boolean {
  if (!role) return false;

  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['viewer'] || [];

  // Super admin wildcard
  if (permissions.includes('*')) return true;

  // Exact match
  if (permissions.includes(requiredPermission)) return true;

  // Domain wildcard (e.g., 'orders.*' matches 'orders.read')
  const [domain] = requiredPermission.split('.');
  if (domain && permissions.includes(`${domain}.*`)) return true;

  return false;
}
