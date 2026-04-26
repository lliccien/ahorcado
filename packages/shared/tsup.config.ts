import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  // clean intencionalmente en false: turbo lanza `build` y `dev` del shared en
  // paralelo (uno por dependsOn ^build, otro como dev del workspace) y ambos
  // colisionan al unlinkear dist/. Como los nombres de salida son fijos los
  // archivos se sobrescriben sin problema.
  clean: false,
  target: 'es2022',
  splitting: false,
  treeshake: true,
});
