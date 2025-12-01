// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    pnpm: true,
  },
  {
    files: ['test/fixtures/packager/bun/package.json'],
    rules: {
      'jsonc/comma-dangle': ['warn', 'always'],
      'jsonc/no-comments': 'off',
    },
  },
)
