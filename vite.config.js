import { resolve } from 'path';
import { defineConfig} from "vite";

export default defineConfig({
    build:{
        lib:{
            entry: resolve(__dirname, 'src/wcms_restful.js'),
            name: 'wcms-restful-js',
            minify: 'esbuild',
            esbuild:{
                keepNames: true
            },
            fileName:(format) => `wcms-restful.${format}.js`,
            formats:['es', 'umd']
        }
    }
});