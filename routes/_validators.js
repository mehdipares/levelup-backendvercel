// Schemas Yup utilises pour valider les bodies des routes cote serveur.
// Defense en profondeur : meme logique cote front (UX), mais le back reste
// l'autorite finale, conformement aux recommandations OWASP/ANSSI
// ("valider systematiquement les entrees").
//
// NB : ne pas confondre avec routes/_schemas.js (commentaires Swagger pour la doc OpenAPI).
const yup = require('yup');

// --- Helpers communs ---
const emailRule = yup
  .string()
  .trim()
  .lowercase()
  .email('Email invalide')
  .max(255, 'Email trop long')
  .required('Email requis');

const passwordRule = yup
  .string()
  .min(8, 'Mot de passe trop court (8 caracteres minimum)')
  .max(128, 'Mot de passe trop long')
  .required('Mot de passe requis');

const usernameRule = yup
  .string()
  .trim()
  .min(2, 'Pseudo trop court')
  .max(50, 'Pseudo trop long')
  .matches(/^[\w .\-']+$/u, 'Pseudo contient des caracteres invalides')
  .required('Pseudo requis');

// --- Auth ---
const registerSchema = yup.object({
  username: usernameRule,
  email: emailRule,
  password: passwordRule,
});

const loginSchema = yup.object({
  email: emailRule,
  password: yup.string().required('Mot de passe requis'),
});

// --- Users ---
const updateProfileSchema = yup.object({
  email: emailRule.notRequired(),
  username: usernameRule.notRequired(),
}).test(
  'at-least-one-field',
  'Au moins un champ doit etre fourni (email ou username)',
  (v) => Boolean(v && (v.email || v.username))
);

const reorderPrioritiesSchema = yup.object({
  ordered_category_ids: yup
    .array()
    .of(yup.number().integer().positive())
    .min(1, 'Liste vide')
    .max(50, 'Trop d\'elements')
    .required('ordered_category_ids requis'),
});

// --- Goal templates ---
const cadenceRule = yup
  .string()
  .oneOf(['daily', 'weekly', 'once', 'monthly', 'custom'], 'Cadence invalide');

const createTemplateSchema = yup.object({
  title: yup.string().trim().min(2).max(120).required('Titre requis'),
  description: yup.string().trim().max(1000).notRequired(),
  category_id: yup.number().integer().positive().nullable().notRequired(),
  base_xp: yup.number().integer().min(1).max(10000).notRequired(),
  frequency_type: cadenceRule.notRequired(),
  frequency_interval: yup.number().integer().min(1).max(366).notRequired(),
  week_start: yup.number().integer().min(0).max(6).notRequired(),
  max_per_period: yup.number().integer().min(1).max(100).notRequired(),
  visibility: yup.string().oneOf(['global', 'private', 'unlisted']).notRequired(),
  enabled: yup.boolean().notRequired(),
});

const toggleEnabledSchema = yup.object({
  enabled: yup.boolean().required('enabled requis'),
});

// --- User goals ---
const addUserGoalSchema = yup.object({
  template_id: yup.number().integer().positive().required('template_id requis'),
  cadence: yup.string().oneOf(['daily', 'weekly'], 'Cadence invalide (daily|weekly)').required('Cadence requise'),
});

const scheduleUserGoalSchema = yup.object({
  cadence: yup.string().oneOf(['daily', 'weekly'], 'Cadence invalide (daily|weekly)').required('Cadence requise'),
});

// --- Onboarding ---
const onboardingAnswersSchema = yup.object({
  user_id: yup.number().integer().positive().nullable().notRequired(),
  language: yup.string().max(8).notRequired(),
  answers: yup
    .array()
    .of(yup.object({
      question_id: yup.number().integer().positive().required(),
      value: yup.number().integer().min(1).max(5).required(),
    }))
    .min(1, 'Au moins une reponse requise')
    .max(100, 'Trop de reponses')
    .required('answers requis'),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  reorderPrioritiesSchema,
  createTemplateSchema,
  toggleEnabledSchema,
  addUserGoalSchema,
  scheduleUserGoalSchema,
  onboardingAnswersSchema,
};
