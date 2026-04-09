import createDefaultPreset from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset.transform;

export default {
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: {
    ...tsJestTransformCfg,
  },
};
