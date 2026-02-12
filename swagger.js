const swaggerJSDoc = require("swagger-jsdoc");

const baseUrl = process.env.SWAGGER_SERVER_URL || "http://localhost:3000";

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "LevelUp API",
      version: "1.0.0",
      description: "API REST JSON de l'application LevelUp",
      contact: {
        name: "LevelUp",
      },
    },

    servers: [
      { url: baseUrl, description: "Server" },
      { url: "http://localhost:3000", description: "Local" },
    ],

    tags: [
      { name: "Auth", description: "Authentification (JWT)" },
      { name: "Users", description: "Profil utilisateur et priorites" },
      { name: "UserGoals", description: "Objectifs utilisateur (XP, cadence, archive)" },
      { name: "GoalTemplates", description: "Catalogue de templates d'objectifs" },
      { name: "Onboarding", description: "Questions et calcul des priorites" },
      { name: "Categories", description: "Categories" },
      { name: "Quotes", description: "Citation du jour" },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    // Toutes les routes sont protegees par defaut.
    // Pour une route publique, mettre `security: []` sur l'endpoint.
    security: [{ bearerAuth: [] }],
  },

  apis: ["./routes/**/*.js"],
});

module.exports = swaggerSpec;
