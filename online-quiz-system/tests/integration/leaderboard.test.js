import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../src/app.js';
import { setupTestDB } from '../testHelper.js';
import { User } from '../../src/models/User.js';
import { Quiz } from '../../src/models/Quiz.js';
import { Question } from '../../src/models/Question.js';

describe('Leaderboard & Analytics Integration Tests', () => {
  setupTestDB();

  let adminToken;
  let p1Token;
  let p2Token;
  let quizId;

  beforeEach(async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password123!', salt);

    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin@leaderboard.com',
      passwordHash: hash,
      role: 'admin'
    });

    await User.create({
      name: 'High Scorer',
      email: 'high@leaderboard.com',
      passwordHash: hash,
      role: 'participant'
    });

    await User.create({
      name: 'Low Scorer',
      email: 'low@leaderboard.com',
      passwordHash: hash,
      role: 'participant'
    });

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@leaderboard.com', password: 'Password123!' });
    adminToken = adminLogin.body.data.token;

    const p1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'high@leaderboard.com', password: 'Password123!' });
    p1Token = p1Login.body.data.token;

    const p2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'low@leaderboard.com', password: 'Password123!' });
    p2Token = p2Login.body.data.token;

    // Create quiz
    const quiz = await Quiz.create({
      title: 'Science Quiz',
      durationMinutes: 10,
      marksPerQuestion: 5,
      negativeMarks: 1,
      passPercentage: 50,
      status: 'published',
      createdBy: admin._id
    });
    quizId = quiz._id.toString();

    // 2 questions
    const q1 = await Question.create({
      quizId: quiz._id,
      text: 'Water formula?',
      options: [
        { text: 'H2O', isCorrect: true },
        { text: 'CO2', isCorrect: false }
      ]
    });
    const q2 = await Question.create({
      quizId: quiz._id,
      text: 'Speed of light in vacuum?',
      options: [
        { text: '3x10^8 m/s', isCorrect: true },
        { text: '100 km/h', isCorrect: false }
      ]
    });

    // P1 (High Scorer) takes quiz, gets 2/2 correct (10 marks)
    const p1AttemptRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${p1Token}`);
    const p1AttemptId = p1AttemptRes.body.data.attemptId;

    await request(app)
      .patch(`/api/v1/attempts/${p1AttemptId}/answers`)
      .set('Authorization', `Bearer ${p1Token}`)
      .send({
        answers: [
          { questionId: q1._id.toString(), selectedOptionId: q1.options[0]._id.toString() },
          { questionId: q2._id.toString(), selectedOptionId: q2.options[0]._id.toString() }
        ]
      });
    await request(app)
      .post(`/api/v1/attempts/${p1AttemptId}/submit`)
      .set('Authorization', `Bearer ${p1Token}`);

    // P2 (Low Scorer) takes quiz, gets 0/2 correct (0 marks)
    const p2AttemptRes = await request(app)
      .post(`/api/v1/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${p2Token}`);
    const p2AttemptId = p2AttemptRes.body.data.attemptId;

    await request(app)
      .patch(`/api/v1/attempts/${p2AttemptId}/answers`)
      .set('Authorization', `Bearer ${p2Token}`)
      .send({
        answers: [
          { questionId: q1._id.toString(), selectedOptionId: q1.options[1]._id.toString() },
          { questionId: q2._id.toString(), selectedOptionId: q2.options[1]._id.toString() }
        ]
      });
    await request(app)
      .post(`/api/v1/attempts/${p2AttemptId}/submit`)
      .set('Authorization', `Bearer ${p2Token}`);
  });

  it('retrieves quiz leaderboard ordered by score and protects sensitive participant information', async () => {
    const res = await request(app)
      .get(`/api/v1/quizzes/${quizId}/leaderboard`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const leaderboard = res.body.data.leaderboard;
    expect(leaderboard.length).toBe(2);

    // Rank 1: High Scorer (10 marks)
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].participantName).toBe('High Scorer');
    expect(leaderboard[0].score).toBe(10);
    expect(leaderboard[0].percentage).toBe(100);
    expect(leaderboard[0].passed).toBe(true);

    // Rank 2: Low Scorer (0 marks)
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[1].participantName).toBe('Low Scorer');
    expect(leaderboard[1].score).toBe(0);
    expect(leaderboard[1].percentage).toBe(0);
    expect(leaderboard[1].passed).toBe(false);

    // PRIVACY VERIFICATION: Confirm no emails or passwords leaked
    for (const entry of leaderboard) {
      expect(entry.email).toBeUndefined();
      expect(entry.password).toBeUndefined();
      expect(entry.passwordHash).toBeUndefined();
    }
  });

  it('retrieves aggregated quiz performance statistics for administrators', async () => {
    const res = await request(app)
      .get(`/api/v1/quizzes/${quizId}/statistics`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const stats = res.body.data.statistics;
    expect(stats.totalFinalizedResults).toBe(2);
    expect(stats.uniqueParticipantsCount).toBe(2);
    expect(stats.highestScore).toBe(10);
    expect(stats.lowestScore).toBe(0);
    expect(stats.avgScore).toBe(5);
    expect(stats.passedCount).toBe(1);
    expect(stats.failedCount).toBe(1);
    expect(stats.passRate).toBe(50);
  });

  it('retrieves authenticated participant personal statistics and attempt history', async () => {
    const res = await request(app)
      .get('/api/v1/users/me/statistics')
      .set('Authorization', `Bearer ${p1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data.summary;
    expect(summary.completedQuizzes).toBe(1);
    expect(summary.passedQuizzes).toBe(1);
    expect(summary.avgScore).toBe(10);
    expect(summary.avgPercentage).toBe(100);

    const recent = res.body.data.recentResults;
    expect(recent.length).toBe(1);
    expect(recent[0].quizTitle).toBe('Science Quiz');
    expect(recent[0].score).toBe(10);
  });
});
