import got from 'got';
import ch from 'chalk';
import jimp from 'jimp';
import url from 'node:url';
import path from 'node:path';
import { randomBytes as rb } from 'node:crypto';
import { fileTypeFromBuffer as ftfb } from 'file-type';
import { writeFileSync as wf, readFileSync as rf, existsSync as ex, rmSync as rm } from 'node:fs';
import RPC from './RPC.mjs';

class HTTP extends RPC {
    config;
    files;
    dirname;

    constructor() {
        super(RPC.getAppID());
        this.files = [];
        this.config = JSON.parse(rf('config.json'));
        this.dirname = path.dirname(url.fileURLToPath(import.meta.url));
    }

    async init(handler) {
        await super.init(handler);
        this.updateRPC('morbius', 'ඞ')
    }

    #exRm(path) {
        try {
            if (ex(path)) rm(path);
        } catch (err) {
            if (err.path && ex(err.path)) {
                console.log(ch.redBright(
                    `WARNING: During cleanup, ${err.path} was not deleted due to error '${err.code}'`
                ));
            }
        }
    }
    async close() {
        await super.close();
        for (const file of this.files) {
            this.#exRm(path);   
        }
    }

    /**
     * Fetch URL
     * @param {string} url The URL to fetch
     * @param {boolean} save Whether or not to save the file, default true
     * @returns {Buffer|string} If save is false, the fetched buffer will be returned, otherwise a temporary file path will be returned
     */
    async fetch(url, save = true, cnvimg = true) {
        try {
            const res = await got(url).buffer();
            if (!save) return res;
            const bytes = rb(32)
                .toString('base64url')
                .substring(0, 9);
            const { mime, ext } = await ftfb(res);
            const isImg = mime.includes('image');
            const isPng = isImg ? ext === 'png' : false;
            const toCnv = isImg && !isPng && cnvimg;
            const fname = toCnv ? path.join(this.config.tmp, `${bytes}.png`) : path.join(this.config.tmp, `${bytes}.${ext}`);
            this.files.push(fname);
            if (toCnv) {
                const img = await jimp.read(res);
            img.write(fname);
            } else {
                wf(fname, res);
            }
            return fname;
        } catch (err) {
            console.error(err);
            console.error('Falling back to placeholder image');
            return path.join(this.dirname, 'collection.png');
        }
    }
}

export default HTTP;