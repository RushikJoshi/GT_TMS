import express from 'express';
import { 
  getReportWeekly, getReportEmployee, getReportProject
} from '../../../controllers/mis.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/weekly', getReportWeekly);
router.get('/employee', getReportEmployee);
router.get('/project', getReportProject);

export default router;
