// Environnement TEST : ce repo ne doit jamais parler au backend de production
// (sinon les formulaires alimenteraient le vrai CRM Odoo).
const host = window.location.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1';
const isTest = host === 'test.aymenpromotion-dz.com';

export const API_BASE_URL = isLocal
  ? 'http://localhost:5000'
  : isTest
    ? 'https://backend.test.aymenpromotion-dz.com'
    : 'https://backend.aymenpromotion-dz.com';

export const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'https://strapi.aymenpromotion-dz.com'; 

// Configuration du worker PDF pour qu'il pointe vers le fichier local dans public/
export const PDF_WORKER_URL = '/pdf.worker.min.mjs';

const config = {
  API_BASE_URL,
  STRAPI_URL,
  PDF_WORKER_URL,
};

export default config;
