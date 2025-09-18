// models/usergoal.js
module.exports = (sequelize, DataTypes) => {
  const UserGoal = sequelize.define('UserGoal', {
    user_id:     { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    template_id: { type: DataTypes.INTEGER, allowNull: false, field: 'template_id' },

    status: { type: DataTypes.ENUM('active', 'archived'), allowNull: false, defaultValue: 'active' },

    // ✅ OVERRIDES DE CADENCE (ce que PATCH /schedule met à jour)
    // Laisse allowNull:true pour "hériter" des valeurs du template quand pas défini
    frequency_type_override: {
      // si ta colonne est VARCHAR dans MySQL, STRING marche très bien
      // si c’est un ENUM en DB, garde uniquement des valeurs autorisées
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'frequency_type_override',
      validate: { isIn: [['once', 'daily', 'weekly', 'monthly', 'custom', null]] }
    },
    frequency_interval_override: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'frequency_interval_override'
    },
    week_start_override: {
      // 1 = lundi, etc. (null inutile en daily)
      type: DataTypes.TINYINT,
      allowNull: true,
      field: 'week_start_override'
    },
    max_per_period_override: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_per_period_override'
    },

    last_completed_at: { type: DataTypes.DATE, allowNull: true, field: 'last_completed_at' },
  }, {
    tableName: 'user_goals',
    timestamps: true,
    indexes: [
      { name: 'uq_user_template', unique: true, fields: ['user_id', 'template_id'] }
    ]
  });

  UserGoal.associate = (models) => {
    UserGoal.belongsTo(models.User,         { foreignKey: 'user_id',     as: 'User' });
    UserGoal.belongsTo(models.GoalTemplate, { foreignKey: 'template_id', as: 'GoalTemplate' });
    UserGoal.hasMany(models.UserGoalCompletion, { foreignKey: 'user_goal_id', as: 'Completions' });
  };

  return UserGoal;
};
