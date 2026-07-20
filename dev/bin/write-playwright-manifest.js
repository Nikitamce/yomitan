#!/usr/bin/env node
import fs from 'node:fs';
import {ManifestUtil} from '../manifest-util.js';

const manifestUtil = new ManifestUtil();
const variant = manifestUtil.getManifest('chrome-playwright');
const text = ManifestUtil.createManifestString(variant).replaceAll('$YOMITAN_VERSION', '0.0.0.0');
fs.writeFileSync(new URL('../../ext/manifest.json', import.meta.url), text);
const parsed = JSON.parse(text);
console.log('manifest written', {
    default_locale: parsed.default_locale,
    name: parsed.name,
    hasLocales: fs.existsSync(new URL('../../ext/_locales/ru/messages.json', import.meta.url)),
});
