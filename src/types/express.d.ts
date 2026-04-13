declare global {
  namespace Express {
    interface MulterFile {
      destination: string;
      encoding: string;
      fieldname: string;
      filename: string;
      mimetype: string;
      originalname: string;
      path: string;
      size: number;
    }

    interface Request {
      files?: Express.MulterFile[];
      user?: { email: string; id: number };
    }
  }
}

export {};
