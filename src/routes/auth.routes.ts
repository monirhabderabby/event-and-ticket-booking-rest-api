import { Router } from "express";
import { validate } from "../middleware/validate.middleware.js";
import { login, register } from "../modules/auth/auth.controller.js";
import {
  loginSchema,
  registerSchema,
} from "../modules/auth/auth.validation.js";

const router = Router();

router.post("/register", validate({ body: registerSchema }), register);
router.post("/login", validate({ body: loginSchema }), login);

export default router;
