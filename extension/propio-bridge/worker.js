import { createBridgeWorker } from './bridge-worker.js';
import { installProfileWorkspace } from './workspace-profile.js';
import { installBackgroundTabs } from './background-tabs.js';
import { installWindowLauncher } from './window-launcher.js';
const bridge = createBridgeWorker(chrome);
bridge.install();
installBackgroundTabs(chrome, bridge.refreshBackground);
installProfileWorkspace(chrome);
installWindowLauncher(chrome);
