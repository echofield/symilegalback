// eslint.config.js
export default (async () => {
  try {
    const js = await import('@eslint/js');
    return [js.configs.recommended];
  } catch (error) {
    return [
      {
        languageOptions: {
          ecmaVersion: 2021,
          sourceType: 'module',
        },
        rules: {},
      },
    ];
  }
})();
