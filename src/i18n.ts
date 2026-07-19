import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Minimal translation resources for demonstration.
// In a real enterprise app, these would be in separate JSON files loaded via HTTP.
const resources = {
  en: {
    translation: {
      "welcome": "Welcome to SpotCLM Academy",
      "courses": "Courses",
      "certifications": "Certifications",
      "login": "Log In",
      "signup": "Sign Up",
      "dashboard": "Dashboard"
    }
  },
  es: {
    translation: {
      "welcome": "Bienvenido a SpotCLM Academy",
      "courses": "Cursos",
      "certifications": "Certificaciones",
      "login": "Acceder",
      "signup": "Registrarse",
      "dashboard": "Panel"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
