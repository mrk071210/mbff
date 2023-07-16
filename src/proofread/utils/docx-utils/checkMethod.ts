import * as crypto from 'crypto';
import got from 'got';
const APISecret = '';
const APIKey = '';

const checkMethod = async (text) => {
  const host = 'api.xf-yun.com';
  const date = new Date().toUTCString();

  const signature_origin = `host: ${host}\ndate: ${date}\nPOST /v1/private/s9a87e3ec HTTP/1.1`;
  console.log();
  const signature_sha = crypto
    .createHmac('sha256', APISecret)
    .update(signature_origin)
    .digest();
  const signature = signature_sha.toString('base64');
  const authorization_origin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorization_origin).toString('base64');

  const url = `https://api.xf-yun.com/v1/private/s9a87e3ec?${encodeURI(
    `authorization=${authorization}&host=${host}&date=${date}`,
  )}`;
  let response, responseErr;
  try {
    response = await got.post(url, {
      json: {
        header: {
          app_id: 'f164c8eb',
          status: 3,
        },
        parameter: {
          s9a87e3ec: {
            result: {
              encoding: 'utf8',
              compress: 'raw',
              format: 'json',
            },
          },
        },
        payload: {
          input: {
            encoding: 'utf8',
            compress: 'raw',
            format: 'json',
            status: 3,
            text: Buffer.from(text).toString('base64'),
          },
        },
      } as any,
    });
  } catch (err) {
    response = { timings: err.timings, ...err.response };
    responseErr = err;
  }
  if (response.statusCode === 200) {
    let result = {};
    try {
      result = JSON.parse(response.body);
    } catch (e) {
      throw e;
    }
    return result;
  } else {
    return {};
  }

  // if (result.header.code === 0) {
  //     const text = Buffer.from(result.payload.result.text, "base64").toString()
  //     console.log(text)
  //     return text
  // } else {
  //     return {}
  // }
};

export default checkMethod;
