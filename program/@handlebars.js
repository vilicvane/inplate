const Handlebars = require('handlebars');

Handlebars.registerHelper('json', value => JSON.stringify(value));

module.exports = {Handlebars};
