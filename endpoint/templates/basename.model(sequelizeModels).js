'use strict';

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('<%= classedName %>', {
    id: {
      type: <% if (filters.sequelizeModels.serial) { %> DataTypes.INTEGER <% } if (filters.sequelizeModels.uuid) { %> DataTypes.UUID <% } %>,
      allowNull: false,
      primaryKey: true,<% if (filters.sequelizeModels.serial) { %>
      autoIncrement: true <% } %><% if (filters.sequelizeModels.uuid) { %>
      defaultValue: DataTypes.UUIDV4 <% } %>
    },
    name: DataTypes.STRING,
    info: DataTypes.STRING,
    active: DataTypes.BOOLEAN
  },{
    <% if (filters.sequelizeModels.timestamps) { %>timestamps: true, <% } %><% if (filters.sequelizeModels.paranoid) { %>
    paranoid: true,<% } %><% if (filters.sequelizeModels) { %>
    underscored: true,
    freezeTableName:true,
    tableName:'<%= classedName.toLowerCase() %><% if (filters.sequelizeModels.pluralization) { %>s<% } %>'
    <% } %>
  });
};
