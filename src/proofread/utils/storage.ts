import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment-es6';

const month = moment().format('YYYYMM');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      fs.mkdirSync(path.join(process.cwd(), `proofread-uploads/${month}`));
    } catch (e) {}

    cb(null, path.join(process.cwd(), `proofread-uploads/${month}`));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      //   Date.now() +
      //   '-' +
      //   Math.round(Math.random() * 1e9) +
      //   '-' +
      decodeURI(file.originalname);
    cb(null, uniqueSuffix);
  },
});

export { storage };
