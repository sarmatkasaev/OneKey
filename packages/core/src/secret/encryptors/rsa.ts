import { KEYUTIL, KJUR } from 'jsrsasign';

// import flowLogger from '@onekeyhq/shared/src/logger/flowLogger/flowLogger';

import type { RSAKey } from 'jsrsasign';

const KEY_LENGTH = 1024;

function rsaGenerateKeypair() {
  const rsaKeypair = KEYUTIL.generateKeypair('RSA', KEY_LENGTH);
  return {
    publicKey: KEYUTIL.getPEM(rsaKeypair.pubKeyObj),
    privateKey: KEYUTIL.getPEM(rsaKeypair.prvKeyObj, 'PKCS8PRV'),
  };
}

// data.length < 100
function rsaEncrypt(publicKey: string, data: string) {
  try {
    const pubKeyObj = KEYUTIL.getKey(publicKey);
    return KJUR.crypto.Cipher.encrypt(data, pubKeyObj as RSAKey, 'RSA');
  } catch (error) {
    // flowLogger.error.log('rsa encrypt fail = ', error);
    return false;
  }
}

function rsaDecrypt(privateKey: string, encryptData: string) {
  try {
    const prvKeyObj = KEYUTIL.getKey(privateKey) as RSAKey;
    return KJUR.crypto.Cipher.decrypt(encryptData, prvKeyObj, 'RSA');
  } catch (error) {
    // flowLogger.error.log('rsa decrypt fail = ', error);
    return false;
  }
}

export { rsaGenerateKeypair, rsaEncrypt, rsaDecrypt };
