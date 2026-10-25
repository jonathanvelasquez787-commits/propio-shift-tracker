import { installOriginalPortal } from './original-portal-content.js';
import { installPortalDarkMode } from './portal-dark-mode.js';
installOriginalPortal(chrome, { window, document });
installPortalDarkMode(chrome, { window, document });
