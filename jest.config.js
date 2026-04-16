export default {
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleNameMapper: {
    '^#app(\\.js)?$': '<rootDir>/src/app.ts',
    '^#config/(.+?)(\\.js)?$': '<rootDir>/src/config/$1.ts',
    '^#controllers/(.+?)(\\.js)?$': '<rootDir>/src/controllers/$1.ts',
    '^#middleware/(.+?)(\\.js)?$': '<rootDir>/src/middleware/$1.ts',
    '^#models/(.+?)(\\.js)?$': '<rootDir>/src/models/$1.ts',
    '^#routes/(.+?)(\\.js)?$': '<rootDir>/src/routes/$1.ts',
    '^#utils/(.+?)(\\.js)?$': '<rootDir>/src/utils/$1.ts',
    '^#workers/(.+?)(\\.js)?$': '<rootDir>/src/workers/$1.ts',
  },
  modulePaths: ['<rootDir>/src/'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.test.json',
      },
    ],
  },
};
