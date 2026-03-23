import express from 'express';
import { 
  getSummary, getTasks, getEmployees, 
  getProjects, getTime, getWeeklyReport 
} from '../../../controllers/mis.controller.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/summary', getSummary);
router.get('/tasks', getTasks);
router.get('/employees', getEmployees);
router.get('/projects', getProjects);
router.get('/time', getTime);
router.get('/weekly-report', getWeeklyReport);

export default router;
