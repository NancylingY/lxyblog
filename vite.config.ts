import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

/**
 * KTX2Loader 源码用 new URL('../libs/basis/basis_transcoder.*', import.meta.url)
 * 引用一份备用转码器，Vite 会因此把它拷进 dist/assets/；项目在 houseKit.ts 里
 * 已显式 setTranscoderPath('basis/')，这份备用永远不会被请求，构建时直接剔除。
 */
function stripBundledBasisTranscoder(): Plugin {
  return {
    name: 'strip-bundled-basis-transcoder',
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && /^assets\/basis_transcoder-.*\.(wasm|js)$/.test(file.fileName)) {
          delete bundle[file.fileName]
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // 相对路径，适配 GitHub Pages 根路径或子路径部署
  base: './',
  plugins: [vue(), stripBundledBasisTranscoder()],
})
