import { registerGameHandler } from '../gameEngine.js';
import { triviaHandler } from './triviaHandler.js';
import { predictHandler } from './predictHandler.js';
import { wavelengthHandler } from './wavelengthHandler.js';
import { infiltratorHandler } from './infiltratorHandler.js';
import { cipherHandler } from './cipherHandler.js';

// Register all game handlers
registerGameHandler(triviaHandler);
registerGameHandler(predictHandler);
registerGameHandler(wavelengthHandler);
registerGameHandler(infiltratorHandler);
registerGameHandler(cipherHandler);
