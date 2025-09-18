// models/UserQuestionnaireAnswer.js
module.exports = (sequelize, DataTypes) => {
  const UserQuestionnaireAnswer = sequelize.define('UserQuestionnaireAnswer', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    submission_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    question_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    answer_value: { type: DataTypes.TINYINT, allowNull: false }, // 1..5 (check DB déjà posé)
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'user_questionnaire_answers',
    timestamps: false, // pas d’updatedAt
    underscored: false,
    indexes: [
      { unique: true, fields: ['submission_id', 'question_id'], name: 'uq_uqa_submission_question' },
      { fields: ['user_id'], name: 'idx_uqa_user' },
      { fields: ['question_id'], name: 'idx_uqa_question' },
    ],
  });

  UserQuestionnaireAnswer.associate = (models) => {
    UserQuestionnaireAnswer.belongsTo(models.UserOnboardingSubmission, {
      foreignKey: 'submission_id',
      as: 'Submission',
      onDelete: 'CASCADE',
    });
    UserQuestionnaireAnswer.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User',
      onDelete: 'CASCADE',
    });
    UserQuestionnaireAnswer.belongsTo(models.OnboardingQuestion, {
      foreignKey: 'question_id',
      as: 'Question',
      onDelete: 'CASCADE',
    });
  };

  return UserQuestionnaireAnswer;
};
