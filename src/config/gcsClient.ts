import getEnv from '#utils/checkEnvVariables.js';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  credentials: {
    client_email: getEnv('GCP_CREDENTIALS_CLIENT_EMAIL'),
    private_key: getEnv('GCP_CREDENTIALS_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },
  projectId: getEnv('GCP_CREDENTIALS_PROJECT_ID'),
});

export const bucket = storage.bucket(getEnv('GCP_BUCKET_NAME'));

export default storage;
