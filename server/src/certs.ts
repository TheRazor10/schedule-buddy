import fs from 'fs';
import path from 'path';
import selfsigned from 'selfsigned';

const CERTS_DIR = path.join(process.cwd(), 'certs');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');

export interface CertPaths {
  cert: string;
  key: string;
}

export function getOrCreateCerts(): CertPaths {
  if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    return { cert: CERT_PATH, key: KEY_PATH };
  }

  console.log('[Certs] Generating self-signed certificate...');

  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  const attrs = [{ name: 'commonName', value: 'Office Server' }];
  const pems = selfsigned.generate(attrs, {
    days: 3650,
    keySize: 2048,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '0.0.0.0' },
        ],
      },
    ],
  });

  fs.writeFileSync(CERT_PATH, pems.cert);
  fs.writeFileSync(KEY_PATH, pems.private);

  console.log('[Certs] Self-signed certificate generated');
  return { cert: CERT_PATH, key: KEY_PATH };
}
