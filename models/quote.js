// models/quote.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const Quote = sequelize.define('Quote', {
    text:      { type: DataTypes.TEXT,      allowNull: false },
    author:    { type: DataTypes.STRING,    allowNull: true  },
    language:  { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'fr' },
    is_active: { type: DataTypes.BOOLEAN,   allowNull: false, defaultValue: true }
  }, {
    tableName: 'quotes',   // <<< IMPORTANT: minuscule comme ta table
    timestamps: false      // on ne touche pas aux createdAt/updatedAt (on ne fait que lire)
  });
  return Quote;
};
