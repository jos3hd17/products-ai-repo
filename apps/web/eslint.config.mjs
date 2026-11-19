import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config(...tseslint.configs.recommended, {files:['src/**/*.ts'],languageOptions:{globals:{...globals.browser,...globals.node}},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}});
