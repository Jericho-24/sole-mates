export const ADMIN_UID = "9GK7BzAsUiX5Ogn5VGzzkUQm2oy2";

export function hasAdminAccess(uid) {
  return uid === ADMIN_UID;
}
