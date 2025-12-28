import { readFileSync } from 'fs';
import path from 'node:path';
import {app} from "electron";

let configData = {}

try {
    const configPath = app.isPackaged
        ? path.join(process.resourcesPath, 'config', 'production.json')
        : path.join(process.cwd(), 'config', 'dev.json');
    console.log('Loading config from:', configPath);
    const data = readFileSync(configPath, 'utf8');
    configData = JSON.parse(data);
    console.log('Loaded config:', JSON.stringify(configData, null, 2));
} catch (error) {
    console.warn('Could not load config, using empty config:', error.message);
}

export const appConfig = {
    get(key, defaultValue = undefined) {
        const keys = key.split('.');
        let value = configData;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }
        return value;
    },
    has: (key) => {
        const keys = key. split('.');
        let value = configData;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return false;
            }
        }
        return true;
    }
};

export default appConfig;