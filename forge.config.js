import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import packageJson from './package.json' with { type: 'json' };

const iconPath = './public/favicon/biosignal.ico'
const { version } = packageJson;

const config = {
    packagerConfig: {
        asar: true,
        executableName: 'Biosignal-Labeling',
        name: 'Biosignal Labeling',
        appBundleId: 'vn.edu.hust.biosignal-labeling',
        appCategoryType: 'public.app-category.productivity',
        icon: iconPath,
        ignore: [
            /node_modules\/(?!(better-sqlite3|bindings|file-uri-to-path)\/)/,
        ],
    },
    rebuildConfig: {
        onlyModules: ['better-sqlite3'],
        force: true,
        which_module: true
    },
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            platforms: ['win32'],
            config: (arch) => ({
                name: 'Biosignal-Labeling',
                exe: 'Biosignal-Labeling.exe',
                iconUrl: 'https://raw.githubusercontent.com/tuan6100/Bioelectrical-Signals-Labeling/refs/heads/main/public/favicon/biosignal.ico',
                noMsi: true,
                setupExe: `biosignal-labeling-${version}-win32-${arch}-setup.exe`,
                setupIcon: iconPath,
            }),
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {},
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {},
        },
    ],
    plugins: [
        {
            name: '@electron-forge/plugin-vite',
            config: {
                // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
                // If you are familiar with Vite configuration, it will look really familiar.
                build: [
                    {
                        // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                        config: 'vite.main.config.js',
                        target: 'main',
                    },
                    {
                        config: 'vite.preload.config.js',
                        target: 'preload',
                    },
                ],
                renderer: [
                    {
                        name: 'main_window',
                        config: 'vite.renderer.config.js',
                    },
                ],
            },
        },
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
        {
            name: '@electron-forge/plugin-auto-unpack-natives',
            config: {}
        }
    ],
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'tuan6100',
                    name: 'Bioelectrical-Signals-Labeling'
                },
                prerelease: true
            }
        }
    ],
};

export default config