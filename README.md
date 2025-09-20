# Voice Transcription MVP (Frontend-only)

Este proyecto es un MVP en React + Vite que captura audio del micrófono en el navegador, lo remuestrea a 16 kHz PCM y lo envía a la API de Realtime de AssemblyAI mediante WebSocket. Muestra transcripciones parciales y finales en la UI. No requiere backend para pruebas locales (no recomendado para producción).

## Requisitos
- Node 18+
- Cuenta y API Key de AssemblyAI

## Instalación

```
npm install
```

Dependencias clave: `assemblyai`. También está instalado `node-record-lpcm16` por requerimiento, pero no se usa en navegador.

## Configuración

Crear archivo `.env.local` en la raíz con:

```
VITE_ASSEMBLYAI_API_KEY=tu_api_key
```

Nota: Exponer la API Key en frontend no es seguro. Para producción, usa tokens efímeros.

## Ejecutar en desarrollo

```
npm run dev
```

Abre `http://localhost:5173` y pulsa “Iniciar”. Concede permiso al micrófono.

## Estructura relevante
- `src/utils/audio.ts`: captura micrófono y remuestreo a 16 kHz PCM.
- `src/hooks/useAssemblyAIRealtime.ts`: conexión WebSocket a AssemblyAI y manejo de mensajes.
- `src/App.tsx`: interfaz mínima para iniciar/detener y visualizar la transcripción.

## Producción
No expongas tu API Key. Implementa un backend que emita tokens efímeros (short-lived) para el websocket de AssemblyAI.


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
