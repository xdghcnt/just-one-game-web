"tsc -p ./tsconfig.client.json"

const path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/client/app.tsx',
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    configFile: 'tsconfig.client.json'
                }
            },
        ],
    },
    resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    externals: {
        'react': 'React',
        'react-dom': 'ReactDOM'
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public'),
    },
};