import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { hasPermission } from '../config/rbac';

/**
 * PermissionGuard — route protection component.
 * Verifies that the authenticated user possesses the required permission.
 * Redirects to '/' if unauthorized.
 *
 * @example
 *   <PermissionGuard permission="invoices.read">
 *     <InvoiceList />
 *   </PermissionGuard>
 */
export default function PermissionGuard({ permission, children, redirectTo = '/' }) {
  const { user } = useAuthStore();
  const userRole = user?.role || 'viewer';

  if (permission && !hasPermission(userRole, permission)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
