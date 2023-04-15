const request = require('supertest');
const app = require('../server');
const { describe, it, expect } = require('@jest/globals');
const { eventsByCategories } = require('../Controllers/queryController.js');

describe('GET /eventcategory/:categories', () => {
  it('responds with 200 and expected response body', async () => {
    // Mocking the eventsByCategories function to return a predefined value
    eventsByCategories.mockResolvedValue([{ id: 1, title: 'Event 1' }]);

    const response = await request(app).get('/eventcategory/sport');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([{ id: 1, title: 'Event 1' }]);
  });

  it('responds with 500 if eventsByCategories function throws an error', async () => {
    // Mocking the eventsByCategories function to throw an error
    eventsByCategories.mockRejectedValue(new Error('Some error'));

    const response = await request(app).get('/eventcategory/somecategory');
    expect(response.statusCode).toBe(500);
    expect(response.text).toBe('Error: Some error');
  });
});