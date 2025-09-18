// models/category.js
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'categories',
    timestamps: true,
  });

  Category.associate = (models) => {
    Category.hasMany(models.GoalTemplate,  { foreignKey: 'category_id', as: 'GoalTemplates' });
    Category.hasMany(models.UserPriority,  { foreignKey: 'category_id', as: 'UserPriorities' });
  };

  return Category;
};
