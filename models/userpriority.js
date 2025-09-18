// models/userpriority.js
module.exports = (sequelize, DataTypes) => {
  const UserPriority = sequelize.define('UserPriority', {
    user_id:     { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    category_id: { type: DataTypes.INTEGER, allowNull: false, field: 'category_id' },
    score:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 50 }
  }, {
    tableName: 'user_priorities',
    timestamps: true,
  });

  UserPriority.associate = (models) => {
    UserPriority.belongsTo(models.User,     { foreignKey: 'user_id',     as: 'User' });
    UserPriority.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
  };

  return UserPriority;
};
