import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app.js';
import { setupTestDB } from '../testHelper.js';
import { User } from '../../src/models/User.js';
import { Quiz } from '../../src/models/Quiz.js';
import { Question } from '../../src/models/Question.js';

describe('Quiz Attempt & Evaluation Integration Tests', () => {
  setupTestDB();

  let adminToken;
  let participant1Token;
  let participant2Token;
  let quizId;
  let q1Id, q2Id;
  let q1CorrectOptId, q1WrongOptId;
  let q2CorrectOptId, q2WrongOptId;

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password123!', salt);

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      passwordHash: hash,
      role: 'admin'
    });

    await User.create({
      name: 'Alice Participant',
      email: 'alice@test.com',
      passwordHash: hash,
      role: 'participant'
    });

    await User.create({
      name: 'Bob Participant',
      email: 'bob@test.com',
      passwordHash: hash,
      role: 'participant'
    });

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Password123!' });
    adminToken = adminLogin.body.data.token;

    const p1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@test.com', password: 'Password123!' });
    participant1Token = p1Login.body.data.token;

    const p2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'bob@test.com', password: 'Password123!' });
    participant2Token = p2Login.body.data.token;

    // Create published quiz with 2 questions
    const quiz = await Quiz.create({
      title: 'Math & Logic Quiz',
      durationMinutes: 10,
      marksPerQuestion: 2,
      negativeMarks: 0.5,
      passPercentage: 50,
      randomizeQuestions: false,
      status: 'published',
      createdBy: admin._id
    });
    quizId = quiz._id.toString();

    const q1 = await Question.create({
      quizId: quiz._id,
      text: 'What is 10 + 10?',
      options: [
        { text: '20', isCorrect: true },
        { text: '30', isCorrect: false }
      ]
    });
    q1Id = q1._id.toString();
    q1CorrectOptId = q1.options.find((o) => o.isCorrect)._id.toString();
    q1WrongOptId = q1.options.find((o) => !o.isCorrect)._id.toString();

    const q2 = await Question.create({
      quizId: quiz._id,
      text: 'What is 5 x 5?',
      options: [
        { text: '25', isCorrect: true },
        { text: '20', isCorrect: false }
      ]
    });
    q2Id = q2._id.toString();
    q2CorrectOptId = q2.options.find((o) => o.isCorrect)._id.toString();
    q2WrongOptId = q2.options.find((o) => !o.isCorrect)._id.toString();
  });

  it('allows participant to start an attempt and retrieves questions without isCorrect', async () => {
    // Start attempt
    const startRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(startRes.status).toBe(201);
    expect(startRes.body.data.attemptId).toBeDefined();
    expect(startRes.body.data.questionCount).toBe(2);

    const attemptId = startRes.body.data.attemptId;

    // Get attempt questions
    const qRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/questions`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(qRes.status).toBe(200);
    expect(qRes.body.data.questions.length).toBe(2);

    // CRUCIAL SECURITY VERIFICATION: isCorrect must be completely stripped from options!
    for (const q of qRes.body.data.questions) {
      for (const opt of q.options) {
        expect(opt.isCorrect).toBeUndefined();
        expect(opt.text).toBeDefined();
        expect(opt._id).toBeDefined();
      }
    }
  });

  it('enforces attempt ownership preventing other participants from accessing it', async () => {
    // Alice starts attempt
    const startRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${participant1Token}`);
    const attemptId = startRes.body.data.attemptId;

    // Bob tries to access Alice's attempt questions
    const forbiddenRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/questions`)
      .set('Authorization', `Bearer ${participant2Token}`);

    expect(forbiddenRes.status).toBe(403);

    // Bob tries to save answers on Alice's attempt
    const forbiddenAnswerRes = await request(app)
      .patch(`/api/v1/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${participant2Token}`)
      .send({
        questionId: q1Id,
        selectedOptionId: q1CorrectOptId
      });

    expect(forbiddenAnswerRes.status).toBe(403);
  });

  it('saves answers, submits attempt, calculates scores correctly and ensures submission idempotency', async () => {
    // Alice starts attempt
    const startRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${participant1Token}`);
    const attemptId = startRes.body.data.attemptId;

    // Save answers: Q1 correct, Q2 wrong
    // (marksPerQuestion: 2, negativeMarks: 0.5 -> score: 2 - 0.5 = 1.5 out of 4 -> 37.5%)
    const ansRes = await request(app)
      .patch(`/api/v1/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${participant1Token}`)
      .send({
        answers: [
          { questionId: q1Id, selectedOptionId: q1CorrectOptId },
          { questionId: q2Id, selectedOptionId: q2WrongOptId }
        ]
      });

    expect(ansRes.status).toBe(200);
    expect(ansRes.body.data.totalAnswered).toBe(2);

    // Submit attempt
    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(submitRes.status).toBe(200);
    const result = submitRes.body.data.result;
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(0);
    expect(result.score).toBe(1.5);
    expect(result.totalMarks).toBe(4);
    expect(result.percentage).toBe(37.5);
    expect(result.passed).toBe(false); // passPercentage is 50%

    // Idempotent duplicate submission
    const duplicateSubmitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${participant1Token}`);

    expect(duplicateSubmitRes.status).toBe(200);
    expect(duplicateSubmitRes.body.data.result.score).toBe(1.5);

    // Attempting to modify answers on a submitted attempt must be rejected
    const blockedAnswerRes = await request(app)
      .patch(`/api/v1/attempts/${attemptId}/answers`)
      .set('Authorization', `Bearer ${participant1Token}`)
      .send({
        questionId: q1Id,
        selectedOptionId: q1CorrectOptId
      });

    expect(blockedAnswerRes.status).toBe(409);
  });
});
