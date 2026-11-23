import { installOriginalPortal } from './original-portal-content.js';
import { installPortalDarkMode } from './portal-dark-mode.js';
import { installAcwPill } from './acw-pill.js';
installOriginalPortal(chrome, { window, document });
installPortalDarkMode(chrome, { window, document });
installAcwPill(chrome, { window, document });
