import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/auth/me (GET)", () => {
    it("should return 401 without token", () => {
      return request(app.getHttpServer()).get("/auth/me").expect(401);
    });

    it("should return user profile with valid token", async () => {
      // First register a user
      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "test@example.com",
          password: "Test1234!",
          full_name: "Test User",
        });

      const { access_token } = registerRes.body;

      return request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${access_token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("role");
        });
    });
  });

  describe("/auth/register (POST)", () => {
    it("should reject weak passwords", () => {
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: "test@example.com",
          password: "password123",
          full_name: "Test User",
        })
        .expect(400);
    });

    it("should register with strong password", () => {
      const timestamp = Date.now();
      return request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: `test${timestamp}@example.com`,
          password: "Test1234!",
          full_name: "Test User",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("access_token");
          expect(res.body).toHaveProperty("refresh_token");
        });
    });
  });

  describe("/auth/login (POST)", () => {
    beforeAll(async () => {
      // Create a test user
      await request(app.getHttpServer()).post("/auth/register").send({
        email: "login-test@example.com",
        password: "Test1234!",
        full_name: "Login Test",
      });
    });

    it("should login with correct credentials", () => {
      return request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "login-test@example.com",
          password: "Test1234!",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("access_token");
        });
    });

    it("should reject wrong password", () => {
      return request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: "login-test@example.com",
          password: "WrongPassword1!",
        })
        .expect(401);
    });
  });

  describe("/auth/refresh (POST)", () => {
    it("should refresh token with valid refresh_token", async () => {
      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: `refresh${Date.now()}@example.com`,
          password: "Test1234!",
          full_name: "Refresh Test",
        });

      const { refresh_token } = registerRes.body;

      return request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refresh_token })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("access_token");
        });
    });

    it("should detect token reuse", async () => {
      const registerRes = await request(app.getHttpServer())
        .post("/auth/register")
        .send({
          email: `reuse${Date.now()}@example.com`,
          password: "Test1234!",
          full_name: "Reuse Test",
        });

      const { refresh_token } = registerRes.body;

      // Use token once
      await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refresh_token });

      // Try to reuse - should fail
      return request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refresh_token })
        .expect(401);
    });
  });
});
