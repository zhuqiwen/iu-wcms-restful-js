import { resolve } from 'path';
import { defineConfig} from "vite";

export default defineConfig({


    build:{
        minify:false,
        lib:{
            entry: resolve(__dirname, 'src/wcms_restful.js'),
            name: 'wcms-restful-js',
            minify: 'terser',
            // target: 'esnext',
            fileName:(format) => `wcms-restful.${format}.js`,
            formats:['es', 'umd']
        }
    },
    // terserOptions:{
    //   mangle:false
    // },
    // esbuild: {
    //     minifyIdentifiers: false, // Prevents converting 'baseUrl' to 'e'
    //     keepNames: true,          // Preserves original names of functions and classes
    // }
});