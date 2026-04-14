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
      fileIds?: number[];
      files?: Express.MulterFile[];
      ignore?: boolean;
      user?: { email: string; id: number };
    }
  }
}

export {};
