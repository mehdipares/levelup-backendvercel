// models/OnboardingQuestionWeight.js
module.exports = (sequelize, DataTypes) => {
  const OnboardingQuestionWeight = sequelize.define('OnboardingQuestionWeight', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    category_id: { type: DataTypes.INTEGER, allowNull: false }, // aligné sur ta table categories.id
    weight: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0.00 },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'onboarding_question_weights',
    timestamps: true,
    underscored: false,
    indexes: [
      { unique: true, fields: ['question_id', 'category_id'], name: 'uq_onb_weight_qc' },
      { fields: ['question_id'], name: 'idx_onb_weight_q' },
      { fields: ['category_id'], name: 'idx_onb_weight_c' },
    ],
  });

  OnboardingQuestionWeight.associate = (models) => {
    OnboardingQuestionWeight.belongsTo(models.OnboardingQuestion, {
      foreignKey: 'question_id',
      as: 'Question',
      onDelete: 'CASCADE',
    });
    OnboardingQuestionWeight.belongsTo(models.Category, {
      foreignKey: 'category_id',
      as: 'Category',
      onDelete: 'CASCADE',
    });
  };

  return OnboardingQuestionWeight;
};
