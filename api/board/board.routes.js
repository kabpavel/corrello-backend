const express = require('express')
const { requireAuth, requireAdmin } = require('../../middlewares/requireAuth.middleware')
const { log } = require('../../middlewares/logger.middleware')
const { getBoard, getBoards, addBoard, updateBoard, deleteBoard } = require('./board.controller')
const router = express.Router()

// middleware that is specific to this router
// router.use(requireAuth)

router.get('/:id', log, getBoard)
router.get('/', log, getBoards)
router.post('/', log, addBoard)
router.delete('/:id',log, deleteBoard)
router.put('/:id', log, updateBoard)

module.exports = router