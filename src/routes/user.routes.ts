import { Router } from "express";
import { verifyAuth } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { getMe, updateMe } from "../modules/user/user.controller.js";
import { updateMeSchema } from "../modules/user/user.validation.js";

const router = Router();

router.get("/me", verifyAuth, getMe);
router.put("/me", verifyAuth, validate({ body: updateMeSchema }), updateMe);

export default router;
