import { Router } from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'
import {
  createExercise, listExercises, updateExercise, archiveExercise,
  createRoutine, listRoutines, updateRoutine, archiveRoutine,
  createSession, listSessions, getSession, updateSession, deleteSession,
} from '../controllers/workout.controller.js'

const router = Router()

router.use(protectRoute)

// Exercises
router.post('/exercises', createExercise)
router.get('/exercises', listExercises)
router.put('/exercises/:id', updateExercise)
router.delete('/exercises/:id', archiveExercise)

// Routines
router.post('/routines', createRoutine)
router.get('/routines', listRoutines)
router.put('/routines/:id', updateRoutine)
router.delete('/routines/:id', archiveRoutine)

// Sessions
router.post('/sessions', createSession)
router.get('/sessions', listSessions)
router.get('/sessions/:id', getSession)
router.put('/sessions/:id', updateSession)
router.delete('/sessions/:id', deleteSession)

export default router


