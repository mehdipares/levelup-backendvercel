// models/usergoalcompletion.js
module.exports = (sequelize, DataTypes) => {
  const UserGoalCompletion = sequelize.define('UserGoalCompletion', {
    user_goal_id: { type: DataTypes.INTEGER, allowNull: false, field: 'user_goal_id' },
    completed_at: { type: DataTypes.DATE,    allowNull: false, field: 'completed_at', defaultValue: DataTypes.NOW },
    xp_awarded:   { type: DataTypes.INTEGER, allowNull: false, field: 'xp_awarded' },
    period_key:   { type: DataTypes.STRING(32), allowNull: true, field: 'period_key' }
  }, {
    tableName: 'user_goal_completions',
    timestamps: true,
  });

  UserGoalCompletion.associate = (models) => {
    UserGoalCompletion.belongsTo(models.UserGoal, { foreignKey: 'user_goal_id', as: 'UserGoal' });
  };

  return UserGoalCompletion;
};
