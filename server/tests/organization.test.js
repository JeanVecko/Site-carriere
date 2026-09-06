import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import request from 'supertest';

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  test('organization integration tests require TEST_DATABASE_URL', { skip: true }, () => {});
} else {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.local';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-password';

  const { app, pool, initializeDatabase } = await import('../server.js');
  const suffix = randomUUID().slice(0, 8);
  const ownerEmail = `owner-${suffix}@test.local`;
  const memberEmail = `member-${suffix}@test.local`;
  const password = 'password123';
  let organizationId;
  let otherOrganizationId;
  let ownerToken;
  let memberToken;
  let otherOwnerToken;

  test.before(async () => {
    await initializeDatabase();
  });

  test.after(async () => {
    if (organizationId) {
      await pool.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
    }
    if (otherOrganizationId) {
      await pool.query('DELETE FROM organizations WHERE id = $1', [otherOrganizationId]);
    }
    await pool.end();
  });

  test('creates an organization owner and invites a member', async () => {
    const owner = await request(app).post('/api/auth/register').send({
      role: 'recruteur',
      email: ownerEmail,
      password,
      organizationName: `Test Organization ${suffix}`,
      data: { companyName: `Test Organization ${suffix}` },
    });

    assert.equal(owner.status, 201);
    assert.equal(owner.body.user.organization.organization_id, undefined);
    assert.equal(owner.body.user.organization.name, `Test Organization ${suffix}`);
    ownerToken = owner.body.token;
    organizationId = owner.body.user.organization.id;

    const member = await request(app).post('/api/auth/register').send({
      role: 'recruteur',
      email: memberEmail,
      password,
      organizationCode: owner.body.user.organization.invite_code,
      data: { companyName: `Test Organization ${suffix}` },
    });

    assert.equal(member.status, 201);
    assert.equal(member.body.user.organization.id, organizationId);
    memberToken = member.body.token;

    const organization = await request(app)
      .get('/api/my/organization')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(organization.status, 200);
    assert.equal(organization.body.members.length, 2);
    assert.equal(organization.body.members.some((item) => item.email === memberEmail && item.organization_role === 'member'), true);

    const otherOwner = await request(app).post('/api/auth/register').send({
      role: 'recruteur',
      email: `other-${suffix}@test.local`,
      password,
      organizationName: `Other Organization ${suffix}`,
      data: { companyName: `Other Organization ${suffix}` },
    });
    assert.equal(otherOwner.status, 201);
    otherOwnerToken = otherOwner.body.token;
    otherOrganizationId = otherOwner.body.user.organization.id;

    await request(app).post('/api/my/jobs').set('Authorization', `Bearer ${ownerToken}`).send({
      title: 'Offer A', location: 'Kinshasa', description: 'Organization A offer',
    });
    await request(app).post('/api/my/jobs').set('Authorization', `Bearer ${otherOwnerToken}`).send({
      title: 'Offer B', location: 'Goma', description: 'Organization B offer',
    });

    const ownJobs = await request(app).get('/api/my/jobs').set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownJobs.status, 200);
    assert.equal(ownJobs.body.some((job) => job.title === 'Offer A'), true);
    assert.equal(ownJobs.body.some((job) => job.title === 'Offer B'), false);
  });

  test('limits invite-code rotation and member removal to the owner', async () => {
    const memberRotation = await request(app)
      .post('/api/my/organization/invite-code')
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(memberRotation.status, 403);

    const ownerRotation = await request(app)
      .post('/api/my/organization/invite-code')
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(ownerRotation.status, 200);
    assert.match(ownerRotation.body.invite_code, /^[A-F0-9]{8}$/);

    const memberRow = await pool.query('SELECT id FROM users WHERE email = $1', [memberEmail]);
    const removal = await request(app)
      .delete(`/api/my/organization/members/${memberRow.rows[0].id}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    assert.equal(removal.status, 204);

    const removedAccess = await request(app)
      .get('/api/my/organization')
      .set('Authorization', `Bearer ${memberToken}`);
    assert.equal(removedAccess.status, 403);
  });
}
