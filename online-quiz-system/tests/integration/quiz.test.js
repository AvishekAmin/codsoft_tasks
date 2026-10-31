import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app.js';
import { setupTestDB } from '../testHelper.js';
import { User } from '../../src/models/User.js';

describe('Quiz & Question Management Integration Tests', () => {
  setupTestDB();

  let adminToken;
  let participantToken;

  beforeEach(async () => {
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('AdminPassword123!', salt);
    await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      passwordHash: adminHash,
      role: 'admin'
    });

    // Create participant user
    const partHash = await bcrypt.hash('ParticipantPassword123!', salt);
    await User.create({
      name: 'Participant User',
      email: 'participant@test.com',
      passwordHash: partHash,
      role: 'participant'
    });

    // Login admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPassword123!' });
    adminToken = adminLogin.body.data.token;

    // Login participant
    const partLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'participant@test.com', password: 'ParticipantPassword123!' });
    participantToken = partLogin.body.data.token;
  });

  it('allows admin to create a draft quiz and forbids participant', async () => {
    // Participant attempt -> 403 Forbidden
    const forbiddenRes = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${participantToken}`)
      .send({
        title: 'Unauthorized Quiz Creation',
        durationMinutes: 10,
        marksPerQuestion: 1
      });

    expect(forbiddenRes.status).toBe(403);

    // Admin attempt -> 201 Created
    const createRes = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'JavaScript Fundamentals',
        description: 'Test your core JS knowledge',
        durationMinutes: 15,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        passPercentage: 60,
        randomizeQuestions: true
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.quiz.title).toBe('JavaScript Fundamentals');
    expect(createRes.body.data.quiz.status).toBe('draft');
  });

  it('validates question creation (minimum 2 options and exactly 1 correct answer)', async () => {
    const quizRes = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Quiz with Questions',
        durationMinutes: 10,
        marksPerQuestion: 1
      });
    const quizId = quizRes.body.data.quiz._id;

    // Failure: No correct option
    const noCorrectRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'What is 2 + 2?',
        options: [
          { text: '3', isCorrect: false },
          { text: '5', isCorrect: false }
        ]
      });

    expect(noCorrectRes.status).toBe(400);

    // Failure: Multiple correct options
    const multiCorrectRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'What is 2 + 2?',
        options: [
          { text: '4', isCorrect: true },
          { text: 'Four', isCorrect: true }
        ]
      });

    expect(multiCorrectRes.status).toBe(400);

    // Success: Exactly 1 correct option
    const successRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'What is 2 + 2?',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false }
        ]
      });

    expect(successRes.status).toBe(201);
    expect(successRes.body.data.question.options.length).toBe(3);
  });

  it('prevents publishing a quiz with 0 questions, and publishes once questions exist', async () => {
    const quizRes = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Empty Quiz',
        durationMinutes: 10,
        marksPerQuestion: 1
      });
    const quizId = quizRes.body.data.quiz._id;

    // Publish attempt with 0 questions -> 400
    const failPublishRes = await request(app)
      .patch(`/api/v1/quizzes/${quizId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(failPublishRes.status).toBe(400);

    // Add a valid question
    await request(app)
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'Is Node.js single-threaded?',
        options: [
          { text: 'Yes, event loop is single-threaded', isCorrect: true },
          { text: 'No, it has infinite threads', isCorrect: false }
        ]
      });

    // Publish again -> 200 Success
    const successPublishRes = await request(app)
      .patch(`/api/v1/quizzes/${quizId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(successPublishRes.status).toBe(200);
    expect(successPublishRes.body.data.quiz.status).toBe('published');
  });

  it('ensures participants only see published quizzes while admins see all', async () => {
    // Create 1 draft quiz
    await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Draft Quiz Only',
        durationMinutes: 10,
        marksPerQuestion: 1
      });

    // Create 1 published quiz
    const pubQuizRes = await request(app)
      .post('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Published Quiz for Participants',
        durationMinutes: 10,
        marksPerQuestion: 1
      });
    const pubQuizId = pubQuizRes.body.data.quiz._id;

    // Add question and publish
    await request(app)
      .post(`/api/v1/quizzes/${pubQuizId}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        text: 'Sample Question',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false }
        ]
      });
    await request(app)
      .patch(`/api/v1/quizzes/${pubQuizId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Participant query: should only see published quiz (count: 1)
    const partRes = await request(app)
      .get('/api/v1/quizzes')
      .set('Authorization', `Bearer ${participantToken}`);

    expect(partRes.status).toBe(200);
    expect(partRes.body.data.quizzes.length).toBe(1);
    expect(partRes.body.data.quizzes[0].title).toBe('Published Quiz for Participants');

    // Admin query: should see both quizzes (count: 2)
    const adminRes = await request(app)
      .get('/api/v1/quizzes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.quizzes.length).toBe(2);
  });
});
