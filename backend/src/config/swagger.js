/**
 * Swagger/OpenAPI Configuration
 * API Documentation setup
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OlimpX API',
      version: '1.0.0',
      description: 'Online Olimpiada Platformasi - REST API Documentation',
      contact: {
        name: 'OlimpX Support',
        email: 'support@olimpx.uz',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.olimpx.uz/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fullName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
            lastLogin: { type: 'string', format: 'date-time' },
          },
        },
        Olympiad: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            icon: { type: 'string' },
            duration: { type: 'integer', description: 'Duration in minutes' },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdAt: { type: 'string', format: 'date-time' },
            _count: {
              type: 'object',
              properties: {
                questions: { type: 'integer' },
              },
            },
          },
        },
        Question: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            text: { type: 'string' },
            options: { type: 'array', items: { type: 'string' } },
            duration: { type: 'integer', description: 'Duration in seconds' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Result: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            score: { type: 'integer', description: 'Score percentage' },
            correctCount: { type: 'integer' },
            incorrectCount: { type: 'integer' },
            skippedCount: { type: 'integer' },
            totalQuestions: { type: 'integer' },
            timeTaken: { type: 'string' },
            averageTime: { type: 'integer' },
            details: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            olympiad: {
              type: 'object',
              properties: {
                title: { type: 'string' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            hasNextPage: { type: 'boolean' },
            hasPrevPage: { type: 'boolean' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Olympiads', description: 'Olympiad management' },
      { name: 'Questions', description: 'Question management' },
      { name: 'Results', description: 'Quiz results' },
      { name: 'Reports', description: 'Reports and statistics' },
      { name: 'Backups', description: 'Database backup management' },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
  ],
};

const specs = swaggerJsdoc(options);

/**
 * Setup Swagger UI
 */
export const setupSwagger = (app) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'OlimpX API Documentation',
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 API Documentation available at /api-docs');
};

export default {
  setupSwagger,
  specs,
};
