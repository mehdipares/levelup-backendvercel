// models/user.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username:       { type: DataTypes.STRING,  allowNull: true },
    email:          { type: DataTypes.STRING,  allowNull: false, unique: true },
    password_hash:  { type: DataTypes.STRING,  allowNull: true },
    level:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    xp:             { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // ✅ flag onboarding
    onboarding_done:{ type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  User.associate = (models) => {
    // existants
    User.hasMany(models.UserGoal,     { foreignKey: 'user_id', as: 'user_goals' });
    User.hasMany(models.UserPriority, { foreignKey: 'user_id', as: 'preferences' });

    // ✅ onboarding
    User.hasMany(models.UserOnboardingSubmission, {
      foreignKey: 'user_id',
      as: 'onboarding_submissions',
      onDelete: 'CASCADE',
    });
    User.hasMany(models.UserQuestionnaireAnswer, {
      foreignKey: 'user_id',
      as: 'onboarding_answers',
      onDelete: 'CASCADE',
    });
  };

  return User;
};
