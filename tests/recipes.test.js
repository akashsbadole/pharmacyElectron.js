const request = require('supertest');
const express = require('express');
const Datastore = require('@seald-io/nedb');

// Mock environment variables
process.env.APPNAME = 'garmentpos';
process.env.APPDATA = 'C:/temp'; // Use a temp path for tests

// Mock the database_utils
jest.mock('../api/database_utils', () => ({
  getDatabase: jest.fn(() => ({
    ensureIndex: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }))
}));

// Import the app after mocking
const recipesApp = require('../api/recipes');

describe('Recipes API', () => {
  let mockDB;

  beforeEach(() => {
    // Reset mocks
    mockDB = {
      ensureIndex: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      remove: jest.fn()
    };

    // Mock the database instance
    require('../api/database_utils').getDatabase.mockReturnValue(mockDB);
  });

  describe('calculateRecipeCost', () => {
    test('calculates cost correctly for ingredients', () => {
      const ingredients = [
        { quantity: 100, cost_per_unit: 0.5 },
        { quantity: 200, cost_per_unit: 1.0 }
      ];
      const servingSize = 4;

      // Access the function from the app module
      const cost = recipesApp.calculateRecipeCost(ingredients, servingSize);

      expect(cost).toBe((100 * 0.5 + 200 * 1.0) / 4);
    });

    test('handles zero serving size', () => {
      const ingredients = [{ quantity: 100, cost_per_unit: 0.5 }];
      const cost = recipesApp.calculateRecipeCost(ingredients, 0);
      expect(cost).toBe(Infinity); // Division by zero
    });

    test('handles empty ingredients array', () => {
      const cost = recipesApp.calculateRecipeCost([], 4);
      expect(cost).toBe(0);
    });
  });

  describe('GET /', () => {
    test('returns welcome message', async () => {
      const response = await request(recipesApp).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('Recipes API - Recipe Management System');
    });
  });

  describe('GET /recipes', () => {
    test('returns recipes with default sorting', async () => {
      const mockRecipes = [
        { _id: 1, name: 'Recipe A' },
        { _id: 2, name: 'Recipe B' }
      ];

      mockDB.find.mockImplementation((query, callback) => {
        if (typeof query === 'object' && callback) {
          callback(null, mockRecipes);
        }
      });

      const response = await request(recipesApp).get('/recipes');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipes);
      expect(mockDB.find).toHaveBeenCalledWith({}, expect.any(Function));
    });

    test('filters by category', async () => {
      const mockRecipes = [{ _id: 1, name: 'Recipe A', category: 'Appetizer' }];

      mockDB.find.mockImplementation((query, callback) => {
        callback(null, query.category === 'Appetizer' ? mockRecipes : []);
      });

      const response = await request(recipesApp).get('/recipes?category=Appetizer');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipes);
    });
  });

  describe('GET /recipes/:recipeId', () => {
    test('returns recipe by ID', async () => {
      const mockRecipe = { _id: 123, name: 'Test Recipe' };

      mockDB.findOne.mockImplementation((query, callback) => {
        callback(null, query._id === 123 ? mockRecipe : null);
      });

      const response = await request(recipesApp).get('/recipes/123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecipe);
    });

    test('returns 404 for non-existent recipe', async () => {
      mockDB.findOne.mockImplementation((query, callback) => {
        callback(null, null);
      });

      const response = await request(recipesApp).get('/recipes/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Recipe not found');
    });
  });

  describe('POST /recipes', () => {
    test('creates a new recipe successfully', async () => {
      const recipeData = {
        name: 'New Recipe',
        ingredients: [
          { ingredient_name: 'Ingredient 1', quantity: 100, unit: 'g', cost_per_unit: 0.5 }
        ],
        serving_size: 4
      };

      const createdRecipe = { _id: 12345, ...recipeData, cost_per_serving: 12.5 };

      mockDB.insert.mockImplementation((recipe, callback) => {
        callback(null, createdRecipe);
      });

      const response = await request(recipesApp)
        .post('/recipes')
        .send(recipeData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdRecipe);
      expect(mockDB.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Recipe',
          cost_per_serving: 12.5
        }),
        expect.any(Function)
      );
    });

    test('returns 400 for missing required fields', async () => {
      const response = await request(recipesApp)
        .post('/recipes')
        .send({ name: 'Incomplete Recipe' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('PUT /recipes/:recipeId', () => {
    test('updates recipe successfully', async () => {
      const updateData = {
        name: 'Updated Recipe',
        ingredients: [
          { ingredient_name: 'Updated Ingredient', quantity: 150, unit: 'g', cost_per_unit: 0.75 }
        ]
      };

      const updatedRecipe = { _id: 123, ...updateData };

      mockDB.update.mockImplementation((query, update, options, callback) => {
        callback(null, 1);
      });

      mockDB.findOne.mockImplementation((query, callback) => {
        callback(null, updatedRecipe);
      });

      const response = await request(recipesApp)
        .put('/recipes/123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedRecipe);
    });

    test('returns 404 for non-existent recipe', async () => {
      mockDB.update.mockImplementation((query, update, options, callback) => {
        callback(null, 0);
      });

      const response = await request(recipesApp)
        .put('/recipes/999')
        .send({ name: 'Updated Name', ingredients: [] });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /recipes/:recipeId', () => {
    test('deletes recipe successfully', async () => {
      mockDB.remove.mockImplementation((query, options, callback) => {
        callback(null, 1);
      });

      const response = await request(recipesApp).delete('/recipes/123');

      expect(response.status).toBe(200);
    });

    test('returns 404 for non-existent recipe', async () => {
      mockDB.remove.mockImplementation((query, options, callback) => {
        callback(null, 0);
      });

      const response = await request(recipesApp).delete('/recipes/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /recipes/:recipeId/calculate-cost', () => {
    test('calculates scaled cost correctly', async () => {
      const mockRecipe = {
        _id: 123,
        name: 'Test Recipe',
        serving_size: 4,
        ingredients: [
          { ingredient_name: 'Ingredient 1', quantity: 100, unit: 'g', cost_per_unit: 0.5 }
        ]
      };

      mockDB.findOne.mockImplementation((query, callback) => {
        callback(null, query._id == 123 ? mockRecipe : null);
      });

      const response = await request(recipesApp)
        .post('/recipes/123/calculate-cost')
        .send({ servings: 8 });

      expect(response.status).toBe(200);
      expect(response.body.total_cost).toBe(100 * 0.5 * 2); // scaled by 2
      expect(response.body.cost_per_serving).toBe(25);
    });
  });
});