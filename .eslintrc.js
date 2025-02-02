module.exports = {
    extends: ['next/core-web-vitals'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-empty-interface': 'warn'
    }
  }