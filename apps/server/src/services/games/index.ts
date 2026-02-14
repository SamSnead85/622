import { registerGameHandler } from '../gameEngine.js';
import { triviaHandler } from './triviaHandler.js';
import { jeopardyHandler } from './jeopardyHandler.js';
import { predictHandler } from './predictHandler.js';
import { wavelengthHandler } from './wavelengthHandler.js';
import { infiltratorHandler } from './infiltratorHandler.js';
import { cipherHandler } from './cipherHandler.js';
import { wouldYouRatherHandler } from './wouldYouRatherHandler.js';
import { twoTruthsHandler } from './twoTruthsHandler.js';
import { sketchDuelHandler } from './sketchDuelHandler.js';
import { wheelOfFortuneHandler } from './wheelOfFortuneHandler.js';
import { familyFeudHandler } from './familyFeudHandler.js';

// Register all game handlers
registerGameHandler(triviaHandler);
registerGameHandler(jeopardyHandler);
registerGameHandler(predictHandler);
registerGameHandler(wavelengthHandler);
registerGameHandler(infiltratorHandler);
registerGameHandler(cipherHandler);
registerGameHandler(wouldYouRatherHandler);
registerGameHandler(twoTruthsHandler);
registerGameHandler(sketchDuelHandler);
registerGameHandler(wheelOfFortuneHandler);
registerGameHandler(familyFeudHandler);
