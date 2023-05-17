import Handlebars from 'handlebars';

Handlebars.registerHelper('json', value => JSON.stringify(value));

export {Handlebars};
