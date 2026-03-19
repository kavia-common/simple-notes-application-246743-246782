const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notes Backend API',
      version: '1.0.0',
      description: 'REST API for a simple Notes application (CRUD, search, tags, favorites).',
    },
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Notes', description: 'Create, read, update, delete, and search notes' },
      { name: 'Tags', description: 'List tags and their usage counts' },
      { name: 'Favorites', description: 'List favorite notes' },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
