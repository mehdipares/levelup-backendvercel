// models/UserOnboardingSubmission.js
module.exports = (sequelize, DataTypes) => {
  const UserOnboardingSubmission = sequelize.define('UserOnboardingSubmission', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, // aligné sur users.id
    submitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'user_onboarding_submissions',
    timestamps: false, // la table n’a pas updatedAt
    underscored: false,
    indexes: [{ fields: ['user_id'], name: 'idx_uos_user' }],
  });

  UserOnboardingSubmission.associate = (models) => {
    UserOnboardingSubmission.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User',
      onDelete: 'CASCADE',
    });
    UserOnboardingSubmission.hasMany(models.UserQuestionnaireAnswer, {
      foreignKey: 'submission_id',
      as: 'Answers',
      onDelete: 'CASCADE',
    });
  };

  return UserOnboardingSubmission;
};
