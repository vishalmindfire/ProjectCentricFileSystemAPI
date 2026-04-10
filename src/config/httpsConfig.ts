import getEnv from '#utils/checkEnvVariables.js';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(getEnv('CERTIFICATE'));

const httpsOptions = {
  passphrase: getEnv('CERTIFICATE_PASS'),
  pfx: fs.readFileSync(__filename),
};

export default httpsOptions;
