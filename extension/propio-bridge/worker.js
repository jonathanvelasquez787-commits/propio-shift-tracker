import { createBridgeWorker } from './bridge-worker.js';
import { installProfileWorkspace } from './workspace-profile.js';
createBridgeWorker(chrome).install();
installProfileWorkspace(chrome);
