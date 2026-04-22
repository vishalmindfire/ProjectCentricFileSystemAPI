import getEnv from '#utils/checkEnvVariables.js';
import fs from 'fs';

const httpsOptions = {
  passphrase: getEnv('CERTIFICATE_PASS'),
  pfx: fs.readFileSync(getEnv('CERTIFICATE')),
};

export default httpsOptions;
