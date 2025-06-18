import Handlebars from 'handlebars';
import TOML from 'smol-toml';
import YAML from 'yaml';

Handlebars.registerHelper('json', value => JSON.stringify(value));
Handlebars.registerHelper('toml', value => TOML.stringify(value));
Handlebars.registerHelper('yaml', value => YAML.stringify(value));

export {Handlebars};
