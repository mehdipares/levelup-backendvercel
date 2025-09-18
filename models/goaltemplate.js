// models/goaltemplate.js
module.exports = (sequelize, DataTypes) => {
  const { Op } = sequelize;

  const GoalTemplate = sequelize.define('GoalTemplate', {
    title:         { type: DataTypes.STRING, allowNull: false },
    description:   { type: DataTypes.TEXT, allowNull: true },

    category_id:   { type: DataTypes.INTEGER, allowNull: true,  field: 'category_id' },
    base_xp:       { type: DataTypes.INTEGER, allowNull: false, field: 'base_xp', defaultValue: 40 },

    // 🔹 Propriétaire & visibilité
    owner_user_id: { type: DataTypes.INTEGER, allowNull: true,  field: 'owner_user_id' },
    visibility:    { type: DataTypes.ENUM('global','private','unlisted'), allowNull: false, defaultValue: 'global' },

    // fréquence
    frequency_type:     { type: DataTypes.ENUM('once','daily','weekly','monthly','custom'), allowNull: false, field: 'frequency_type', defaultValue: 'daily' },
    frequency_interval: { type: DataTypes.INTEGER, allowNull: false, field: 'frequency_interval', defaultValue: 1 },
    week_start:         { type: DataTypes.TINYINT, allowNull: false, field: 'week_start', defaultValue: 1 }, // 1 = lundi
    max_per_period:     { type: DataTypes.INTEGER, allowNull: false, field: 'max_per_period', defaultValue: 1 },

    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'goal_templates',
    timestamps: true,
    indexes: [
      { fields: ['owner_user_id'] },
      { fields: ['enabled', 'owner_user_id'] },
    ],
  });

  GoalTemplate.associate = (models) => {
    GoalTemplate.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
    GoalTemplate.hasMany(models.UserGoal,   { foreignKey: 'template_id', as: 'UserGoals' });
    // 🔹 lien vers le propriétaire
    GoalTemplate.belongsTo(models.User,     { foreignKey: 'owner_user_id', as: 'Owner' });
  };

  // 🔹 Scope pratique: ce qu’un user peut voir (catalogue global actif + ses propres templates)
  GoalTemplate.addScope('visibleTo', (userId) => ({
    where: {
      [Op.or]: [
        { visibility: 'global', enabled: true },
        { owner_user_id: userId || 0 },
      ],
    },
  }));

  return GoalTemplate;
};
