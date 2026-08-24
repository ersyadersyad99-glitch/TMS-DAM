/**
 * Frontend RBAC Configuration & Permission Evaluator
 */

export const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: ['*'],
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
  finance: [
    'invoices.read', 'invoices.create', 'invoices.update', 'invoices.approve', 'invoices.export',
    'travel_funds.read', 'travel_funds.create', 'travel_funds.update', 'travel_funds.approve', 'travel_funds.export',
    'orders.read', 'orders.create', 'orders.update', 'orders.approve', 'orders.export',
    'clients.read', 'clients.create', 'clients.update',
    'vendors.read', 'vendors.create', 'vendors.update',
  ],
  fleet: [
    'fleet.read', 'fleet.create', 'fleet.update', 'fleet.delete', 'fleet.export',
    'drivers.read', 'drivers.create', 'drivers.update', 'drivers.delete',
    'vendors.read', 'vendors.create', 'vendors.update', 'vendors.delete',
    'assignments.read', 'assignments.create', 'assignments.update',
    'orders.read', 'orders.create', 'orders.update',
    'locations.read', 'locations.create', 'locations.update',
  ],
  warehouse: [
    'orders.read', 'orders.update',
    'locations.read',
    'clients.read',
  ],
  driver: [
    'assignments.read',
    'orders.read',
    'travel_funds.read',
  ],
  vendor: [
    'fleet.read',
    'vendors.read',
    'orders.read',
  ],
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

export function hasPermission(userRole, requiredPermission) {
  if (!userRole) return false;
  if (!requiredPermission) return true;

  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['viewer'] || [];

  if (permissions.includes('*')) return true;
  if (permissions.includes(requiredPermission)) return true;

  const [domain] = requiredPermission.split('.');
  if (domain && permissions.includes(`${domain}.*`)) return true;

  return false;
}
