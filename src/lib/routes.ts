export const getHomeRouteForRoles = (
  roles?: string[] | null,
  canApproveSubcontracts?: boolean,
) => {
  if (!roles || roles.length === 0) {
    return "/projects";
  }
  if (roles.includes("admin") || roles.includes("gip")) {
    return "/projects";
  }
  if (canApproveSubcontracts) {
    return "/approvals";
  }
  if (roles.includes("accountant")) {
    return "/tasks";
  }
  return "/time-tracking";
};

export const getLoginRedirectPath = (
  requestedPath: string | undefined,
  roles?: string[] | null,
  canApproveSubcontracts?: boolean,
) => {
  if (requestedPath && requestedPath !== "/login" && requestedPath !== "/") {
    return requestedPath;
  }
  return getHomeRouteForRoles(roles, canApproveSubcontracts);
};
