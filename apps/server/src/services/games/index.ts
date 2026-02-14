import { registerGameHandler } from '../gameEngine.js';
import { triviaHandler } from './triviaHandler.js';
import { predictHandler } from './predictHandler.js';
import { wavelengthHandler } from './wavelengthHandler.js';
import { infiltratorHandler } from './infiltratorHandler.js';
import { cipherHandler } from './cipherHandler.js';
import { wouldYouRatherHandler } from './wouldYouRatherHandler.js';
import { twoTruthsHandler } from './twoTruthsHandler.js';
import { sketchDuelHandler } from './sketchDuelHandler.js';

// Register all game handlers
registerGameHandler(triviaHandler);
registerGameHandler(predictHandler);
registerGameHandler(wavelengthHandler);
registerGameHandler(infiltratorHandler);
registerGameHandler(cipherHandler);
registerGameHandler(wouldYouRatherHandler);
registerGameHandler(twoTruthsHandler);
registerGameHandler(sketchDuelHandler);
