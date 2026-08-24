import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

/**
 * ModuleGuard — checks if a module feature flag is enabled for the current tenant.
 * If disabled, redirects to dashboard '/' or fallback route.
 *
 * @example
 *   <ModuleGuard module="fleet">
 *     <Assignments />
 *   </ModuleGuard>
 */
export default function ModuleGuard({ module, children, redirectTo = '/' }) {
  const { branding } = useTenant();

  if (module && branding.modules && branding.modules[module] === false) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
