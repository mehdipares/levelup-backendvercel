// models/OnboardingQuestion.js
module.exports = (sequelize, DataTypes) => {
  const OnboardingQuestion = sequelize.define('OnboardingQuestion', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    question: { type: DataTypes.TEXT, allowNull: false },
    language: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'fr' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'onboarding_questions',
    timestamps: true,
    underscored: false,
  });

  OnboardingQuestion.associate = (models) => {
    OnboardingQuestion.hasMany(models.OnboardingQuestionWeight, {
      foreignKey: 'question_id',
      as: 'Weights',
      onDelete: 'CASCADE',
    });
    OnboardingQuestion.hasMany(models.UserQuestionnaireAnswer, {
      foreignKey: 'question_id',
      as: 'Answers',
      onDelete: 'CASCADE',
    });
  };

  return OnboardingQuestion;
};
