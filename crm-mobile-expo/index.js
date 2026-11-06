import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and also handles the platform-specific entry setup for Expo Go / dev
// clients / bare workflow, so this replaces the manual AppRegistry call.
registerRootComponent(App);
