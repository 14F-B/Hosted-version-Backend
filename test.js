const request = require('supertest');
const app = require('./server.js');
const { describe, it } = require('jest');


describe('POST /sendForm', () => {
  it('should send the contact form successfully', async () => {
    const response = await request(app)
      .post('/sendForm')
      .send({
        senderName: 'John Doe',
        senderEmail: 'johndoe@example.com',
        subject: 'Test message',
        message: 'This is a test message'
      });
    expect(response.status).toBe(200);
    expect(response.text).toBe('Az űrlap sikeresen elküldve!');
  });

  it('should handle server errors', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); 
    const contactForm = jest.fn(() => { throw new Error('Some error'); }); 
    const appWithError = require('../app')({ contactForm });

    const response = await request(appWithError)
      .post('/sendForm')
      .send({
        senderName: 'John Doe',
        senderEmail: 'johndoe@example.com',
        subject: 'Test message',
        message: 'This is a test message'
      });
    expect(response.status).toBe(500);
    expect(response.text).toBe('Szerver hiba történt.');
  });
});
